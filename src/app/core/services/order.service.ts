import { Injectable, inject, signal, computed, effect, untracked } from '@angular/core';
import { Order } from '../models/order.model';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { Observable, of, throwError } from 'rxjs';
import { GoogleAuthService } from './google-auth.service';
import { LargeSheetListService } from './large-sheet-list.service';

@Injectable({
    providedIn: 'root'
})
export class OrderService extends LargeSheetListService<Order> {
    private auth = inject(GoogleAuthService);
    
    protected override CHUNK_SIZE = 500;
    protected override SHEET_NAME = 'ORDENES';
    protected override COLUMNS_RANGE = 'A:P';

    // Backward compatibility signals
    public orders = computed(() => this.allRecords());
    public activeOrders = computed(() => this.allRecords().filter(o => o.isDeleted !== true));
    public isLoading = computed(() => this.listState().isInitialLoading || this.listState().isLoadingMore || this.isDashboardFullLoadInProgress());
    
    public isDashboardFullLoadInProgress = signal(false);
    public hasDashboardHydratedOrders = signal(false);

    public loadAllOrdersForDashboard(): Observable<Order[]> {
        if (this.isFullyLoaded()) return of(this.allRecords());
        if (this.isDashboardFullLoadInProgress()) return of([]);

        this.isDashboardFullLoadInProgress.set(true);
        
        return this.resolveLastDataRow().pipe(
            switchMap(lastRow => {
                this.lastDataRow.set(lastRow);
                return this.recursiveDashboardSync(lastRow);
            }),
            tap(all => {
                this.isFullyLoaded.set(true);
                this.isDashboardFullLoadInProgress.set(false);
                this.hasDashboardHydratedOrders.set(true);
            }),
            catchError(err => {
                this.isDashboardFullLoadInProgress.set(false);
                return throwError(() => err);
            })
        );
    }

    private recursiveDashboardSync(endRow: number): Observable<Order[]> {
        if (endRow < 2) return of([]);
        const startRow = Math.max(2, endRow - this.CHUNK_SIZE + 1);
        
        return this.fetchChunk(startRow, endRow).pipe(
            switchMap(mapped => {
                if (startRow > 2) {
                    return this.recursiveDashboardSync(startRow - 1).pipe(
                        map(rest => [...rest, ...mapped])
                    );
                }
                return of(mapped);
            })
        );
    }

    public initListFromLoadedMemory(): void {
        if (this.isFullyLoaded() && this.allRecords().length > 0) {
            // Re-initialize session state from existing memory
            this.loadedRows.set(this.allRecords());
            this.lowestRowLoaded = 2; // Everything is loaded
            this.listState.update(s => ({
                ...s,
                visibleRows: this.allRecords(), // Show EVERYTHING
                totalLoaded: this.allRecords().length,
                hasMore: false
            }));
            this.isInitialized = true;
        }
    }

    private nextRowNumber: number = 2; // We'll keep this for creations

    private readonly ORDER_SCHEMA: (keyof Order | 'notes')[] = [
        'id', 'date', 'productQuantity', 'productPrice', 'productName', 
        'fullName', 'phone', 'address1', 'province', 'city', 
        'packaging', 'carrier', 'shippingCost', 'status', 'notes', 'isDeleted'
    ];

    private readonly HEADER_MAP: { [key: string]: keyof Order } = {
        '#': 'id', 'id': 'id', 'date': 'date', 'fecha': 'date',
        'product quantity': 'productQuantity', 'cantidad': 'productQuantity',
        'product price': 'productPrice', 'precio': 'productPrice',
        'product name': 'productName', 'producto': 'productName',
        'full name': 'fullName', 'nombre': 'fullName',
        'phone': 'phone', 'telefono': 'phone', 'teléfono': 'phone',
        'address 1': 'address1', 'direccion': 'address1', 'dirección': 'address1',
        'province': 'province', 'provincia': 'province',
        'city': 'city', 'ciudad': 'city',
        'empacado': 'packaging', 'envio registrado': 'carrier',
        'envio registrado en paquetera': 'carrier', 'carrier': 'carrier',
        'costo de envio': 'shippingCost', 'envio': 'shippingCost',
        'status': 'status', 'estado': 'status',
        'notes': 'notes', 'notas': 'notes',
        'eliminado': 'isDeleted'
    };

    constructor() {
        super();
        
        // Eager initialization if already authenticated
        if (this.auth.isAuthenticated()) {
            this.initLargeList();
            this.loadAllOrdersForDashboard().subscribe();
        } else {
            // Wait for authentication
            effect(() => {
                if (this.auth.isAuthenticated() && !this.isInitialized) {
                    untracked(() => {
                        this.initLargeList();
                        this.loadAllOrdersForDashboard().subscribe();
                    });
                }
            });
        }
    }

    public override initLargeList(): void {
        super.initLargeList();
    }

    // Adapt old loadOrders to new architecture
    public loadOrders(quiet: boolean = false): Observable<any> {
        this.initLargeList();
        this.loadAllOrdersForDashboard().subscribe();
        return of(null);
    }

    protected mapRowsToEntities(rows: any[][], startRow: number): Order[] {
        if (rows.length === 0) return [];
        
        // Use currentHeaders from base class
        const headerRow = this.currentHeaders.map(h => this.normalizeHeader(h));
        const hasHeaders = headerRow.length > 0;
        
        return rows.map((row, index) => {
            const rowNumber = startRow + index;
            const order: any = { _rowNumber: rowNumber };
            
            if (hasHeaders) {
                headerRow.forEach((header, colIndex) => {
                    let property = this.HEADER_MAP[header];
                    if (colIndex === 0 && !property) property = 'id';
                    
                    if (property) {
                        let value = row[colIndex];
                        // If it's the ID and it's empty, use a fallback based on row number
                        if (property === 'id' && (!value || value.toString().trim() === '')) {
                            value = `W${rowNumber.toString().padStart(5, '0')}`;
                        }
                        order[property as string] = this.parseValue(property as string, value);
                    }
                });
            } else {
                // Fallback: use schema order if headers are missing
                this.ORDER_SCHEMA.forEach((prop, colIndex) => {
                    let value = row[colIndex];
                    if (prop === 'id' && (!value || value.toString().trim() === '')) {
                        value = `W${rowNumber.toString().padStart(5, '0')}`;
                    }
                    if (prop !== 'notes') { // notes is a special case in schema
                        order[prop as string] = this.parseValue(prop as string, value);
                    }
                });
            }
            
            // Pre-normalize for fast searching
            order._searchText = `${order.id} ${order.fullName} ${order.phone} ${order.productName} ${order.province} ${order.city} ${order.status}`.toLowerCase();
            if (order.date) order._dateTime = new Date(order.date).getTime();
            
            // Pre-calculate total price for filtering
            order._totalPrice = (order.productPrice * order.productQuantity) + (order.shippingCost || 0) + (order.packaging || 0);

            return order as Order;
        }).filter(o => this.isValidOrder(o));
    }

    private normalizeHeader(header: any): string {
        return (header || '').toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    }

    private parseValue(property: string, value: any): any {
        if (value === undefined || value === null) return '';
        const sValue = value.toString().trim();
        if (!sValue) return '';
        if (property === 'productQuantity') return parseInt(sValue.replace(/[^0-9]/g, '')) || 1;
        if (property === 'productPrice' || property === 'shippingCost' || property === 'packaging') {
            const num = parseFloat(sValue.replace(/[^0-9.-]/g, ""));
            return isNaN(num) ? 0 : num;
        }
        if (property === 'isDeleted') return sValue.toLowerCase() === 'eliminado';
        return sValue;
    }

    private isValidOrder(order: any): boolean {
        // More lenient check to ensure we show data even if partial
        return !!(order.id || order.fullName || order.phone);
    }

    public createOrder(order: Order): Observable<any> {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        order.date = `${yyyy}-${dd}-${mm}`;
        order.isDeleted = false;

        // Calculate next ID
        const currentRows = this.allRecords();
        let nextNumber = 1;
        if (currentRows.length > 0) {
            const numbers = currentRows.map(o => {
                const match = (o.id?.toString() || '').match(/\d+/);
                return match ? parseInt(match[0], 10) : 0;
            });
            nextNumber = Math.max(...numbers) + 1;
        }
        order.id = `W${nextNumber.toString().padStart(5, '0')}`;

        const row = this.mapOrderToRow(order);
        const currentRow = (this.lastDataRow() || 2) + 1; 

        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${currentRow}:${String.fromCharCode(64 + row.length)}${currentRow}`, [row]).pipe(
            tap(() => {
                const mapped = { ...order, _rowNumber: currentRow };
                this.lastDataRow.set(currentRow);
                this.cacheService.saveMetadata(this.SHEET_NAME, 'lastDataRow', currentRow);
                this.mergeRowsIntoState([mapped]);
            })
        );
    }

    public updateOrder(rowNumber: number, order: Order): Observable<any> {
        const row = this.mapOrderToRow(order);
        const endCol = String.fromCharCode(64 + row.length);
        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${rowNumber}:${endCol}${rowNumber}`, [row]).pipe(
            tap(() => {
                const mapped = { ...order, _rowNumber: rowNumber };
                this.mergeRowsIntoState([mapped]);
            })
        );
    }

    public deleteOrder(rowNumber: number): Observable<any> {
        const colIndex = this.currentHeaders.findIndex(h => this.normalizeHeader(h) === 'eliminado');
        const colLetter = colIndex >= 0 ? String.fromCharCode(65 + colIndex) : 'P';

        return this.sheetsService.updateRow(`${this.SHEET_NAME}!${colLetter}${rowNumber}`, [['eliminado']]).pipe(
            tap(() => {
                this.loadedRows.update(rows => rows.filter(o => o['_rowNumber'] !== rowNumber));
                this.allRecords.update(rows => rows.filter(o => o['_rowNumber'] !== rowNumber));
                this.listState.update(s => ({
                    ...s,
                    visibleRows: s.visibleRows.filter(o => o['_rowNumber'] !== rowNumber)
                }));
            })
        );
    }

    private mapOrderToRow(order: Order): any[] {
        const headerRow = this.currentHeaders.map(h => this.normalizeHeader(h));
        const row: any[] = new Array(this.ORDER_SCHEMA.length).fill('');
        this.ORDER_SCHEMA.forEach((prop, schemaIdx) => {
            let targetIdx = headerRow.findIndex(h => this.HEADER_MAP[h] === prop);
            if (targetIdx === -1) targetIdx = schemaIdx;
            let value = (order as any)[prop];
            if (prop === 'isDeleted') value = value ? 'eliminado' : '';
            if (targetIdx >= row.length) while(row.length <= targetIdx) row.push('');
            row[targetIdx] = (value !== undefined && value !== null) ? value : '';
        });
        return row;
    }
}
