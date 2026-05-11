import { signal, computed, inject } from '@angular/core';
import { LargeListState, ListQuery } from '../models/list-state.model';
import { GoogleSheetsService } from './google-sheets.service';
import { IndexedDbCacheService } from './indexed-db-cache.service';
import { Observable, BehaviorSubject, of, from, throwError, timer, Subscription, forkJoin } from 'rxjs';
import { tap, map, catchError, switchMap, finalize, filter } from 'rxjs/operators';

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
  protected CHUNK_SIZE = 200;
  private syncSubscription?: Subscription;
  private rawDataCache = new Map<string, string>();
  private isSyncing = false;

  constructor() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../workers/list-filter.worker', import.meta.url));
    }
  }

  public initLargeList(): void {
    if (this.isInitialized) {
      // If already initialized, just ensure sync is running if it was stopped
      return;
    }
    this.isInitialized = true;
    
    // Only show loading if we have absolutely no data in memory
    const hasDataInMemory = this.allRecords().length > 0;
    if (!hasDataInMemory) {
      this.listState.update(s => ({ ...s, isInitialLoading: true }));
    }

    // --- PHASE 1: INSTANT CACHE RESTORATION ---
    // If we have data in memory, we skip this to avoid signal noise
    if (!hasDataInMemory) {
      this.tryRestoreFromCache();
    }

    // --- PHASE 2: BACKGROUND REVALIDATION ---
    forkJoin({
      headers: this.sheetsService.readHeader(this.SHEET_NAME, this.COLUMNS_RANGE).pipe(
        tap(h => {
          this.currentHeaders = h;
          this.cacheService.saveHeaders(this.SHEET_NAME, h);
        }),
        catchError(() => of([]))
      ),
      lastRow: this.resolveLastDataRow()
    }).pipe(
      switchMap(({ lastRow }) => {
        this.lastDataRow.set(lastRow);
        this.lowestRowLoaded = lastRow + 1;
        return this.loadInitialChunk();
      }),
      finalize(() => {
        if (!hasDataInMemory) {
          this.listState.update(s => ({ ...s, isInitialLoading: false }));
        }
      })
    ).subscribe();
  }

  private async tryRestoreFromCache(): Promise<void> {
    const [cachedHeaders, cachedLastRow] = await Promise.all([
      this.cacheService.getHeaders(this.SHEET_NAME),
      this.cacheService.getMetadata(this.SHEET_NAME, 'lastDataRow')
    ]);

    if (cachedHeaders && cachedLastRow) {
      this.currentHeaders = cachedHeaders;
      this.lastDataRow.set(cachedLastRow);
      this.lowestRowLoaded = cachedLastRow + 1;

      // Immediately attempt to load records from cache for this range
      const startRow = Math.max(2, cachedLastRow - this.CHUNK_SIZE + 1);
      const cachedData = await this.cacheService.getChunk(this.SHEET_NAME, `${startRow}:${cachedLastRow}`);
      
      if (cachedData && cachedData.length > 0) {
        const mapped = this.mapRowsToEntities(cachedData, startRow);
        this.mergeRowsIntoState(mapped, { replaceInitial: true });
        // UI is now showing data, likely in <100ms
      }
    }
  }

  /**
   * Probe backwards to find the actual last row with data in KEY_COLUMN
   * without reading the entire A:A column.
   */
  protected resolveLastDataRow(startFrom?: number): Observable<number> {
    this.isResolvingLastRow.set(true);
    const startRow = startFrom || 2;
    
    // 1. Speculative leapfrog (fast probe for small/medium sheets)
    // 2. Grid size check (for very large sheets)
    // Run both in parallel to find the last row as fast as possible
    return forkJoin({
      gridRowCount: this.sheetsService.getSheetGridRowCount(this.SHEET_NAME).pipe(catchError(() => of(5000))),
      fastProbe: this.leapfrogForward(startRow, startRow + 2000) 
    }).pipe(
      switchMap(({ gridRowCount, fastProbe }) => {
        // If fast probe found something and it's less than the probe limit, 
        // it might be the end. But if it hit the limit, we need to continue up to gridRowCount.
        if (fastProbe < startRow + 2000) {
           return of(fastProbe);
        }
        return this.leapfrogForward(fastProbe, gridRowCount);
      }),
      tap(lastRow => {
        this.isResolvingLastRow.set(false);
        this.cacheService.saveMetadata(this.SHEET_NAME, 'lastDataRow', lastRow);
      }),
      catchError(err => {
        this.isResolvingLastRow.set(false);
        console.error('Error resolving last row:', err);
        return of(5000); 
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

    return this.fetchChunk(startRow, lastRow);
  }

  public loadInitialChunk(): Observable<any> {
    const lastRow = this.lastDataRow() || 100;
    const startRow = Math.max(2, lastRow - this.CHUNK_SIZE + 1);

    // Try cache first (redundant if tryRestoreFromCache already ran, but safe)
    return from(this.cacheService.getChunk(this.SHEET_NAME, `${startRow}:${lastRow}`)).pipe(
      switchMap(cachedRows => {
        if (cachedRows && cachedRows.length > 0) {
          const mapped = this.mapRowsToEntities(cachedRows, startRow);
          this.lowestRowLoaded = startRow;
          this.mergeRowsIntoState(mapped, { replaceInitial: true });
          
          // Background refresh the current chunk with a LIGHTER fetch if possible
          // But for consistency we fetch the full chunk
          return this.fetchChunk(startRow, lastRow);
        }

        return this.fetchChunk(startRow, lastRow);
      })
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
        const rangeKey = `${this.SHEET_NAME}!${startRow}:${endRow}`;
        const dataHash = JSON.stringify(rows);

        // Optimization: Only process if data has actually changed
        if (this.rawDataCache.get(rangeKey) === dataHash) {
          return [];
        }
        
        this.rawDataCache.set(rangeKey, dataHash);
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
    // Guard: If no rows were mapped (cached or empty response), do nothing
    if (newRows.length === 0) return;

    const sorted = [...newRows].sort((a: any, b: any) => (b._rowNumber || 0) - (a._rowNumber || 0));

    // Update session loaded rows
    this.loadedRows.update(current => {
      const updated = options?.replaceInitial ? [...sorted] : [...current];
      let hasChanges = false;

      if (!options?.replaceInitial) {
        sorted.forEach(row => {
          const idx = updated.findIndex((r: any) => r._rowNumber === (row as any)._rowNumber);
          if (idx !== -1) {
            // Check if actual content changed to avoid redundant signal updates
            if (JSON.stringify(updated[idx]) !== JSON.stringify(row)) {
              updated[idx] = row;
              hasChanges = true;
            }
          } else {
            updated.push(row);
            hasChanges = true;
          }
        });
      } else {
        hasChanges = true;
      }

      if (!hasChanges && !options?.replaceInitial) return current;
      return updated.sort((a: any, b: any) => (b._rowNumber || 0) - (a._rowNumber || 0));
    });

    // Update allRecords for dashboard compatibility (unless already fully loaded)
    // Always update allRecords for dashboard compatibility (real-time updates)
    this.allRecords.set(this.loadedRows());

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

  /**
   * Starts background synchronization.
   * @param activeInterval Frequency to check for new rows and refresh the top chunk (default 5s)
   * @param backgroundInterval Frequency to refresh a larger set of records for edits (default 45s)
   */
  public startBackgroundSync(activeInterval = 5000, backgroundInterval = 45000): void {
    if (this.syncSubscription) return;

    // Add random jitter to the start to avoid "herd effect" between multiple services
    const startJitter = Math.floor(Math.random() * 5000);

    this.syncSubscription = timer(startJitter, activeInterval).pipe(
      filter(() => !document.hidden && !this.listState().isFiltering && !this.isSyncing),
      switchMap((tick) => {
        // Every backgroundInterval (roughly), do a deeper sync
        const isBackgroundTick = (tick * activeInterval) % backgroundInterval === 0;
        
        // Add a small intra-tick jitter (0-2s) to prevent exact simultaneous firing
        const tickJitter = Math.floor(Math.random() * 2000);
        
        return timer(tickJitter).pipe(
          switchMap(() => {
            this.isSyncing = true;
            return this.performSync(isBackgroundTick).pipe(
              finalize(() => this.isSyncing = false)
            );
          })
        );
      }),
      catchError(err => {
        console.error('Background sync failed:', err);
        this.isSyncing = false;
        return of(null);
      })
    ).subscribe();
  }

  private performSync(isBackgroundTick: boolean): Observable<any> {
    // 1. Resolve Last Row to detect NEW rows (optimized probe from current last)
    const currentLast = this.lastDataRow() || 2;
    return this.resolveLastDataRow(currentLast).pipe(
      switchMap(newLastRow => {
        const syncTasks: Observable<any>[] = [];

        // If new rows exist, fetch them
        if (newLastRow > currentLast) {
          syncTasks.push(this.fetchChunk(currentLast + 1, newLastRow));
        }

        // 2. Refresh the "Current Page" (top chunk) for edits every tick (5s)
        const topChunkStart = Math.max(2, newLastRow - 50); // Sync top 50 for performance
        syncTasks.push(this.fetchChunk(topChunkStart, newLastRow));

        // 3. If it's a background tick (20s), refresh a larger window
        if (isBackgroundTick) {
          const midChunkStart = Math.max(2, newLastRow - 200);
          syncTasks.push(this.fetchChunk(midChunkStart, newLastRow));
        }

        return syncTasks.length > 0 ? from(syncTasks).pipe(switchMap(t => t)) : of(null);
      })
    );
  }

  public stopBackgroundSync(): void {
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
      this.syncSubscription = undefined;
    }
    this.isSyncing = false;
  }
}
