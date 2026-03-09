import { Injectable, inject, signal } from '@angular/core';
import { GoogleSheetsService } from './google-sheets.service';
import { Product } from '../models/product.model';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class ProductService {
    private sheetsService = inject(GoogleSheetsService);
    private readonly SHEET_NAME = 'Products';

    public products = signal<Product[]>([]);
    public isLoading = signal<boolean>(false);

    public loadProducts(): void {
        this.isLoading.set(true);
        this.sheetsService.readRange(`${this.SHEET_NAME}!A2:C`).subscribe({
            next: (response) => {
                const rows = response.values || [];
                const parsed: Product[] = rows.map((row: any[], index: number) => ({
                    _rowNumber: index + 2,
                    id: row[0] || '',
                    name: row[1] || '',
                    price: parseFloat(row[2]) || 0
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
        const row = [product.id, product.name, product.price];
        return this.sheetsService.appendRow(`${this.SHEET_NAME}!A:C`, [row]).pipe(
            tap(() => this.loadProducts())
        );
    }

    public updateProduct(rowNumber: number, product: Product): Observable<any> {
        const row = [product.id, product.name, product.price];
        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${rowNumber}:C${rowNumber}`, [row]).pipe(
            tap(() => this.loadProducts())
        );
    }

    public deleteProduct(rowNumber: number): Observable<any> {
        // To soft delete or empty the row
        return this.sheetsService.clearRange(`${this.SHEET_NAME}!A${rowNumber}:C${rowNumber}`).pipe(
            tap(() => this.loadProducts())
        );
    }
}
