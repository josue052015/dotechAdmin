import { Injectable, inject, computed, effect, untracked } from '@angular/core';
import { AbandonedOrder } from '../models/abandoned-order.model';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GoogleAuthService } from './google-auth.service';
import { LargeSheetListService } from './large-sheet-list.service';

@Injectable({
    providedIn: 'root'
})
export class AbandonedOrderService extends LargeSheetListService<AbandonedOrder> {
    private auth = inject(GoogleAuthService);
    
    protected override SHEET_NAME = 'PEDIDOS ABANDONADOS';
    protected override COLUMNS_RANGE = 'A:P';

    public abandonedOrders = computed(() => this.allRecords());
    public activeAbandonedOrders = computed(() => this.allRecords().filter(o => o.isDeleted !== true));
    public isLoading = computed(() => this.listState().isInitialLoading || this.listState().isLoadingMore);
    
    private readonly HEADER_MAP: { [key: string]: keyof AbandonedOrder } = {
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
        'carrier': 'carrier', 'costo de envio': 'shippingCost', 'envio': 'shippingCost',
        'status': 'status', 'estado': 'status',
        'notes': 'notes', 'notas': 'notes',
        'eliminado': 'isDeleted'
    };

    constructor() {
        super();
        effect(() => {
            if (this.auth.isAuthenticated() && !this.isInitialized) {
                untracked(() => this.initLargeList());
            }
        });
    }

    public override initLargeList(): void {
        super.initLargeList();
    }

    public loadAbandonedOrders(quiet: boolean = false): Observable<any> {
        if (!this.auth.isAuthenticated()) return of(null);
        this.initLargeList();
        return of(null);
    }

    protected mapRowsToEntities(rows: any[][], startRow: number): AbandonedOrder[] {
        if (rows.length === 0) return [];
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
                        const value = row[colIndex];
                        order[property as string] = this.parseValue(property as string, value);
                    }
                });
            } else {
                // Fallback mapping based on common order
                const fallbackProps: (keyof AbandonedOrder)[] = [
                    'id', 'date', 'productQuantity', 'productPrice', 'productName', 
                    'fullName', 'phone', 'address1', 'province', 'city', 
                    'packaging', 'carrier', 'shippingCost', 'status', 'notes', 'isDeleted'
                ];
                fallbackProps.forEach((prop, colIndex) => {
                    const value = row[colIndex];
                    order[prop as string] = this.parseValue(prop as string, value);
                });
            }

            order._searchText = `${order.id} ${order.fullName} ${order.phone} ${order.productName}`.toLowerCase();
            return order as AbandonedOrder;
        }).filter(o => this.isValidAbandonedOrder(o));
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

    private isValidAbandonedOrder(order: any): boolean {
        return !!(order.id || order.fullName || order.phone);
    }

    public deleteAbandonedOrder(rowNumber: number): Observable<any> {
        return this.sheetsService.clearRange(`${this.SHEET_NAME}!A${rowNumber}:P${rowNumber}`).pipe(
            tap(() => {
                this.listState.update(s => ({
                    ...s,
                    visibleRows: s.visibleRows.filter(o => o._rowNumber !== rowNumber)
                }));
            })
        );
    }
}
