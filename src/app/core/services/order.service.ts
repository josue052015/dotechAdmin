import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { GoogleSheetsService } from './google-sheets.service';
import { Order } from '../models/order.model';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, of, throwError } from 'rxjs';
import { GoogleAuthService } from './google-auth.service';

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private sheetsService = inject(GoogleSheetsService);
    private auth = inject(GoogleAuthService);
    private readonly SHEET_NAME = 'ORDENES';

    // State
    public orders = signal<Order[]>([]);
    public activeOrders = signal<Order[]>([]); // We'll update this in loadOrders
    public isLoading = signal<boolean>(false);

    private currentHeaders: string[] = [];
    private readonly HEADER_MAP: { [key: string]: keyof Order } = {
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
        'envio registrado en paquetera': 'carrier',
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
                untracked(() => this.loadOrders());
            } else {
                untracked(() => this.orders.set([]));
            }
        });
    }

    public loadOrders(quiet: boolean = false): void {
        if (!this.auth.isAuthenticated()) return;
        
        if (!quiet) this.isLoading.set(true);
        // Start from A1 to get headers. Increased range to P for soft delete column.
        this.sheetsService.readRange(`${this.SHEET_NAME}!A1:P`).subscribe({
            next: (response) => {
                const rows = response.values || [];
                if (rows.length > 0) {
                    this.currentHeaders = rows[0];
                    const orders = this.mapRowsToOrders(rows);
                    this.orders.set(orders.reverse());
                    this.activeOrders.set(orders.filter(o => o.isDeleted !== true));
                } else {
                    this.orders.set([]);
                    this.activeOrders.set([]);
                }
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading orders', err);
                this.isLoading.set(false);
            }
        });
    }

    private mapRowsToOrders(rows: any[][]): Order[] {
        if (rows.length < 2) return [];
        
        const headerRow = rows[0].map(h => this.normalizeHeader(h));
        const dataRows = rows.slice(1);
        
        return dataRows.map((row, index) => {
            const rowNumber = index + 2;
            const order: any = { _rowNumber: rowNumber };
            
            headerRow.forEach((header, colIndex) => {
                let property = this.HEADER_MAP[header] || header;
                
                // CRITICAL: If this is the first column and header is empty or unrecognized, force map to 'id'
                if (colIndex === 0 && (!property || property === '')) {
                    property = 'id';
                }
                
                const value = row[colIndex];
                
                if (property && typeof property === 'string') {
                    order[property] = this.parseValue(property, value);
                }
            });
            
            return order as Order;
        }).filter(o => this.isValidOrder(o));
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

    private isValidOrder(order: any): boolean {
        // Basic validation: must have at least Phone, Product, or Name to be valid
        // Also ensure it's not a header row or empty row
        return !!(
            (order.phone && order.phone.toString().length > 3) || 
            (order.productName && order.productName.toString().length > 1) ||
            (order.fullName && order.fullName.toString().length > 1)
        ) && order.fullName !== 'NOMBRE';
    }

    public createOrder(order: Order): Observable<any> {
        order.date = new Date().toISOString().split('T')[0];
        order.isDeleted = false;

        // Generate sequential ID starting with 'W'
        // More robust detection: look for any ID containing 'w' (case-insensitive)
        const allOrders = this.orders();
        const wOrders = allOrders.filter(o => {
            const idStr = (o.id || '').toString().toLowerCase();
            return idStr.includes('w');
        });
        
        let nextNumber = 1;
        if (wOrders.length > 0) {
            const numbers = wOrders.map(o => {
                const idStr = o.id?.toString() || '';
                // Extract only digits from the ID string (handles #w00105 or W00105)
                const match = idStr.match(/\d+/);
                return match ? parseInt(match[0], 10) : 0;
            }).filter(n => !isNaN(n));

            if (numbers.length > 0) {
                nextNumber = Math.max(...numbers) + 1;
            }
        }
        
        // Generate NEW ID with 5-digit padding as requested (WXXXXX)
        order.id = `W${nextNumber.toString().padStart(5, '0')}`;

        const row = this.mapOrderToRow(order);
        return this.sheetsService.appendRow(`${this.SHEET_NAME}!A:O`, [row]).pipe(
            tap(() => this.loadOrders())
        );
    }

    public updateOrder(rowNumber: number, order: Order): Observable<any> {
        // Optimistic UI update
        const currentOrders = this.orders();
        const index = currentOrders.findIndex(o => o['_rowNumber'] === rowNumber);
        if (index !== -1) {
            const updatedOrders = [...currentOrders];
            updatedOrders[index] = { ...order };
            this.orders.set(updatedOrders);
        }

        const row = this.mapOrderToRow(order);
        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${rowNumber}:O${rowNumber}`, [row]).pipe(
            tap(() => this.loadOrders(true))
        );
    }

    public deleteOrder(rowNumber: number): Observable<any> {
        // Optimistic UI update
        const currentOrders = this.orders();
        this.orders.set(currentOrders.filter(o => o['_rowNumber'] !== rowNumber));

        // Find the "eliminado" column index
        const colIndex = this.currentHeaders.findIndex(h => this.normalizeHeader(h) === 'eliminado');
        const colLetter = colIndex >= 0 ? String.fromCharCode(65 + colIndex) : 'P'; // Fallback to P

        return this.sheetsService.updateRow(`${this.SHEET_NAME}!${colLetter}${rowNumber}`, [['eliminado']]).pipe(
            tap(() => this.loadOrders(true))
        );
    }

    private mapOrderToRow(order: Order): any[] {
        if (this.currentHeaders.length === 0) {
            return [
                order.id || '', order.date || '', order.productQuantity || 1,
                order.productPrice || 0, order.productName || '', order.fullName || '',
                order.phone || '', order.address1 || '', order.province || '',
                order.city || '', order.packaging || '', order.carrier || 'envio local',
                order.shippingCost || 0, order.status || '', order['notes'] || ''
            ];
        }

        return this.currentHeaders.map((header, index) => {
            const normalized = this.normalizeHeader(header);
            let property = this.HEADER_MAP[normalized] || normalized;
            
            // CRITICAL: Mirror mapRowsToOrders logic to force first column to 'id'
            if (index === 0 && (!property || property === '')) {
                property = 'id';
            }
            
            let value = (order as any)[property];
            
            if (property === 'isDeleted') {
                value = order['isDeleted'] === true ? 'eliminado' : '';
            }
            
            return value !== undefined && value !== null ? value : '';
        });
    }
}
