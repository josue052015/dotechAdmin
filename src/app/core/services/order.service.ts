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
    public isLoading = signal<boolean>(false);

    // Define column mapping (assuming standard order for rows)
    // Date, Product Quantity, Product Price, Product Name, Full Name, Phone, Address 1, Province, City, Status, Notes, Shipping Cost, Packaging
    private readonly COLUMNS = [
        'Date', 'Product Quantity', 'Product Price', 'Product Name', 'Full Name',
        'Phone', 'Address 1', 'Province', 'City', 'Status', 'Notes', 'Shipping Cost', 'Packaging', 'ID'
    ];

    constructor() {
        effect(() => {
            if (this.auth.isAuthenticated()) {
                untracked(() => this.loadOrders());
            } else {
                untracked(() => this.orders.set([]));
            }
        });
    }

    public loadOrders(): void {
        if (!this.auth.isAuthenticated()) return;
        
        this.isLoading.set(true);
        this.sheetsService.readRange(`${this.SHEET_NAME}!A2:O`).subscribe({
            next: (response) => {
                const rows = response.values || [];
                const parsedOrders: Order[] = rows.map((row: any[], index: number) => this.mapRowToOrder(row, index + 2));
                this.orders.set(parsedOrders.reverse());
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading orders', err);
                this.isLoading.set(false);
            }
        });
    }

    public createOrder(order: Order): Observable<any> {
        order.date = new Date().toISOString().split('T')[0];

        // Generate sequential ID starting with 'w'
        const wOrders = this.orders().filter(o => o.id && /w/i.test(o.id.toString()));
        let nextNumber = 1;
        if (wOrders.length > 0) {
            const numbers = wOrders.map(o => {
                const idStr = o.id?.toString() || '';
                const match = idStr.match(/\d+/g);
                return match ? parseInt(match[match.length - 1], 10) : 0;
            }).filter(n => n > 0);

            if (numbers.length > 0) {
                nextNumber = Math.max(...numbers) + 1;
            }
        }
        order.id = `W${nextNumber.toString().padStart(5, '0')}`;

        const row = this.mapOrderToRow(order);
        return this.sheetsService.appendRow(`${this.SHEET_NAME}!A:O`, [row]).pipe(
            tap(() => this.loadOrders()) // Reload to get fresh data
        );
    }

    public updateOrder(rowNumber: number, order: Order): Observable<any> {
        const row = this.mapOrderToRow(order);
        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${rowNumber}:O${rowNumber}`, [row]).pipe(
            tap(() => this.loadOrders())
        );
    }

    private mapRowToOrder(row: any[], rowNumber: number): Order {
        // Assume format based on sheet headers:
        // A(0): ID, B(1): Date, C(2): Qty, D(3): Price, E(4): Product Name,
        // F(5): Full Name, G(6): Phone, H(7): Address 1, I(8): Province, J(9): City,
        // K(10): empacado, L(11): Envio registrado, M(12): Costo de envio, N(13): Status, O(14): Notes
        
        let order: Order = {
            _rowNumber: rowNumber,
            id: row[0] || '',
            date: row[1] || '',
            productQuantity: parseInt(row[2]) || 1,
            productPrice: parseFloat(row[3]) || 0,
            productName: row[4] || '',
            fullName: row[5] || '',
            phone: row[6] || '',
            address1: row[7] || '',
            province: row[8] || '',
            city: row[9] || '',
            packaging: parseFloat(row[10]) || 0,
            carrier: row[11] ? row[11].toLowerCase().trim() : 'envio local',
            shippingCost: parseFloat(row[12]) || 0,
            status: row[13] || '',
            notes: row[14] || ''
        };

        // Fallback for older rows that might have date first
        const firstCol = row[0] ? row[0].toString() : '';
        const isDateFirst = firstCol.includes('-') || firstCol.includes('/') || (firstCol.length >= 8 && !isNaN(Date.parse(firstCol)));

        if (isDateFirst) {
            order = {
                ...order,
                date: row[0] || '',
                productQuantity: parseInt(row[1]) || 1,
                productPrice: parseFloat(row[2]) || 0,
                productName: row[3] || '',
                fullName: row[4] || '',
                phone: row[5] || '',
                address1: row[6] || '',
                province: row[7] || '',
                city: row[8] || '',
                status: row[13] || row[9] || '',
                notes: row[10] || '',
                carrier: row[11] ? row[11].toLowerCase().trim() : 'envio local',
                shippingCost: parseFloat(row[12]) || 0,
                packaging: parseFloat(row[13]) || 0,
                id: row[14] || `${rowNumber}`
            };
        }

        // Final check for status based on known strings
        if (!order.status) {
            const knownStatuses = [
                'confirmado', 'pendiente', 'no confirmado', 'cancelado', 'desaparecido',
                'empacado', 'envio', 'entregado', 'recibido', 'ubicacion', 'ubicación', 'dinero'
            ];
            for (const val of row) {
                if (val && typeof val === 'string') {
                    const normalized = val.toLowerCase();
                    if (knownStatuses.some(ks => normalized.includes(ks))) {
                        order.status = val;
                        break;
                    }
                }
            }
        }

        return order;
    }

    private mapOrderToRow(order: Order): any[] {
        // Mapping exactly to A - O (0 - 14)
        return [
            order.id || '',                 // A (0) - ID
            order.date || '',               // B (1) - Date
            order.productQuantity || 1,     // C (2) - Product Quantity
            order.productPrice || 0,        // D (3) - Product Price
            order.productName || '',        // E (4) - Product Name
            order.fullName || '',           // F (5) - Full Name
            order.phone || '',              // G (6) - Phone
            order.address1 || '',           // H (7) - Address 1
            order.province || '',           // I (8) - Province
            order.city || '',               // J (9) - City
            order.packaging || '',          // K (10) - empacado
            order.carrier || 'envio local', // L (11) - Envio registrado en paqueteria
            order.shippingCost || 0,        // M (12) - Costo de envio
            order.status || '',             // N (13) - Status
            order.notes || ''               // O (14) - Notes
        ];
    }
}
