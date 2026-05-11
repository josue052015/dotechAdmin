import { signal, computed, inject } from '@angular/core';
import { LargeListState, ListQuery } from '../models/list-state.model';
import { GoogleSheetsService } from './google-sheets.service';
import { IndexedDbCacheService } from './indexed-db-cache.service';
import { Observable, BehaviorSubject, of, from, throwError } from 'rxjs';
import { tap, map, catchError, switchMap, finalize } from 'rxjs/operators';

export abstract class LargeSheetListService<T> {
  protected sheetsService = inject(GoogleSheetsService);
  protected cacheService = inject(IndexedDbCacheService);

  // State
  public listState = signal<LargeListState<T>>({
    visibleRows: [],
    totalLoaded: 0,
    isInitialLoading: false, // Start false, set true in init
    isLoadingMore: false,
    isFiltering: false,
    hasMore: true,
    query: { search: '', columnFilters: {}, sort: { active: '_rowNumber', direction: 'desc' } }
  });

  // Signals for tracking sheet bounds
  public lastDataRow = signal<number | null>(null);
  public isResolvingLastRow = signal(false);
  public isFullyLoaded = signal(false);

  // Global signal for all records
  public allRecords = signal<T[]>([]);
  public loadedRows = signal<T[]>([]); // Current session rows

  protected abstract SHEET_NAME: string;
  protected abstract COLUMNS_RANGE: string;
  protected KEY_COLUMN = 'A';
  
  protected currentHeaders: string[] = [];
  protected worker: Worker | null = null;
  protected isInitialized = false;
  protected lowestRowLoaded = 0;
  protected CHUNK_SIZE = 500;

  constructor() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../workers/list-filter.worker', import.meta.url));
    }
  }

  public initLargeList(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    this.listState.update(s => ({ ...s, isInitialLoading: true }));

    // 1. Load Headers first (needed for mapping)
    this.sheetsService.readHeader(this.SHEET_NAME, this.COLUMNS_RANGE).subscribe(headers => {
      this.currentHeaders = headers;

      // 2. Resolve Last Row (Probe strategy)
      this.resolveLastDataRow().subscribe(lastRow => {
        this.lastDataRow.set(lastRow);
        this.lowestRowLoaded = lastRow + 1;
        
        // 3. Load Initial Chunk (last 100 rows)
        this.loadInitialChunk().subscribe();
      });
    });
  }

  /**
   * Probe backwards to find the actual last row with data in KEY_COLUMN
   * without reading the entire A:A column.
   */
  protected resolveLastDataRow(): Observable<number> {
    this.isResolvingLastRow.set(true);
    
    // Proactive grid size check
    return this.sheetsService.getSheetGridRowCount(this.SHEET_NAME).pipe(
      catchError(() => of(5000)), // Better fail-safe than 100
      switchMap(gridRowCount => {
        // We always try to leapfrog from row 2 up to gridRowCount
        // to ensure we don't get stuck by a stale cache
        return this.leapfrogForward(2, gridRowCount);
      }),
      tap(lastRow => {
        this.isResolvingLastRow.set(false);
        this.cacheService.saveMetadata(this.SHEET_NAME, 'lastDataRow', lastRow);
      }),
      catchError(err => {
        this.isResolvingLastRow.set(false);
        console.error('Error resolving last row:', err);
        return of(5000); // Fail-safe to a large number to allow "load more" to work
      })
    );
  }

  private leapfrogForward(currentLast: number, gridRowCount: number, step = 1000): Observable<number> {
    const nextTarget = Math.min(gridRowCount, currentLast + step);
    if (nextTarget <= currentLast) return of(currentLast);

    // Probe columns A:E to be more robust against empty ID columns
    const range = `${this.SHEET_NAME}!A${currentLast + 1}:E${nextTarget}`;
    return this.sheetsService.readRange(range).pipe(
      switchMap(response => {
        const values = response.values || [];
        const lastInWindow = this.findLastInValues(values);
        
        if (lastInWindow !== -1) {
          const newLast = currentLast + 1 + lastInWindow;
          // If we found data and haven't hit the end of the grid, keep going
          if (newLast < gridRowCount) {
            // Increase step for faster jumping in very large sheets
            return this.leapfrogForward(newLast, gridRowCount, Math.min(step * 2, 5000));
          }
          return of(newLast);
        } else {
          // No data in this window, but let's do one last small probe just in case
          // of a very large gap (rare in business sheets but possible)
          if (step < 5000 && (currentLast + step * 5) < gridRowCount) {
             return this.leapfrogForward(currentLast + step, gridRowCount, step * 2);
          }
          return of(currentLast);
        }
      }),
      catchError(err => {
        console.warn(`[Leapfrog] Probe failed at ${currentLast}:`, err);
        return of(currentLast);
      })
    );
  }

  private findLastInValues(values: any[][]): number {
    if (!values || values.length === 0) return -1;
    for (let i = values.length - 1; i >= 0; i--) {
      const row = values[i];
      if (row && row.some(cell => cell !== undefined && cell !== null && cell.toString().trim() !== '')) {
        return i;
      }
    }
    return -1;
  }

  private probeBackwards(targetRow: number): Observable<number> {
    if (targetRow <= 2) return of(2);

    const windowSize = 200;
    const startRow = Math.max(2, targetRow - windowSize + 1);
    const range = `${this.SHEET_NAME}!${this.KEY_COLUMN}${startRow}:${this.KEY_COLUMN}${targetRow}`;

    return this.sheetsService.readRange(range).pipe(
      switchMap(response => {
        const values = response.values || [];
        if (values.length > 0) {
          // Found data! Find the index of the last non-empty value
          for (let i = values.length - 1; i >= 0; i--) {
            if (values[i][0] !== undefined && values[i][0] !== null && values[i][0].toString().trim() !== '') {
              return of(startRow + i);
            }
          }
        }
        // No data in this window, probe further back
        return this.probeBackwards(startRow - 1);
      }),
      catchError(err => {
        if (err.status === 429) {
           return of(0).pipe(
              switchMap(() => new Promise<number>(r => setTimeout(() => r(0), 5000))),
              switchMap(() => this.probeBackwards(targetRow))
           );
        }
        return throwError(() => err);
      })
    );
  }

  public refreshVisibleChunk(): Observable<any> {
    const state = this.listState();
    if (state.isInitialLoading || state.isLoadingMore || state.isFiltering) return of(null);

    const lastRow = this.lastDataRow() || 100;
    const startRow = Math.max(2, lastRow - this.CHUNK_SIZE + 1);

    return this.fetchChunk(startRow, lastRow).pipe(
      tap(mapped => this.mergeRowsIntoState(mapped, { replaceInitial: true }))
    );
  }

  public loadInitialChunk(): Observable<any> {
    this.listState.update(s => ({ ...s, isInitialLoading: true }));
    
    const lastRow = this.lastDataRow() || 100;
    const startRow = Math.max(2, lastRow - this.CHUNK_SIZE + 1);

    // Try cache first
    return from(this.cacheService.getChunk(this.SHEET_NAME, `${startRow}:${lastRow}`)).pipe(
      switchMap(cachedRows => {
        if (cachedRows && cachedRows.length > 0) {
          const mapped = this.mapRowsToEntities(cachedRows, startRow);
          this.lowestRowLoaded = startRow;
          this.mergeRowsIntoState(mapped, { replaceInitial: true });
          
          // Background refresh the current chunk
          this.fetchChunk(startRow, lastRow).subscribe();
          return of(mapped);
        }

        return this.fetchChunk(startRow, lastRow);
      }),
      finalize(() => this.listState.update(s => ({ ...s, isInitialLoading: false })))
    );
  }

  public loadMoreChunk(): void {
    const state = this.listState();
    if (state.isLoadingMore || !state.hasMore) return;

    const nextEndRow = this.lowestRowLoaded - 1;
    if (nextEndRow < 2) {
      this.listState.update(s => ({ ...s, hasMore: false }));
      return;
    }

    this.listState.update(s => ({ ...s, isLoadingMore: true }));
    const startRow = Math.max(2, nextEndRow - this.CHUNK_SIZE + 1);

    this.fetchChunk(startRow, nextEndRow).subscribe({
      next: (mapped) => {
        this.lowestRowLoaded = startRow;
        this.listState.update(s => ({ ...s, isLoadingMore: false, hasMore: startRow > 2 }));
      },
      error: () => this.listState.update(s => ({ ...s, isLoadingMore: false }))
    });
  }

  protected fetchChunk(startRow: number, endRow: number, retryCount = 0): Observable<T[]> {
    return this.sheetsService.readSheetChunk(this.SHEET_NAME, startRow, endRow, this.COLUMNS_RANGE).pipe(
      switchMap(async response => {
        const rows = response.values || [];
        const mapped = this.mapRowsToEntities(rows, startRow);
        
        await this.cacheService.saveChunk(this.SHEET_NAME, `${startRow}:${endRow}`, rows);
        await this.cacheService.saveRecords(this.SHEET_NAME, mapped);
        
        this.mergeRowsIntoState(mapped);
        return mapped;
      }),
      catchError(err => {
        if (err.status === 429 && retryCount < 6) {
           const delay = Math.pow(2, retryCount) * 3000;
           return of([]).pipe(
             switchMap(() => new Promise<T[]>(r => setTimeout(() => r([]), delay))),
             switchMap(() => this.fetchChunk(startRow, endRow, retryCount + 1))
           );
        }
        console.error(`Error fetching chunk ${startRow}:${endRow}`, err);
        return of([]);
      })
    );
  }

  protected mergeRowsIntoState(newRows: T[], options?: { replaceInitial?: boolean }): void {
    const sorted = [...newRows].sort((a: any, b: any) => (b._rowNumber || 0) - (a._rowNumber || 0));

    // Update session loaded rows
    this.loadedRows.update(current => {
      const updated = options?.replaceInitial ? [...sorted] : [...current];
      if (!options?.replaceInitial) {
        sorted.forEach(row => {
          const idx = updated.findIndex((r: any) => r._rowNumber === (row as any)._rowNumber);
          if (idx !== -1) updated[idx] = row;
          else updated.push(row);
        });
      }
      return updated.sort((a: any, b: any) => (b._rowNumber || 0) - (a._rowNumber || 0));
    });

    // Update allRecords for dashboard compatibility (unless already fully loaded)
    if (!this.isFullyLoaded()) {
      this.allRecords.set(this.loadedRows());
    }

    // Update visible rows
    if (!this.hasActiveFilter(this.listState().query)) {
      const active = this.loadedRows().filter((r: any) => r.isDeleted !== true);
      this.listState.update(s => ({
        ...s,
        visibleRows: active,
        totalLoaded: active.length
      }));
    } else {
      // Re-trigger filtering with current query to include new rows
      this.applyQuery(this.listState().query);
    }
  }

  private lastQueryVersion = 0;

  public applyQuery(query: ListQuery): void {
    const hasFilter = this.hasActiveFilter(query);
    this.listState.update(s => ({ ...s, query, isFiltering: !!hasFilter }));
    
    if (!hasFilter) {
      // Show ALL loaded rows if no filter, don't cap at 100
      const source = this.isFullyLoaded() ? this.allRecords() : this.loadedRows();
      const active = source.filter((r: any) => r.isDeleted !== true);
      this.listState.update(s => ({ ...s, visibleRows: active, isFiltering: false }));
      return;
    }

    if (this.worker) {
      this.lastQueryVersion++;
      const currentVersion = this.lastQueryVersion;

      this.worker.onmessage = ({ data }) => {
        if (data.queryVersion && data.queryVersion < this.lastQueryVersion) return;
        // Don't slice worker results either
        this.listState.update(s => ({ ...s, visibleRows: data.filtered, isFiltering: false }));
      };

      this.worker.postMessage({ 
        records: this.isFullyLoaded() ? this.allRecords() : this.loadedRows(), 
        query, 
        sheetName: this.SHEET_NAME,
        queryVersion: currentVersion
      });
    } else {
      // Fallback (identical logic to worker)
      let filtered = (this.isFullyLoaded() ? this.allRecords() : this.loadedRows()).filter((r: any) => r.isDeleted !== true);
      
      if (query.search) {
        const term = query.search.toLowerCase();
        filtered = filtered.filter((r: any) => (r._searchText || '').includes(term));
      }

      if (query.filters) {
        Object.entries(query.filters).forEach(([col, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            const filterVal = val.toString().toLowerCase();
            filtered = filtered.filter((r: any) => {
              const rowVal = (r[col] !== undefined && r[col] !== null) ? r[col].toString().toLowerCase() : '';
              return rowVal === filterVal;
            });
          }
        });
      }

      if (query.columnFilters) {
        Object.entries(query.columnFilters).forEach(([col, filter]: [string, any]) => {
          if (filter.values && filter.values.length > 0) {
            filtered = filtered.filter((r: any) => {
              const val = (r[col] !== undefined && r[col] !== null) ? r[col].toString() : '';
              const match = filter.values.includes(val);
              return filter.operator === 'eq' ? match : !match;
            });
          }
        });
      }

      const dateRange = query.dateRange;
      if (dateRange && (dateRange.start || dateRange.end)) {
        filtered = filtered.filter((r: any) => {
          const time = r._dateTime || (r.date ? new Date(r.date).getTime() : 0);
          if (dateRange.start && time < dateRange.start) return false;
          if (dateRange.end && time > dateRange.end) return false;
          return true;
        });
      }

      this.listState.update(s => ({ ...s, visibleRows: filtered, isFiltering: false }));
    }
  }

  protected abstract mapRowsToEntities(rows: any[][], startRow: number): T[];

  private hasActiveFilter(query: ListQuery): boolean {
    if (!query) return false;
    return !!(
      query.search || 
      Object.keys(query.columnFilters || {}).length > 0 || 
      Object.values(query.filters || {}).some(v => v !== undefined && v !== null && v !== '') ||
      (query.dateRange && (query.dateRange.start || query.dateRange.end))
    );
  }
}
