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
        this.sheetsService.readRange(`${this.SHEET_NAME}!A2:N`).subscribe({
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
        return this.sheetsService.appendRow(`${this.SHEET_NAME}!A:N`, [row]).pipe(
            tap(() => this.loadOrders()) // Reload to get fresh data
        );
    }

    public updateOrder(rowNumber: number, order: Order): Observable<any> {
        const row = this.mapOrderToRow(order);
        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${rowNumber}:N${rowNumber}`, [row]).pipe(
            tap(() => this.loadOrders())
        );
    }

    private mapRowToOrder(row: any[], rowNumber: number): Order {
        return {
            _rowNumber: rowNumber,
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
            packaging: parseFloat(row[13]) || 0,
            id: row[0] || ''
        };
    }

    private mapOrderToRow(order: Order): any[] {
        return [
            order.id || '',
            order.date || '',
            order.productQuantity,
            order.productPrice,
            order.productName,
            order.fullName,
            order.phone,
            order.address1,
            order.city,
            order.province,
            order.status,
            order.notes,
            order.shippingCost || 0,
            order.packaging || 0
        ];
    }
}
