import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { GoogleSheetsService } from './google-sheets.service';
import { AbandonedOrder } from '../models/abandoned-order.model';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GoogleAuthService } from './google-auth.service';

@Injectable({
    providedIn: 'root'
})
export class AbandonedOrderService {
    private sheetsService = inject(GoogleSheetsService);
    private auth = inject(GoogleAuthService);
    private readonly SHEET_NAME = 'PEDIDOS ABANDONADOS';

    // State
    public abandonedOrders = signal<AbandonedOrder[]>([], { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
    public activeAbandonedOrders = signal<AbandonedOrder[]>([], { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
    public isLoading = signal<boolean>(false);
    
    // Using a similar robust mapping schema to avoid shift issues logic
    private currentHeaders: string[] = [];
    private readonly HEADER_MAP: { [key: string]: keyof AbandonedOrder } = {
        '#': 'id',
        'id': 'id',
        'date': 'date',
        'fecha': 'date',
        'product quantity': 'productQuantity',
        'cantidad': 'productQuantity',
        'product price': 'productPrice',
        'precio': 'productPrice',
        'product name': 'productName',
        'producto': 'productName',
        'full name': 'fullName',
        'nombre': 'fullName',
        'phone': 'phone',
        'telefono': 'phone',
        'teléfono': 'phone',
        'address 1': 'address1',
        'direccion': 'address1',
        'dirección': 'address1',
        'province': 'province',
        'provincia': 'province',
        'city': 'city',
        'ciudad': 'city',
        'empacado': 'packaging',
        'envio registrado': 'carrier',
        'carrier': 'carrier',
        'costo de envio': 'shippingCost',
        'envio': 'shippingCost',
        'status': 'status',
        'estado': 'status',
        'notes': 'notes',
        'notas': 'notes',
        'eliminado': 'isDeleted'
    };

    constructor() {
        effect(() => {
            if (this.auth.isAuthorized()) {
                untracked(() => this.loadAbandonedOrders());
            } else {
                untracked(() => this.abandonedOrders.set([]));
            }
        });
    }

    public loadAbandonedOrders(quiet: boolean = false): void {
        if (!this.auth.isAuthenticated()) return;
        
        if (!quiet) this.isLoading.set(true);
        // Range A1:P is usually enough based on the order mapping
        this.sheetsService.readRange(`${this.SHEET_NAME}!A1:P`).subscribe({
            next: (response) => {
                const rows = response.values || [];
                if (rows.length > 0) {
                    this.currentHeaders = rows[0];
                    const orders = this.mapRowsToAbandonedOrders(rows);
                    this.abandonedOrders.set(orders.reverse());
                    this.activeAbandonedOrders.set(orders.filter(o => o.isDeleted !== true));
                } else {
                    this.abandonedOrders.set([]);
                    this.activeAbandonedOrders.set([]);
                }
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading abandoned orders', err);
                this.isLoading.set(false);
            }
        });
    }

    private mapRowsToAbandonedOrders(rows: any[][]): AbandonedOrder[] {
        if (rows.length < 2) return [];
        
        const headerRow = rows[0].map(h => this.normalizeHeader(h));
        const dataRows = rows.slice(1);
        
        return dataRows.map((row, index) => {
            const rowNumber = index + 2;
            const order: any = { _rowNumber: rowNumber };
            
            headerRow.forEach((header, colIndex) => {
                let property = this.HEADER_MAP[header];
                
                // Fallback for ID col
                if (colIndex === 0 && !property) {
                    property = 'id';
                }
                
                if (property) {
                    const value = row[colIndex];
                    order[property as string] = this.parseValue(property as string, value);
                }
            });
            
            return order as AbandonedOrder;
        }).filter(o => this.isValidAbandonedOrder(o));
    }

    private normalizeHeader(header: any): string {
        return (header || '')
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
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
        // Keep similar validation as main sheet
        return !!(
            (order.phone && order.phone.toString().length > 3) || 
            (order.productName && order.productName.toString().length > 1) ||
            (order.fullName && order.fullName.toString().length > 1)
        ) && order.fullName !== 'NOMBRE';
    }

    public deleteAbandonedOrder(rowNumber: number): Observable<any> {
        // Optimistic UI update
        const currentOrders = this.abandonedOrders();
        this.abandonedOrders.set(currentOrders.filter(o => o['_rowNumber'] !== rowNumber));
        this.activeAbandonedOrders.set(this.activeAbandonedOrders().filter(o => o['_rowNumber'] !== rowNumber));

        // Use clear range to actually remove it or flag it as eliminado if preferred, 
        // however for Abandoned pipelines it's usually better to just clear or flag.
        // The problem description says "eliminar el registro original". We'll clear the row.
        return this.sheetsService.clearRange(`${this.SHEET_NAME}!A${rowNumber}:P${rowNumber}`).pipe(
            tap(() => this.loadAbandonedOrders(true))
        );
    }
}
