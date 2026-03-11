import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { GoogleSheetsService } from './google-sheets.service';
import { Product } from '../models/product.model';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GoogleAuthService } from './google-auth.service';

@Injectable({
    providedIn: 'root'
})
export class ProductService {
    private sheetsService = inject(GoogleSheetsService);
    private auth = inject(GoogleAuthService);
    private readonly SHEET_NAME = 'Products';

    public products = signal<Product[]>([]);
    public isLoading = signal<boolean>(false);

    constructor() {
        effect(() => {
            if (this.auth.isAuthenticated()) {
                untracked(() => this.loadProducts());
            } else {
                untracked(() => this.products.set([]));
            }
        });
    }

    public loadProducts(): void {
        if (!this.auth.isAuthenticated()) return;
        
        this.isLoading.set(true);
        this.sheetsService.readRange(`${this.SHEET_NAME}!A2:F`).subscribe({
            next: (response) => {
                const rows = response.values || [];
                const parsed: Product[] = rows.map((row: any[], index: number) => ({
                    _rowNumber: index + 2,
                    id: row[0] || '',
                    name: row[1] || '',
                    price: parseFloat(row[2]) || 0,
                    stock: parseInt(row[3]) || 0,
                    sku: row[4] || '',
                    category: row[5] || 'General'
                }));
                this.products.set(parsed);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading products', err);
                this.isLoading.set(false);
            }
        });
    }

    public createProduct(product: Product): Observable<any> {
        product.id = crypto.randomUUID();
        const row = [
            product.id, 
            product.name, 
            product.price, 
            product.stock || 0, 
            product.sku || `SKU-${Date.now().toString().slice(-4)}`, 
            product.category || 'General'
        ];
        return this.sheetsService.appendRow(`${this.SHEET_NAME}!A:F`, [row]).pipe(
            tap(() => this.loadProducts())
        );
    }

    public updateProduct(rowNumber: number, product: Product): Observable<any> {
        const row = [
            product.id, 
            product.name, 
            product.price, 
            product.stock || 0, 
            product.sku || `SKU-${rowNumber}`, 
            product.category || 'General'
        ];
        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${rowNumber}:F${rowNumber}`, [row]).pipe(
            tap(() => this.loadProducts())
        );
    }

    public deleteProduct(rowNumber: number): Observable<any> {
        // To soft delete or empty the row
        return this.sheetsService.clearRange(`${this.SHEET_NAME}!A${rowNumber}:F${rowNumber}`).pipe(
            tap(() => this.loadProducts())
        );
    }
}
