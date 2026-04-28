import { Injectable, inject, signal, computed, effect, untracked } from '@angular/core';
import { Order } from '../models/order.model';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { GoogleAuthService } from './google-auth.service';
import { LargeSheetListService } from './large-sheet-list.service';

@Injectable({
    providedIn: 'root'
})
export class OrderService extends LargeSheetListService<Order> {
    private auth = inject(GoogleAuthService);
    
    protected override SHEET_NAME = 'ORDENES';
    protected override COLUMNS_RANGE = 'A:P';

    // Backward compatibility signals
    public orders = computed(() => this.allRecords());
    public activeOrders = computed(() => this.allRecords().filter(o => o.isDeleted !== true));
    public isLoading = computed(() => this.listState().isInitialLoading || this.listState().isLoadingMore);
    
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
            super.initLargeList();
        } else {
            // Wait for authentication
            effect(() => {
                if (this.auth.isAuthenticated() && !this.isInitialized) {
                    untracked(() => super.initLargeList());
                }
            });
        }
    }

    public override initLargeList(): void {
        // Handled by constructor effect now
    }

    // Adapt old loadOrders to new architecture
    public loadOrders(quiet: boolean = false): Observable<any> {
        this.initLargeList();
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
            order._searchText = `${order.id} ${order.fullName} ${order.phone} ${order.productName} ${order.status}`.toLowerCase();
            if (order.date) order._dateTime = new Date(order.date).getTime();

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

        // Use allRecords() to ensure we see the highest ID even if not in the current visible chunk
        const allOrders = this.allRecords();
        const wOrders = allOrders.filter(o => (o.id || '').toString().toLowerCase().includes('w'));
        let nextNumber = 1;
        if (wOrders.length > 0) {
            const numbers = wOrders.map(o => {
                const match = (o.id?.toString() || '').match(/\d+/);
                return match ? parseInt(match[0], 10) : 0;
            });
            nextNumber = Math.max(...numbers) + 1;
        }
        order.id = `W${nextNumber.toString().padStart(5, '0')}`;

        const row = this.mapOrderToRow(order);
        // Use allRecords() length for a more accurate end-of-sheet calculation
        const currentRow = this.allRecords().length + 2; 

        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${currentRow}:${String.fromCharCode(64 + row.length)}${currentRow}`, [row]).pipe(
            tap(() => {
                // Optimistic update
                const mapped = { ...order, _rowNumber: currentRow };
                this.listState.update(s => ({
                    ...s,
                    visibleRows: [mapped, ...s.visibleRows],
                    totalLoaded: s.totalLoaded + 1
                }));
            })
        );
    }

    public updateOrder(rowNumber: number, order: Order): Observable<any> {
        const row = this.mapOrderToRow(order);
        const endCol = String.fromCharCode(64 + row.length);
        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${rowNumber}:${endCol}${rowNumber}`, [row]).pipe(
            tap(() => {
                // Update local state
                this.listState.update(s => {
                    const idx = s.visibleRows.findIndex(o => o['_rowNumber'] === rowNumber);
                    if (idx !== -1) {
                        const updated = [...s.visibleRows];
                        updated[idx] = { ...order, _rowNumber: rowNumber };
                        return { ...s, visibleRows: updated };
                    }
                    return s;
                });
            })
        );
    }

    public deleteOrder(rowNumber: number): Observable<any> {
        const colIndex = this.currentHeaders.findIndex(h => this.normalizeHeader(h) === 'eliminado');
        const colLetter = colIndex >= 0 ? String.fromCharCode(65 + colIndex) : 'P';

        return this.sheetsService.updateRow(`${this.SHEET_NAME}!${colLetter}${rowNumber}`, [['eliminado']]).pipe(
            tap(() => {
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
