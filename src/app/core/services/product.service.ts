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
    private nextRowNumber: number = 2;

    // Strict schema for products (A-G)
    private readonly PRODUCT_SCHEMA: (keyof Product | 'date')[] = [
        'id', 'date', 'name', 'price', 'stock', 'sku', 'category'
    ];

    private currentHeaders: string[] = [];
    private readonly HEADER_MAP: { [key: string]: keyof Product } = {
        '#': 'id',
        'id': 'id',
        'codigo': 'id',
        'name': 'name',
        'nombre': 'name',
        'product': 'name',
        'price': 'price',
        'precio': 'price',
        'stock': 'stock',
        'existencia': 'stock',
        'sku': 'sku',
        'category': 'category',
        'categoria': 'category',
        'categoría': 'category'
    };

    constructor() {
        effect(() => {
            if (this.auth.isAuthorized()) {
                untracked(() => this.loadProducts());
            } else {
                untracked(() => this.products.set([]));
            }
        });
    }

    public loadProducts(): void {
        if (!this.auth.isAuthorized()) return;

        this.isLoading.set(true);
        // Read A1:Z to get headers and sufficient data columns
        this.sheetsService.readRange(`${this.SHEET_NAME}!A1:Z`).subscribe({
            next: (response) => {
                const rows = response.values || [];
                if (rows.length > 0) {
                    this.currentHeaders = rows[0];
                    const headerRow = this.currentHeaders.map(h => this.normalizeHeader(h));
                    const dataRows = rows.slice(1);

                    const parsed: Product[] = dataRows
                        .map((row: any[], index: number) => {
                            const rowNumber = index + 2;
                            const product: any = { _rowNumber: rowNumber };

                            headerRow.forEach((header, colIndex) => {
                                let property = this.HEADER_MAP[header];
                                if (colIndex === 0 && !property) property = 'id';

                                if (property) {
                                    const value = row[colIndex];
                                    product[property as string] = this.parseValue(property as string, value);
                                }
                            });

                            return product as Product;
                        })
                        .filter((p: Product) => p.id || p.name);

                    this.products.set(parsed);
                    // Tracking next available row
                    this.nextRowNumber = rows.length + 1;
                } else {
                    this.nextRowNumber = 2;
                    this.products.set([]);
                }
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading products', err);
                this.isLoading.set(false);
            }
        });
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

        if (property === 'price') {
            const num = parseFloat(sValue.replace(/[^0-9.-]/g, ""));
            return isNaN(num) ? 0 : num;
        }
        if (property === 'stock') {
            return parseInt(sValue.replace(/[^0-9]/g, '')) || 0;
        }

        return sValue;
    }

    public createProduct(product: Product): Observable<any> {
        // Generate sequential ID starting with 'W'
        const wProducts = this.products().filter(p => {
            const idStr = (p.id || '').toString().toLowerCase();
            return idStr.includes('w');
        });
        let nextNumber = 1;
        if (wProducts.length > 0) {
            const numbers = wProducts.map(p => {
                const idStr = p.id?.toString() || '';
                const match = idStr.match(/\d+/);
                return match ? parseInt(match[0], 10) : 0;
            }).filter(n => !isNaN(n));

            if (numbers.length > 0) {
                nextNumber = Math.max(...numbers) + 1;
            }
        }
        product.id = `W${nextNumber.toString().padStart(5, '0')}`;
        
        // Add date in requested format: yyyy-dd-mm
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        (product as any).date = `${yyyy}-${mm}-${dd}`;

        const row = this.mapProductToRow(product);
        const currentRow = this.nextRowNumber;
        const endCol = String.fromCharCode(64 + row.length);
        
        // Use updateRow with an absolute range (A{row}) to FORCE Column A alignment
        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${currentRow}:${endCol}${currentRow}`, [row]).pipe(
            tap(() => this.loadProducts())
        );
    }

    public updateProduct(rowNumber: number, product: Product): Observable<any> {
        const row = this.mapProductToRow(product);
        const endCol = String.fromCharCode(64 + row.length);
        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${rowNumber}:${endCol}${rowNumber}`, [row]).pipe(
            tap(() => this.loadProducts())
        );
    }

    private mapProductToRow(product: Product): any[] {
        console.group('Product Data Mapping (A-Column Alignment)');
        console.log('Original Product:', product);

        const headerRow = this.currentHeaders.map(h => this.normalizeHeader(h));
        // Use a fixed array based on PRODUCT_SCHEMA length (A-G)
        const row: any[] = new Array(this.PRODUCT_SCHEMA.length).fill('');
        
        this.PRODUCT_SCHEMA.forEach((prop, schemaIdx) => {
            // Priority 1: Match header position in sheet (if found)
            let targetIdx = headerRow.findIndex(h => this.HEADER_MAP[h] === prop);
            
            // Priority 2: Fallback to schema index (A=0, B=1, etc.)
            if (targetIdx === -1) {
                targetIdx = schemaIdx;
            }
            
            const value = (product as any)[prop];
            
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

    public deleteProduct(rowNumber: number): Observable<any> {
        // To soft delete or empty the row
        return this.sheetsService.clearRange(`${this.SHEET_NAME}!A${rowNumber}:F${rowNumber}`).pipe(
            tap(() => this.loadProducts())
        );
    }
}
