import { Injectable, inject, computed, effect, untracked } from '@angular/core';
import { Product } from '../models/product.model';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GoogleAuthService } from './google-auth.service';
import { LargeSheetListService } from './large-sheet-list.service';

@Injectable({
    providedIn: 'root'
})
export class ProductService extends LargeSheetListService<Product> {
    private auth = inject(GoogleAuthService);
    
    protected override SHEET_NAME = 'Products';
    protected override COLUMNS_RANGE = 'A:G';

    public products = computed(() => this.allRecords());
    public isLoading = computed(() => this.listState().isInitialLoading || this.listState().isLoadingMore);
    
    private readonly PRODUCT_SCHEMA: (keyof Product | 'date')[] = [
        'id', 'date', 'name', 'price', 'stock', 'sku', 'category'
    ];

    private readonly HEADER_MAP: { [key: string]: keyof Product } = {
        '#': 'id', 'id': 'id', 'codigo': 'id',
        'name': 'name', 'nombre': 'name', 'product': 'name',
        'price': 'price', 'precio': 'price',
        'stock': 'stock', 'existencia': 'stock',
        'sku': 'sku',
        'category': 'category', 'categoria': 'category', 'categoría': 'category'
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

    public loadProducts(quiet: boolean = false): Observable<any> {
        if (!this.auth.isAuthorized()) return of(null);
        this.initLargeList();
        return of(null);
    }

    protected mapRowsToEntities(rows: any[][], startRow: number): Product[] {
        if (rows.length === 0) return [];
        const headerRow = this.currentHeaders.map(h => this.normalizeHeader(h));
        
        return rows.map((row, index) => {
            const rowNumber = startRow + index;
            const product: any = { _rowNumber: rowNumber };
            
            headerRow.forEach((header, colIndex) => {
                let property = this.HEADER_MAP[header];
                if (colIndex === 0 && !property) property = 'id';
                if (property) {
                    const value = row[colIndex];
                    product[property as string] = this.parseValue(property as string, value);
                }
            });

            product._searchText = `${product.id} ${product.name} ${product.sku} ${product.category}`.toLowerCase();
            return product as Product;
        }).filter(p => p.id || p.name);
    }

    private normalizeHeader(header: any): string {
        return (header || '').toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    }

    private parseValue(property: string, value: any): any {
        if (value === undefined || value === null) return '';
        const sValue = value.toString().trim();
        if (!sValue) return '';
        if (property === 'price') {
            const num = parseFloat(sValue.replace(/[^0-9.-]/g, ""));
            return isNaN(num) ? 0 : num;
        }
        if (property === 'stock') return parseInt(sValue.replace(/[^0-9]/g, '')) || 0;
        return sValue;
    }

    public createProduct(product: Product): Observable<any> {
        const allProducts = this.allRecords();
        const wProducts = allProducts.filter(p => (p.id || '').toString().toLowerCase().includes('w'));
        let nextNumber = 1;
        if (wProducts.length > 0) {
            const numbers = wProducts.map(p => {
                const match = (p.id?.toString() || '').match(/\d+/);
                return match ? parseInt(match[0], 10) : 0;
            });
            nextNumber = Math.max(...numbers) + 1;
        }
        product.id = `W${nextNumber.toString().padStart(5, '0')}`;
        
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        (product as any).date = `${yyyy}-${dd}-${mm}`;

        const row = this.mapProductToRow(product);
        const currentRow = this.allRecords().length + 2;

        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${currentRow}:${String.fromCharCode(64 + row.length)}${currentRow}`, [row]).pipe(
            tap(() => {
                const mapped = { ...product, _rowNumber: currentRow };
                this.listState.update(s => ({
                    ...s,
                    visibleRows: [mapped, ...s.visibleRows],
                    totalLoaded: s.totalLoaded + 1
                }));
            })
        );
    }

    public updateProduct(rowNumber: number, product: Product): Observable<any> {
        const row = this.mapProductToRow(product);
        const endCol = String.fromCharCode(64 + row.length);
        return this.sheetsService.updateRow(`${this.SHEET_NAME}!A${rowNumber}:${endCol}${rowNumber}`, [row]).pipe(
            tap(() => {
                this.listState.update(s => {
                    const idx = s.visibleRows.findIndex(p => p._rowNumber === rowNumber);
                    if (idx !== -1) {
                        const updated = [...s.visibleRows];
                        updated[idx] = { ...product, _rowNumber: rowNumber };
                        return { ...s, visibleRows: updated };
                    }
                    return s;
                });
            })
        );
    }

    public deleteProduct(rowNumber: number): Observable<any> {
        return this.sheetsService.clearRange(`${this.SHEET_NAME}!A${rowNumber}:G${rowNumber}`).pipe(
            tap(() => {
                this.listState.update(s => ({
                    ...s,
                    visibleRows: s.visibleRows.filter(p => p._rowNumber !== rowNumber)
                }));
            })
        );
    }

    private mapProductToRow(product: Product): any[] {
        const headerRow = this.currentHeaders.map(h => this.normalizeHeader(h));
        const row: any[] = new Array(this.PRODUCT_SCHEMA.length).fill('');
        this.PRODUCT_SCHEMA.forEach((prop, schemaIdx) => {
            let targetIdx = headerRow.findIndex(h => this.HEADER_MAP[h] === prop);
            if (targetIdx === -1) targetIdx = schemaIdx;
            const value = (product as any)[prop];
            if (targetIdx >= row.length) while(row.length <= targetIdx) row.push('');
            row[targetIdx] = (value !== undefined && value !== null) ? value : '';
        });
        return row;
    }
}
