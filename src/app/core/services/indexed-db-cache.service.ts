import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class IndexedDbCacheService {
  private dbName = 'SheetCacheDB';
  private dbVersion = 4;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDb().catch(err => console.error('Failed to init IndexedDB:', err));
  }

  private initDb(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        // Version 4: Change keyPath from 'id' to 'cacheId' to avoid clashing with business data
        if (oldVersion < 4) {
          if (db.objectStoreNames.contains('chunks')) db.deleteObjectStore('chunks');
          if (db.objectStoreNames.contains('records')) db.deleteObjectStore('records');
        }
        
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: 'cacheId' });
        }
        
        if (!db.objectStoreNames.contains('records')) {
          const recordStore = db.createObjectStore('records', { keyPath: 'cacheId' });
          recordStore.createIndex('sheetName', 'sheetName', { unique: false });
          recordStore.createIndex('rowNumber', 'rowNumber', { unique: false });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event: any) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  public async saveChunk(sheetName: string, range: string, data: any[]): Promise<void> {
    if (!this.db) await this.initDb();
    const cacheId = `${sheetName}_${range}`;
    return this.performTransaction('chunks', 'readwrite', (store) => {
      store.put({ cacheId, sheetName, range, data, updatedAt: Date.now() });
    });
  }

  public async getChunk(sheetName: string, range: string): Promise<any | null> {
    if (!this.db) await this.initDb();
    const cacheId = `${sheetName}_${range}`;
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['chunks'], 'readonly');
      const store = transaction.objectStore('chunks');
      const request = store.get(cacheId);
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => resolve(null);
    });
  }

  public async saveRecords(sheetName: string, records: any[]): Promise<void> {
    if (!this.db) await this.initDb();
    return this.performTransaction('records', 'readwrite', (store) => {
      records.forEach(record => {
        const cacheId = `${sheetName}_${record._rowNumber}`;
        store.put({ ...record, cacheId, sheetName, rowNumber: record._rowNumber });
      });
    });
  }

  public async getAllRecords(sheetName: string): Promise<any[]> {
    if (!this.db) await this.initDb();
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['records'], 'readonly');
      const store = transaction.objectStore('records');
      const index = store.index('sheetName');
      const request = index.getAll(sheetName);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  }

  public async clearSheetCache(sheetName: string): Promise<void> {
    if (!this.db) await this.initDb();
    // Implementation for clearing specific sheet data...
  }

  private performTransaction(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], mode);
      const store = transaction.objectStore(storeName);
      action(store);
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event: any) => reject(event.target.error);
    });
  }
}
