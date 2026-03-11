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

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatTableModule,
    MatPaginatorModule, MatSortModule, LucideAngularModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      <!-- Header Area -->
      <div class="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div class="space-y-1">
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Product Inventory</h1>
          <p class="text-sm text-slate-500 font-medium">Manage your catalog, pricing, and stock levels.</p>
        </div>
        
        <div class="flex items-center space-x-3 w-full xl:w-auto">
           <div class="relative flex-1 xl:w-80 group">
              <lucide-icon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5 group-focus-within:text-primary transition-colors"></lucide-icon>
              <input type="text" (keyup)="applyFilter($event)" 
                     placeholder="Search products, SKUs..." 
                     class="input-stitch pl-12 h-12">
           </div>
           
           <button (click)="openForm()" class="bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-ui shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center space-x-2 text-sm font-bold">
              <lucide-icon name="plus" class="w-5 h-5"></lucide-icon>
              <span>Add Product</span>
           </button>
        </div>
      </div>

      <!-- Quick Stats Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
         <!-- Total Products -->
         <div class="card-stitch p-6 flex items-center space-x-5 group hover:border-blue-200 transition-all">
            <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-sm">
               <lucide-icon name="package" class="w-6 h-6"></lucide-icon>
            </div>
            <div class="flex-1">
               <div class="flex items-center justify-between">
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Products</span>
                  <span class="text-[10px] font-bold text-success-text bg-success px-2 py-0.5 rounded-full">+12.5% vs last month</span>
               </div>
               <p class="text-2xl font-black text-slate-900 mt-1">{{ dataSource.data.length | number }}</p>
            </div>
         </div>

         <!-- Low Stock -->
         <div class="card-stitch p-6 flex items-center space-x-5 group hover:border-amber-200 transition-all">
            <div class="w-14 h-14 rounded-2xl bg-warning/20 flex items-center justify-center text-warning-text group-hover:scale-110 transition-transform shadow-sm">
               <lucide-icon name="alert-circle" class="w-6 h-6"></lucide-icon>
            </div>
            <div class="flex-1">
               <div class="flex items-center justify-between">
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Alert</span>
               </div>
               <p class="text-2xl font-black text-slate-900 mt-1">{{ lowStockCount }}</p>
               <div class="flex items-center space-x-1 mt-1 text-warning-text">
                  <lucide-icon name="alert-circle" class="w-3 h-3 flex items-center justify-center"></lucide-icon>
                  <span class="text-[10px] font-bold uppercase tracking-tight">Needs attention</span>
               </div>
            </div>
         </div>

         <!-- Out of Stock -->
         <div class="card-stitch p-6 flex items-center space-x-5 group hover:border-red-200 transition-all">
            <div class="w-14 h-14 rounded-2xl bg-danger/20 flex items-center justify-center text-danger-text group-hover:scale-110 transition-transform shadow-sm">
               <lucide-icon name="x-circle" class="w-6 h-6"></lucide-icon>
            </div>
            <div class="flex-1">
               <div class="flex items-center justify-between">
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Out of Stock</span>
               </div>
               <p class="text-2xl font-black text-slate-900 mt-1">{{ outOfStockCount }}</p>
               <div class="flex items-center space-x-1 mt-1 text-danger-text">
                  <lucide-icon name="x-circle" class="w-3 h-3 flex items-center justify-center"></lucide-icon>
                  <span class="text-[10px] font-bold uppercase tracking-tight">Action required</span>
               </div>
            </div>
         </div>
      </div>

      <!-- Add/Edit Form Overlay (Simplified for this replica) -->
      <div *ngIf="showForm" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
         <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
             <div class="p-8 border-b border-slate-100 flex justify-between items-center">
               <div>
                  <h2 class="text-xl font-black text-slate-900 tracking-tight">{{ isEditing ? 'Edit Product' : 'New Product' }}</h2>
                  <p class="text-sm text-text-muted font-medium">Configure product details and pricing</p>
               </div>
               <button (click)="closeForm()" class="text-text-muted hover:text-text p-2 rounded-xl hover:bg-slate-50 transition-all">
                  <lucide-icon name="x-circle" class="w-5 h-5"></lucide-icon>
               </button>
            </div>
            <form [formGroup]="productForm" (ngSubmit)="saveProduct()" class="p-8 space-y-6">
               <div class="space-y-1.5">
                  <label class="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Product Name</label>
                  <input type="text" formControlName="name" placeholder="e.g. Wireless Headphones" 
                         class="input-stitch">
               </div>
               <div class="grid grid-cols-2 gap-6">
                  <div class="space-y-1.5">
                     <label class="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Price (RD$)</label>
                     <input type="number" formControlName="price" placeholder="0.00" 
                            class="input-stitch">
                  </div>
                  <div class="space-y-1.5">
                     <label class="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Stock Units</label>
                     <input type="number" formControlName="stock" placeholder="0" 
                            class="input-stitch">
                  </div>
               </div>
               <div class="flex justify-end space-x-3 pt-4 border-t border-slate-50 mt-8">
                  <button type="button" (click)="closeForm()" class="px-6 py-2.5 rounded-ui border border-border text-text font-bold text-sm bg-white hover:bg-slate-50 transition-all active:scale-95">Cancel</button>
                  <button type="submit" [disabled]="productForm.invalid || isSaving" 
                          class="bg-primary hover:bg-blue-700 text-white px-8 py-2.5 rounded-ui shadow-md hover:shadow-lg disabled:opacity-50 transition-all active:scale-95 text-sm font-bold flex items-center justify-center space-x-2">
                     <mat-spinner diameter="16" strokeWidth="2.5" *ngIf="isSaving"></mat-spinner>
                     <span>{{ isEditing ? 'Update Product' : 'Save Product' }}</span>
                  </button>
               </div>
            </form>
         </div>
      </div>

      <!-- Main Table Container -->
      <div class="card-stitch bg-white overflow-hidden min-h-[500px]">
        <div class="relative flex-1 overflow-auto custom-scrollbar">
          <div *ngIf="productService.isLoading()" class="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
            <mat-spinner diameter="40" strokeWidth="3"></mat-spinner>
          </div>

          <table mat-table [dataSource]="dataSource" matSort class="table-stitch">
            
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
                      <span class="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">SKU: {{ row.sku || 'SKU-' + row._rowNumber }}</span>
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
        </div>

        <div class="px-8 py-5 border-t border-slate-100 bg-slate-50/20 flex flex-col md:flex-row items-center justify-between gap-4">
           <div class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Showing <span class="text-slate-900">{{ (paginator ? paginator.pageIndex * paginator.pageSize + 1 : 1) }}</span> to 
              <span class="text-slate-900">{{ (paginator ? Math.min((paginator.pageIndex + 1) * paginator.pageSize, dataSource.filteredData.length) : Math.min(10, dataSource.filteredData.length)) }}</span> 
              of <span class="text-slate-900">{{ dataSource.filteredData.length }}</span> results
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
