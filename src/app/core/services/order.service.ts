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
    public orders = signal<Order[]>([], { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
    public activeOrders = signal<Order[]>([], { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) }); // We'll update this in loadOrders
    public isLoading = signal<boolean>(false);
    private nextRowNumber: number = 2; // Default to first data row after header
    
    // Explicit Schema Definition to prevent shifting
    private readonly ORDER_SCHEMA: (keyof Order | 'notes')[] = [
        'id', 'date', 'productQuantity', 'productPrice', 'productName', 
        'fullName', 'phone', 'address1', 'province', 'city', 
        'packaging', 'carrier', 'shippingCost', 'status', 'notes', 'isDeleted'
    ];

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

    public loadOrders(quiet: boolean = false): Observable<any> {
        if (!this.auth.isAuthenticated()) return of(null);
        
        if (!quiet) this.isLoading.set(true);
        return this.sheetsService.readRange(`${this.SHEET_NAME}!A1:P`).pipe(
            tap((response) => {
                const rows = response.values || [];
                if (rows.length > 0) {
                    this.currentHeaders = rows[0];
                    const orders = this.mapRowsToOrders(rows);
                    this.orders.set(orders.reverse());
                    this.activeOrders.set(orders.filter(o => o.isDeleted !== true));
                    this.nextRowNumber = rows.length + 1;
                } else {
                    this.nextRowNumber = 2;
                    this.orders.set([]);
                    this.activeOrders.set([]);
                }
                this.isLoading.set(false);
            }),
            catchError((err: any) => {
                console.error('Error loading orders', err);
                this.isLoading.set(false);
                return of(null);
            })
        );
    }

    private mapRowsToOrders(rows: any[][]): Order[] {
        if (rows.length < 2) return [];
        
        const headerRow = rows[0].map(h => this.normalizeHeader(h));
        const dataRows = rows.slice(1);
        
        return dataRows.map((row, index) => {
            const rowNumber = index + 2;
            const order: any = { _rowNumber: rowNumber };
            
            headerRow.forEach((header, colIndex) => {
                let property = this.HEADER_MAP[header];
                
                // CRITICAL fallback for ID column if header is missing/unrecognized
                if (colIndex === 0 && !property) {
                    property = 'id';
                }
                
                if (property) {
                    const value = row[colIndex];
                    order[property as string] = this.parseValue(property as string, value);
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
        // Set date in requested format: yyyy-dd-mm
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        order.date = `${yyyy}-${mm}-${dd}`;
        
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
        const currentRow = this.nextRowNumber;
        const endCol = String.fromCharCode(64 + row.length);
        
        // Use updateRow with an absolute range (A{row}) to FORCE Column A alignment
        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${currentRow}:${endCol}${currentRow}`, [row]).pipe(
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
        const endCol = String.fromCharCode(64 + row.length);
        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${rowNumber}:${endCol}${rowNumber}`, [row]).pipe(
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
        console.group('Order Data Mapping (A-Column Alignment)');
        console.log('Original Order:', order);
        
        const headerRow = this.currentHeaders.map(h => this.normalizeHeader(h));
        // Use a fixed 16-column base array as per schema (A-P)
        const row: any[] = new Array(this.ORDER_SCHEMA.length).fill('');
        
        this.ORDER_SCHEMA.forEach((prop, schemaIdx) => {
            // Priority 1: Match header position in sheet (if found)
            let targetIdx = headerRow.findIndex(h => this.HEADER_MAP[h] === prop);
            
            // Priority 2: Fallback to strict positional schema index (Column A=0, B=1, etc.)
            if (targetIdx === -1) {
                targetIdx = schemaIdx;
            }
            
            let value = (order as any)[prop];
            // Handle special cases
            if (prop === 'isDeleted') value = value ? 'eliminado' : '';
            
            // Ensure array is large enough for the target index
            if (targetIdx >= row.length) {
                while(row.length <= targetIdx) row.push('');
            }
            
            row[targetIdx] = (value !== undefined && value !== null) ? value : '';
            console.log(`Property [${prop}] -> Column Index ${targetIdx} (${targetIdx === schemaIdx ? 'Strict Position' : 'Header Matched'})`);
        });

        console.log('Final Payload (Starts at A):', row);
        console.groupEnd();
        return row;
    }
}
