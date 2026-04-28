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
    isInitialLoading: true,
    isLoadingMore: false,
    isFiltering: false,
    hasMore: true,
    query: { search: '', columnFilters: {}, sort: { active: '_rowNumber', direction: 'desc' } }
  });

  // Global signal for all records (useful for dashboard/global stats)
  public allRecords = signal<T[]>([]);

  protected abstract SHEET_NAME: string;
  protected abstract COLUMNS_RANGE: string;
  
  protected currentHeaders: string[] = [];
  protected worker: Worker | null = null;
  protected isInitialized = false;

  constructor() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../workers/list-filter.worker', import.meta.url));
      this.worker.onmessage = ({ data }) => {
        const { filtered } = data;
        this.listState.update(s => ({ ...s, visibleRows: filtered, isFiltering: false }));
      };
    }
  }

  public initLargeList(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    // Start loading headers and data in parallel
    this.sheetsService.readHeader(this.SHEET_NAME, this.COLUMNS_RANGE).subscribe({
      next: (headers) => {
        this.currentHeaders = headers;
        // If data was already loaded before headers, we might need a re-map, 
        // but for initial render, fallback schema is usually correct.
      }
    });

    this.loadInitialChunk().subscribe();
    this.startBackgroundFullSync();
  }

  public refreshVisibleChunk(): Observable<any> {
    // Only refresh if not already loading and no active search/filter
    const state = this.listState();
    if (state.isInitialLoading || state.isLoadingMore || state.query.search || Object.keys(state.query.columnFilters || {}).length > 0) {
      return of(null);
    }

    return this.sheetsService.readSheetChunk(this.SHEET_NAME, 2, this.CHUNK_SIZE + 1, this.COLUMNS_RANGE).pipe(
      switchMap(async response => {
        const rows = response.values || [];
        if (rows.length > 0) {
          const mapped = this.mapRowsToEntities(rows, 2);
          await this.cacheService.saveRecords(this.SHEET_NAME, mapped);
          
          // Add to allRecords if not already there (or replace if row number matches)
          this.allRecords.update(current => {
             const updated = [...current];
             mapped.forEach(m => {
                const idx = updated.findIndex((r: any) => r._rowNumber === (m as any)._rowNumber);
                if (idx !== -1) updated[idx] = m;
                else updated.push(m);
             });
             return updated;
          });

          // Let the worker refresh the sorted view
          this.applyQuery(this.listState().query);
        }
        return response;
      })
    );
  }

  protected readonly INSTANT_CHUNK_SIZE = 25; // Render these first for sub-1s load
  protected readonly CHUNK_SIZE = 1000;

  public loadInitialChunk(): Observable<any> {
    // Already set to true in initial state, but ensuring it here
    this.listState.update(s => ({ ...s, isInitialLoading: s.visibleRows.length === 0 }));
    
    return from(this.cacheService.getChunk(this.SHEET_NAME, `2:${this.CHUNK_SIZE + 1}`)).pipe(
      switchMap(cachedData => {
        if (cachedData && cachedData.length > 0) {
          const mapped = this.mapRowsToEntities(cachedData, 2);
          
          // CRITICAL: Update state and turn off loading flag in ONE cycle
          this.listState.update(s => ({
            ...s,
            visibleRows: mapped,
            totalLoaded: mapped.length,
            isInitialLoading: false 
          }));
          this.allRecords.set(mapped);
          
          // Background refresh
          this.fetchChunk(2, this.CHUNK_SIZE + 1).subscribe();
          return of(mapped);
        }

        // NO CACHE: Fetch instant chunk
        return this.fetchChunk(2, this.INSTANT_CHUNK_SIZE + 1).pipe(
          tap(() => {
            this.fetchChunk(this.INSTANT_CHUNK_SIZE + 2, this.CHUNK_SIZE + 1).subscribe();
          }),
          finalize(() => this.listState.update(s => ({ ...s, isInitialLoading: false })))
        );
      }),
      catchError(err => {
        this.listState.update(s => ({ ...s, isInitialLoading: false }));
        return throwError(() => err);
      })
    );
  }

  public loadMoreChunk(): void {
    const state = this.listState();
    if (state.isLoadingMore || !state.hasMore) return;

    this.listState.update(s => ({ ...s, isLoadingMore: true }));
    const startRow = state.totalLoaded + 2;
    const endRow = startRow + this.CHUNK_SIZE - 1;

    this.fetchChunk(startRow, endRow).subscribe({
      next: () => this.listState.update(s => ({ ...s, isLoadingMore: false })),
      error: () => this.listState.update(s => ({ ...s, isLoadingMore: false }))
    });
  }

  protected fetchChunk(startRow: number, endRow: number): Observable<T[]> {
    return this.sheetsService.readSheetChunk(this.SHEET_NAME, startRow, endRow, this.COLUMNS_RANGE).pipe(
      switchMap(async response => {
        const rows = response.values || [];
        const mapped = this.mapRowsToEntities(rows, startRow);
        
        await this.cacheService.saveChunk(this.SHEET_NAME, `${startRow}:${endRow}`, rows);
        await this.cacheService.saveRecords(this.SHEET_NAME, mapped);
        
        this.updateStateWithNewRows(mapped, startRow === 2);
        return mapped;
      }),
      catchError(err => {
        console.error(`Error fetching chunk ${startRow}:${endRow}`, err);
        return of([]);
      })
    );
  }

  private updateStateWithNewRows(newRows: T[], isInitial: boolean): void {
    // Update global records signal
    this.allRecords.update(records => isInitial ? newRows : [...records, ...newRows]);
    
    this.listState.update(s => ({
      ...s,
      totalLoaded: isInitial ? newRows.length : s.totalLoaded + newRows.length,
      hasMore: newRows.length >= this.CHUNK_SIZE
    }));

    // If no active filter, update visibleRows immediately for instant feedback
    const query = this.listState().query;
    const hasActiveFilter = query.search || Object.keys(query.columnFilters || {}).length > 0 || (query.dateRange && (query.dateRange.start || query.dateRange.end));
    
    if (!hasActiveFilter) {
      // Default sort is _rowNumber DESC, which newRows already matches if coming from fetchChunk(2, ...)
      // But for loadMore, we should merge and sort
      this.listState.update(s => {
        let allVisible = isInitial ? [...newRows] : [...s.visibleRows, ...newRows];
        // Ensure DESC sort by _rowNumber
        allVisible.sort((a: any, b: any) => (b._rowNumber || 0) - (a._rowNumber || 0));
        return { ...s, visibleRows: allVisible };
      });
    } else {
      // Re-apply sorting/filtering to include the new data
      this.applyQuery(query);
    }
  }

  public applyQuery(query: ListQuery): void {
    const hasActiveFilter = query.search || Object.keys(query.columnFilters || {}).length > 0 || (query.dateRange && (query.dateRange.start || query.dateRange.end));
    
    this.listState.update(s => ({ ...s, query, isFiltering: !!hasActiveFilter }));
    
    if (this.worker) {
      this.cacheService.getAllRecords(this.SHEET_NAME).then(records => {
        if (!records || records.length === 0) {
          if (!hasActiveFilter) {
            this.listState.update(s => ({ ...s, isFiltering: false }));
            return;
          }
        }
        this.worker?.postMessage({ records: records || [], query, sheetName: this.SHEET_NAME });
      });
    } else {
      // Fallback: Filter on main thread if worker is unavailable
      this.cacheService.getAllRecords(this.SHEET_NAME).then(records => {
        let filtered = records || [];
        if (query.search) {
          const term = query.search.toLowerCase();
          filtered = filtered.filter((r: any) => (r._searchText || '').includes(term));
        }
        // ... more simple filtering if needed ...
        this.listState.update(s => ({ ...s, visibleRows: filtered, isFiltering: false }));
      });
    }
  }

  private startBackgroundFullSync(): void {
    this.cacheService.getAllRecords(this.SHEET_NAME).then(records => {
      if (records && records.length > 0) {
        // Sort cached records descending by row number for initial view
        const sortedRecords = [...records].sort((a: any, b: any) => (b._rowNumber || 0) - (a._rowNumber || 0));
        this.allRecords.set(records as T[]);
        this.listState.update(s => ({
          ...s,
          visibleRows: sortedRecords.slice(0, this.CHUNK_SIZE),
          totalLoaded: records.length,
          isInitialLoading: false
        }));
      }
      
      // Start background sync with a significant delay to avoid hitting rate limits during startup
      setTimeout(() => {
        const state = this.listState();
        if (state.hasMore) {
          this.syncNextChunk(state.totalLoaded + 2);
        }
      }, 15000); // 15 seconds delay
    });
  }

  private syncNextChunk(startRow: number, retryCount: number = 0): void {
    const endRow = startRow + this.CHUNK_SIZE - 1;
    this.sheetsService.readSheetChunk(this.SHEET_NAME, startRow, endRow, this.COLUMNS_RANGE).pipe(
      catchError(err => {
        if (err.status === 429) {
          // Rate limit hit: wait longer and retry with exponential backoff
          const delay = Math.min(30000, Math.pow(2, retryCount) * 5000);
          console.warn(`[ListService] Rate limit hit for ${this.SHEET_NAME}. Retrying in ${delay}ms...`);
          setTimeout(() => this.syncNextChunk(startRow, retryCount + 1), delay);
          return of(null);
        }
        if (err.status === 400) {
          return of({ values: [] });
        }
        return throwError(() => err);
      })
    ).subscribe(async response => {
      if (!response) return; // Handled by retry
      
      const rows = response?.values || [];
      if (rows.length > 0) {
        const mapped = this.mapRowsToEntities(rows, startRow);
        await this.cacheService.saveRecords(this.SHEET_NAME, mapped);
        this.updateStateWithNewRows(mapped, false);

        if (rows.length === this.CHUNK_SIZE) {
          // Slow down the sync frequency significantly
          setTimeout(() => this.syncNextChunk(endRow + 1), 10000);
        } else {
          this.listState.update(s => ({ ...s, hasMore: false }));
        }
      } else {
        this.listState.update(s => ({ ...s, hasMore: false }));
      }
    });
  }

  protected abstract mapRowsToEntities(rows: any[][], startRow: number): T[];
}
