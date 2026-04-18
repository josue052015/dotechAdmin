import { Component, OnInit, inject, ViewChild, effect, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ExportSelectorDialogComponent } from '../../../shared/components/export-selector-dialog/export-selector-dialog.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatTableModule,
    MatPaginatorModule, MatSortModule, LucideAngularModule, MatProgressSpinnerModule,
    MatDialogModule
  ],
  template: `
    <div class="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      <!-- Header Area -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div class="space-y-1">
          <h1 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Product Inventory</h1>
          <p class="text-sm text-slate-500 font-medium">Manage your catalog, pricing, and stock levels.</p>
        </div>
        
        <div class="flex items-center space-x-3 w-full sm:w-auto">
           <div class="relative flex-1 sm:w-64 lg:w-80 group">
              <lucide-icon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 md:w-5 md:h-5 group-focus-within:text-primary transition-colors"></lucide-icon>
              <input type="text" (keyup)="applyFilter($event)" 
                     placeholder="Search products..." 
                     class="input-stitch pl-12 md:pl-14 h-11 md:h-12 text-xs md:text-sm">
           </div>
           
           <button (click)="openExportDialog()" 
                   class="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 md:p-3 rounded-xl shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all active:scale-95 flex items-center justify-center h-11 md:h-12"
                   title="Export to Excel">
              <lucide-icon name="file-spreadsheet" class="w-5 h-5 md:w-6 md:h-6"></lucide-icon>
           </button>
           
           <button (click)="openForm()" class="h-11 md:h-12 bg-primary hover:bg-blue-700 text-white px-4 md:px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center space-x-2 text-xs md:text-sm font-bold">
              <lucide-icon name="plus" class="w-4 h-4 md:w-5 md:h-5"></lucide-icon>
              <span class="hidden xs:inline">Add Product</span>
              <span class="xs:hidden">Add</span>
           </button>
        </div>
      </div>

      <!-- Quick Stats Row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
         <ng-container *ngIf="productService.isLoading()">
            <div *ngFor="let i of [1,2,3]" class="card-stitch p-4 md:p-6 h-28 skeleton"></div>
         </ng-container>

         <ng-container *ngIf="!productService.isLoading()">
            <!-- Total Products -->
            <div class="card-stitch p-4 md:p-6 flex items-center space-x-4 md:space-x-5 group hover:border-blue-200 transition-all">
               <div class="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-sm">
                  <lucide-icon name="package" class="w-5 h-5 md:w-6 md:h-6"></lucide-icon>
               </div>
               <div class="flex-1">
                  <span class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Products</span>
                  <p class="text-xl md:text-2xl font-black text-slate-900 mt-0.5">{{ dataSource.data.length | number }}</p>
               </div>
            </div>

            <!-- Low Stock -->
            <div class="card-stitch p-4 md:p-6 flex items-center space-x-4 md:space-x-5 group hover:border-amber-200 transition-all">
               <div class="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-warning/20 flex items-center justify-center text-warning-text group-hover:scale-110 transition-transform shadow-sm">
                  <lucide-icon name="alert-circle" class="w-5 h-5 md:w-6 md:h-6"></lucide-icon>
               </div>
               <div class="flex-1">
                  <span class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock</span>
                  <p class="text-xl md:text-2xl font-black text-slate-900 mt-0.5">{{ lowStockCount }}</p>
                  <div class="flex items-center space-x-1 mt-0.5 text-warning-text">
                     <lucide-icon name="alert-circle" class="w-2.5 h-2.5"></lucide-icon>
                     <span class="text-[9px] font-bold uppercase tracking-tight">Attention</span>
                  </div>
               </div>
            </div>

            <!-- Out of Stock -->
            <div class="card-stitch p-4 md:p-6 flex items-center space-x-4 md:space-x-5 group hover:border-red-200 transition-all sm:col-span-2 lg:col-span-1">
               <div class="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-danger/20 flex items-center justify-center text-danger-text group-hover:scale-110 transition-transform shadow-sm">
                  <lucide-icon name="x-circle" class="w-5 h-5 md:w-6 md:h-6"></lucide-icon>
               </div>
               <div class="flex-1">
                  <span class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Out of Stock</span>
                  <p class="text-xl md:text-2xl font-black text-slate-900 mt-0.5">{{ outOfStockCount }}</p>
                  <div class="flex items-center space-x-1 mt-0.5 text-danger-text">
                     <lucide-icon name="x-circle" class="w-2.5 h-2.5"></lucide-icon>
                     <span class="text-[9px] font-bold uppercase tracking-tight">Urgent</span>
                  </div>
               </div>
            </div>
         </ng-container>
      </div>

      <!-- Add/Edit Form Overlay -->
      <div *ngIf="showForm" class="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6 animate-in fade-in zoom-in-95 duration-200">
         <div class="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
             <div class="p-5 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div>
                  <h2 class="text-lg md:text-xl font-black text-slate-900 tracking-tight uppercase tracking-wider">{{ isEditing ? 'Edit Product' : 'New Product' }}</h2>
                  <p class="text-[11px] md:text-sm text-text-muted font-medium">Configure product details and pricing</p>
               </div>
               <button (click)="closeForm()" class="text-text-muted hover:text-danger p-2 rounded-xl hover:bg-danger/5 transition-all">
                  <lucide-icon name="x" class="w-5 h-5"></lucide-icon>
               </button>
            </div>
            <form [formGroup]="productForm" (ngSubmit)="saveProduct()" class="p-5 md:p-8 space-y-6">
               <div class="space-y-2">
                  <label class="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Product Name</label>
                  <input type="text" formControlName="name" placeholder="e.g. Wireless Headphones" 
                         class="input-stitch h-11 md:h-12 text-sm">
               </div>
               <div class="grid grid-cols-2 gap-4 md:gap-6">
                  <div class="space-y-2">
                     <label class="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Price (RD$)</label>
                     <input type="number" formControlName="price" placeholder="0.00" 
                            class="input-stitch h-11 md:h-12 text-sm">
                  </div>
                  <div class="space-y-2">
                     <label class="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Stock Units</label>
                     <input type="number" formControlName="stock" placeholder="0" 
                            class="input-stitch h-11 md:h-12 text-sm">
                  </div>
               </div>
               <div class="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-50 mt-8">
                  <button type="button" (click)="closeForm()" class="order-2 sm:order-1 px-6 py-2.5 rounded-xl border border-border text-slate-600 font-bold text-sm bg-white hover:bg-slate-50 transition-all active:scale-95">Cancel</button>
                  <button type="submit" [disabled]="productForm.invalid || isSaving" 
                          class="order-1 sm:order-2 bg-primary hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all active:scale-95 text-sm font-bold flex items-center justify-center space-x-2">
                     <mat-spinner diameter="16" strokeWidth="2.5" class="mr-2" *ngIf="isSaving"></mat-spinner>
                     <span>{{ isEditing ? 'Update Product' : 'Save Product' }}</span>
                  </button>
               </div>
            </form>
         </div>
      </div>

      <!-- Main Table Container -->
      <div class="card-stitch bg-white overflow-hidden min-h-[500px] flex flex-col">
        <div class="relative flex-1 overflow-auto custom-scrollbar">
          <!-- Desktop Table Skeleton (md+) -->
          <div *ngIf="productService.isLoading()" class="hidden md:block">
            <table class="table-stitch">
              <thead>
                <tr>
                  <th class="w-1/3">Product</th>
                  <th class="text-center">Category</th>
                  <th class="text-right">Price</th>
                  <th class="text-center">Stock</th>
                  <th class="text-center">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let i of [1,2,3,4,5,6,7,8]">
                  <td>
                    <div class="flex items-center space-x-5">
                       <div class="w-12 h-12 rounded-xl skeleton"></div>
                       <div class="space-y-2 flex-1">
                          <div class="h-4 w-3/4 rounded skeleton"></div>
                          <div class="h-3 w-1/4 rounded skeleton"></div>
                       </div>
                    </div>
                  </td>
                  <td><div class="h-5 w-20 mx-auto rounded skeleton"></div></td>
                  <td><div class="h-5 w-24 ml-auto rounded skeleton"></div></td>
                  <td><div class="h-5 w-16 mx-auto rounded skeleton"></div></td>
                  <td><div class="h-8 w-24 mx-auto rounded-full skeleton"></div></td>
                  <td><div class="w-8 h-8 rounded-lg skeleton"></div></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Card Skeleton (<md) -->
          <div *ngIf="productService.isLoading()" class="md:hidden flex flex-col gap-4 p-4">
             <div *ngFor="let i of [1,2,3,4]" class="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
                <div class="flex items-center space-x-4">
                   <div class="w-14 h-14 rounded-xl skeleton"></div>
                   <div class="flex-1 space-y-2">
                      <div class="h-4 w-3/4 rounded skeleton"></div>
                      <div class="h-3 w-1/2 rounded skeleton"></div>
                   </div>
                   <div class="text-right space-y-1">
                      <div class="h-5 w-16 rounded skeleton"></div>
                      <div class="h-2 w-10 ml-auto rounded skeleton"></div>
                   </div>
                </div>
                <div class="flex justify-between items-center">
                   <div class="h-6 w-24 rounded-full skeleton"></div>
                   <div class="flex items-center space-x-2">
                      <div class="h-3 w-16 rounded skeleton"></div>
                      <div class="w-8 h-8 rounded-lg skeleton"></div>
                      <div class="w-8 h-8 rounded-lg skeleton"></div>
                   </div>
                </div>
             </div>
          </div>

          <!-- Actual Content (Visible when NOT loading) -->
          <div *ngIf="!productService.isLoading()" class="animate-in fade-in duration-500">
            <!-- Desktop Table (md+) -->
            <table mat-table [dataSource]="dataSource" matSort class="table-stitch hidden md:table">
            
            <!-- Product Column -->
            <ng-container matColumnDef="product">
              <th mat-header-cell *matHeaderCellDef mat-sort-header="name" class="w-1/3"> Product Details </th>
              <td mat-cell *matCellDef="let row">
                <div class="flex items-center space-x-5">
                   <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                      <img [src]="'https://api.dicebear.com/7.x/identicon/svg?seed=' + row.name" alt="Img" class="w-full h-full object-cover">
                   </div>
                   <div class="flex flex-col">
                      <span class="text-sm font-bold text-slate-900 leading-tight">{{row.name}}</span>
                      <span class="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">SKU: {{ row.sku || 'SKU-' + row['_rowNumber'] }}</span>
                   </div>
                </div>
              </td>
            </ng-container>

            <!-- Category Column -->
            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef class="text-center"> Category </th>
              <td mat-cell *matCellDef="let row" class="text-center">
                <span class="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50">
                  {{ row.category || 'General' }}
                </span>
              </td>
            </ng-container>

            <!-- Price Column -->
            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="text-right"> Price </th>
              <td mat-cell *matCellDef="let row" class="font-black text-slate-900 text-sm italic text-right"> 
                RD$ {{row.price | number:'1.2-2'}} 
              </td>
            </ng-container>

            <!-- Stock Column -->
            <ng-container matColumnDef="stock">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="text-center"> Stock </th>
              <td mat-cell *matCellDef="let row" class="text-xs font-bold text-slate-600 text-center"> 
                 {{ row.stock || 0 }} units 
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef class="text-center"> Status </th>
              <td mat-cell *matCellDef="let row" class="text-center">
                <div [class]="getStockStatusClass(row.stock || 0)" class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border shadow-sm transition-all group-hover:pr-4 group-hover:pl-3">
                   <span class="w-1.5 h-1.5 rounded-full" [class]="getStockStatusDot(row.stock || 0)"></span>
                   <span class="text-[10px] font-bold uppercase tracking-wider">{{ getStockStatusLabel(row.stock || 0) }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="text-right"> </th>
              <td mat-cell *matCellDef="let row" class="text-right space-x-1">
                <button (click)="editProduct(row)" class="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl transition-all active:scale-90">
                   <lucide-icon name="pencil" class="w-5 h-5"></lucide-icon>
                </button>
                <button (click)="deleteProduct(row)" class="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all active:scale-90">
                   <lucide-icon name="trash-2" class="w-5 h-5"></lucide-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="group"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="px-8 py-24 text-center" colspan="6">
                <lucide-icon name="package" class="w-16 h-16 mx-auto mb-4 text-slate-100" [strokeWidth]="1.5"></lucide-icon>
                <h3 class="text-lg font-bold text-slate-900">No products found</h3>
                <p class="text-sm text-slate-400 mt-1">Try to add some products to see them here.</p>
              </td>
            </tr>
          </table>

          <!-- Mobile Cards View (<md) -->
          <div class="md:hidden flex flex-col gap-4 p-4">
             <div *ngFor="let row of dataSource.connect() | async" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 active:bg-slate-50 transition-all space-y-4">
                <div class="flex items-center space-x-4">
                   <div class="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm">
                      <img [src]="'https://api.dicebear.com/7.x/identicon/svg?seed=' + row.name" alt="Img" class="w-full h-full object-cover">
                   </div>
                   <div class="flex-1 min-w-0">
                      <h4 class="text-sm font-bold text-slate-900 truncate uppercase tracking-tight">{{ row.name }}</h4>
                      <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">SKU: {{ row.sku || 'SKU-' + row['_rowNumber'] }}</p>
                   </div>
                   <div class="text-right">
                      <p class="text-[15px] font-black text-slate-900 italic">RD$ {{ row.price | number }}</p>
                      <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Unit Price</span>
                   </div>
                </div>

                <div class="flex items-center justify-between pt-2">
                   <div [class]="getStockStatusClass(row.stock || 0)" class="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full border shadow-sm">
                      <span class="w-1.5 h-1.5 rounded-full" [class]="getStockStatusDot(row.stock || 0)"></span>
                      <span class="text-[9px] font-bold uppercase tracking-wider">{{ getStockStatusLabel(row.stock || 0) }}</span>
                   </div>
                   <div class="flex items-center space-x-2">
                      <span class="text-[10px] font-bold text-slate-500">{{ row.stock || 0 }} in stock</span>
                      <div class="h-4 w-px bg-slate-200"></div>
                      <button (click)="editProduct(row)" class="p-2 text-slate-400 hover:text-primary transition-colors">
                         <lucide-icon name="pencil" class="w-4 h-4"></lucide-icon>
                      </button>
                      <button (click)="deleteProduct(row)" class="p-2 text-slate-400 hover:text-danger transition-colors">
                         <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
                      </button>
                   </div>
                </div>
             </div>

             <div *ngIf="dataSource.filteredData.length === 0" class="p-12 text-center">
                <lucide-icon name="package" class="w-12 h-12 mx-auto mb-3 text-slate-100"></lucide-icon>
                <p class="text-sm font-bold text-slate-500">No products found</p>
             </div>
          </div>
        </div>

        <div *ngIf="!productService.isLoading()" class="px-5 md:px-8 py-4 md:py-5 border-t border-slate-100 bg-slate-50/20 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div class="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Showing <span class="text-slate-900">{{ (paginator ? paginator.pageIndex * paginator.pageSize + 1 : 1) }}</span> to 
              <span class="text-slate-900">{{ (paginator ? Math.min((paginator.pageIndex + 1) * paginator.pageSize, dataSource.filteredData.length) : Math.min(10, dataSource.filteredData.length)) }}</span> 
              of <span class="text-slate-900">{{ dataSource.filteredData.length }}</span>
           </div>
           <mat-paginator [pageSizeOptions]="[10, 25, 100]" class="!bg-transparent !border-none !font-bold" hidePageSize></mat-paginator>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
  `]
})
export class ProductListComponent implements OnInit, AfterViewInit {
  public productService = inject(ProductService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  public Math = Math;

  displayedColumns: string[] = ['product', 'category', 'price', 'stock', 'status', 'actions'];
  dataSource: MatTableDataSource<Product> = new MatTableDataSource();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  showForm = false;
  isEditing = false;
  isSaving = false;
  currentRowNumber: number | null = null;

  lowStockCount = 0;
  outOfStockCount = 0;

  productForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0.01)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    id: [''],
    sku: [''],
    category: ['General']
  });

  constructor() {
    effect(() => {
      const data = this.productService.products();
      this.dataSource.data = data;
      this.calculateStockStats(data);
    });
  }

  ngOnInit() {
    this.productService.loadProducts();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'product': return item.name.toLowerCase();
        default: return (item as any)[property];
      }
    };
  }

  calculateStockStats(products: Product[]) {
    this.lowStockCount = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 10).length;
    this.outOfStockCount = products.filter(p => (p.stock || 0) === 0).length;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openForm() {
    this.productForm.reset({ price: 0, stock: 0, category: 'General' });
    this.isEditing = false;
    this.currentRowNumber = null;
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
  }

  editProduct(product: Product) {
    this.productForm.patchValue(product);
    this.isEditing = true;
    this.currentRowNumber = product._rowNumber || null;
    this.showForm = true;
  }

  saveProduct() {
    if (this.productForm.invalid) return;

    this.isSaving = true;
    const value = this.productForm.getRawValue();

    if (this.isEditing && this.currentRowNumber) {
      this.productService.updateProduct(this.currentRowNumber, value).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeForm();
        },
        error: () => this.isSaving = false
      });
    } else {
      this.productService.createProduct(value).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeForm();
        },
        error: () => this.isSaving = false
      });
    }
  }

  deleteProduct(product: Product) {
    if (!product._rowNumber) return;
    if (confirm(`Are you sure you want to delete ${product.name}?`)) {
      this.productService.deleteProduct(product._rowNumber).subscribe();
    }
  }

  openExportDialog() {
    this.dialog.open(ExportSelectorDialogComponent, {
      data: {
        sourceKey: 'products',
        dataset: this.dataSource.filteredData
      },
      width: '450px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container'
    }).afterClosed().subscribe(result => {
      if (result === 'GOTO') {
        this.router.navigate(['/export-templates']);
      }
    });
  }

  getStockStatusLabel(stock: number): string {
    if (stock <= 0) return 'Out of Stock';
    if (stock < 10) return 'Low Stock';
    return 'In Stock';
  }

  getStockStatusClass(stock: number): string {
    if (stock <= 0) return 'bg-danger/20 text-danger-text border-transparent';
    if (stock < 10) return 'bg-warning/20 text-warning-text border-transparent';
    return 'bg-success/20 text-success-text border-transparent';
  }

  getStockStatusDot(stock: number): string {
    if (stock <= 0) return 'bg-danger';
    if (stock < 10) return 'bg-warning-text';
    return 'bg-success-text';
  }
}
