import { Injectable, inject, signal } from '@angular/core';
import { GoogleSheetsService } from './google-sheets.service';
import { Order } from '../models/order.model';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private sheetsService = inject(GoogleSheetsService);
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

    public loadOrders(): void {
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
        // Detect format: If row[0] looks like a date (e.g., contains '-' or '/'), it's the standard sheet format.
        // If row[0] looks like an ID (e.g., starts with 'W'), it's the app-generated format.
        const firstCol = row[0] ? row[0].toString() : '';
        const isDateFirst = firstCol.includes('-') || firstCol.includes('/') || (firstCol.length >= 8 && !isNaN(Date.parse(firstCol)));

        let order: Order;

        if (isDateFirst) {
            // Standard Sheet Format (Date at A, Status at N per user)
            order = {
                _rowNumber: rowNumber,
                date: row[0] || '',
                productQuantity: parseInt(row[1]) || 1,
                productPrice: parseFloat(row[2]) || 0,
                productName: row[3] || '',
                fullName: row[4] || '',
                phone: row[5] || '',
                address1: row[6] || '',
                city: row[7] || '',
                province: row[8] || '',
                status: row[13] || row[9] || '', // User said Col N (13), fallback to J (9)
                notes: row[10] || '',
                shippingCost: parseFloat(row[11]) || 0,
                packaging: parseFloat(row[12]) || 0,
                id: row[14] || `${rowNumber}` // Check if ID is in O or use rowNumber
            };
        } else {
            // App-Generated Format (ID at A, Date at B, Status at K)
            order = {
                _rowNumber: rowNumber,
                id: row[0] || '',
                date: row[1] || '',
                productQuantity: parseInt(row[2]) || 1,
                productPrice: parseFloat(row[3]) || 0,
                productName: row[4] || '',
                fullName: row[5] || '',
                phone: row[6] || '',
                address1: row[7] || '',
                city: row[8] || '',
                province: row[9] || '',
                status: row[10] || '',
                notes: row[11] || '',
                shippingCost: parseFloat(row[12]) || 0,
                packaging: parseFloat(row[13]) || 0
            };
        }

        // Final check: If status is still empty, look in any column for known status strings
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
        return [
            order.date || '',              // A (0)
            order.productQuantity,          // B (1)
            order.productPrice,             // C (2)
            order.productName,              // D (3)
            order.fullName,                 // E (4)
            order.phone,                    // F (5)
            order.address1,                 // G (6)
            order.city,                     // H (7)
            order.province,                 // I (8)
            '',                             // J (9) - Spacer/Reserved
            order.notes || '',              // K (10)
            order.shippingCost || 0,        // L (11)
            order.packaging || 0,           // M (12)
            order.status || '',             // N (13) - Status per user
            order.id || ''                  // O (14) - ID
        ];
    }
}
