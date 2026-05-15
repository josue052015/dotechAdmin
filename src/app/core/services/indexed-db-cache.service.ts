import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class IndexedDbCacheService {
  private dbName = 'SheetCacheDB';
  private dbVersion = 5;
  private db: IDBDatabase | null = null;
  private initDbPromise: Promise<void> | null = null;

  constructor() {
    this.initDb().catch(err => console.error('Failed to init IndexedDB:', err));
  }

  private initDb(): Promise<void> {
    if (this.initDbPromise) {
      return this.initDbPromise;
    }

    this.initDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        // Version 5: Recreate stores to fix potential missing object store corruption
        if (oldVersion < 5) {
          if (db.objectStoreNames.contains('chunks')) db.deleteObjectStore('chunks');
          if (db.objectStoreNames.contains('records')) db.deleteObjectStore('records');
          if (db.objectStoreNames.contains('metadata')) db.deleteObjectStore('metadata');
        }
        
        if (!db.objectStoreNames.contains('chunks')) {
          db.createObjectStore('chunks', { keyPath: 'cacheId' });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'cacheId' });
        }
        
        if (!db.objectStoreNames.contains('records')) {
          const recordStore = db.createObjectStore('records', { keyPath: 'cacheId' });
          recordStore.createIndex('sheetName', 'sheetName', { unique: false });
          recordStore.createIndex('rowNumber', 'rowNumber', { unique: false });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        
        if (this.db) {
          this.db.onversionchange = () => {
            this.db?.close();
            this.db = null;
            this.initDbPromise = null;
          };
          this.db.onclose = () => {
            this.db = null;
            this.initDbPromise = null;
          };
        }
        
        resolve();
      };

      request.onerror = (event: any) => {
        console.error('IndexedDB error:', event.target.error);
        this.initDbPromise = null;
        reject(event.target.error);
      };
      
      request.onblocked = () => {
        console.warn('IndexedDB blocked. Please close other tabs.');
        // Don't reject here, as it might unblock when other tabs close
      };
    });

    return this.initDbPromise;
  }

  public async saveMetadata(sheetName: string, key: string, value: any): Promise<void> {
    if (!this.db) await this.initDb();
    const cacheId = `${sheetName}_${key}`;
    return this.performTransaction('metadata', 'readwrite', (store) => {
      store.put({ cacheId, sheetName, key, value, updatedAt: Date.now() });
    });
  }

  public async saveHeaders(sheetName: string, headers: string[]): Promise<void> {
    return this.saveMetadata(sheetName, 'headers', headers);
  }

  public async getHeaders(sheetName: string): Promise<string[] | null> {
    return this.getMetadata(sheetName, 'headers');
  }

  public async getMetadata(sheetName: string, key: string): Promise<any | null> {
    if (!this.db) await this.initDb();
    const cacheId = `${sheetName}_${key}`;
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(cacheId);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => resolve(null);
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
