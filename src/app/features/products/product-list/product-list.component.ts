import { Component, OnInit, inject, ViewChild, effect, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatTableModule,
    MatPaginatorModule, MatSortModule, MatIconModule, MatProgressSpinnerModule
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
              <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 !text-xl group-focus-within:text-blue-600 transition-colors">search</mat-icon>
              <input type="text" (keyup)="applyFilter($event)" 
                     placeholder="Search products, SKUs..." 
                     class="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm">
           </div>
           
           <button (click)="openForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 flex items-center space-x-2 text-sm font-bold">
              <mat-icon class="!text-xl">add</mat-icon>
              <span>Add Product</span>
           </button>
        </div>
      </div>

      <!-- Quick Stats Row -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
         <!-- Total Products -->
         <div class="card-stitch p-6 bg-white flex items-center space-x-5 group hover:border-blue-200 transition-all">
            <div class="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shadow-sm">
               <mat-icon class="!text-2xl">inventory_2</mat-icon>
            </div>
            <div class="flex-1">
               <div class="flex items-center justify-between">
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Products</span>
                  <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">+12.5% vs last month</span>
               </div>
               <p class="text-2xl font-black text-slate-900 mt-1">{{ dataSource.data.length | number }}</p>
            </div>
         </div>

         <!-- Low Stock -->
         <div class="card-stitch p-6 bg-white flex items-center space-x-5 group hover:border-amber-200 transition-all">
            <div class="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform shadow-sm">
               <mat-icon class="!text-2xl">warning_amber</mat-icon>
            </div>
            <div class="flex-1">
               <div class="flex items-center justify-between">
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Alert</span>
               </div>
               <p class="text-2xl font-black text-slate-900 mt-1">{{ lowStockCount }}</p>
               <div class="flex items-center space-x-1 mt-1 text-amber-600">
                  <mat-icon class="!text-[12px] h-3 w-3 flex items-center justify-center">notification_important</mat-icon>
                  <span class="text-[10px] font-bold uppercase tracking-tight">Needs attention</span>
               </div>
            </div>
         </div>

         <!-- Out of Stock -->
         <div class="card-stitch p-6 bg-white flex items-center space-x-5 group hover:border-red-200 transition-all">
            <div class="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform shadow-sm">
               <mat-icon class="!text-2xl">error_outline</mat-icon>
            </div>
            <div class="flex-1">
               <div class="flex items-center justify-between">
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Out of Stock</span>
               </div>
               <p class="text-2xl font-black text-slate-900 mt-1">{{ outOfStockCount }}</p>
               <div class="flex items-center space-x-1 mt-1 text-red-600">
                  <mat-icon class="!text-[12px] h-3 w-3 flex items-center justify-center">remove_circle_outline</mat-icon>
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
                  <p class="text-sm text-slate-400 font-medium">Configure product details and pricing</p>
               </div>
               <button (click)="closeForm()" class="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-50 transition-all">
                  <mat-icon>close</mat-icon>
               </button>
            </div>
            <form [formGroup]="productForm" (ngSubmit)="saveProduct()" class="p-8 space-y-6">
               <div class="space-y-1.5">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Name</label>
                  <input type="text" formControlName="name" placeholder="e.g. Wireless Headphones" 
                         class="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all">
               </div>
               <div class="grid grid-cols-2 gap-6">
                  <div class="space-y-1.5">
                     <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (RD$)</label>
                     <input type="number" formControlName="price" placeholder="0.00" 
                            class="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all">
                  </div>
                  <div class="space-y-1.5">
                     <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock Units</label>
                     <input type="number" formControlName="stock" placeholder="0" 
                            class="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all">
                  </div>
               </div>
               <div class="flex justify-end space-x-3 pt-4 border-t border-slate-50 mt-8">
                  <button type="button" (click)="closeForm()" class="px-6 py-2.5 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">Cancel</button>
                  <button type="submit" [disabled]="productForm.invalid || isSaving" 
                          class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 disabled:opacity-50 transition-all active:scale-95 text-sm font-bold flex items-center space-x-2">
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

          <table mat-table [dataSource]="dataSource" matSort class="w-full">
            
            <!-- Product Column -->
            <ng-container matColumnDef="product">
              <th mat-header-cell *matHeaderCellDef mat-sort-header="name" class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50"> Product Details </th>
              <td mat-cell *matCellDef="let row" class="px-8 py-5">
                <div class="flex items-center space-x-5">
                   <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                      <img [src]="'https://api.dicebear.com/7.x/identicon/svg?seed=' + row.name" alt="Img" class="w-full h-full object-cover">
                   </div>
                   <div class="flex flex-col">
                      <span class="text-sm font-bold text-slate-900 leading-tight">{{row.name}}</span>
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">SKU: {{ row.sku || 'SKU-' + row._rowNumber }}</span>
                   </div>
                </div>
              </td>
            </ng-container>

            <!-- Category Column -->
            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50"> Category </th>
              <td mat-cell *matCellDef="let row" class="px-8 py-5">
                <span class="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50">
                  {{ row.category || 'General' }}
                </span>
              </td>
            </ng-container>

            <!-- Price Column -->
            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50"> Price </th>
              <td mat-cell *matCellDef="let row" class="px-8 py-5 font-black text-slate-900 text-sm italic"> 
                RD$ {{row.price | number:'1.2-2'}} 
              </td>
            </ng-container>

            <!-- Stock Column -->
            <ng-container matColumnDef="stock">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50"> Stock </th>
              <td mat-cell *matCellDef="let row" class="px-8 py-5 text-xs font-bold text-slate-600"> 
                 {{ row.stock || 0 }} units 
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 text-center"> Status </th>
              <td mat-cell *matCellDef="let row" class="px-8 py-5 text-center">
                <div [class]="getStockStatusClass(row.stock || 0)" class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border shadow-sm transition-all group-hover:px-4">
                   <span class="w-1.5 h-1.5 rounded-full" [class]="getStockStatusDot(row.stock || 0)"></span>
                   <span class="text-[10px] font-bold uppercase tracking-wider">{{ getStockStatusLabel(row.stock || 0) }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 text-right"> </th>
              <td mat-cell *matCellDef="let row" class="px-8 py-5 text-right space-x-1">
                <button (click)="editProduct(row)" class="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90">
                  <mat-icon class="!text-xl">edit</mat-icon>
                </button>
                <button (click)="deleteProduct(row)" class="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90">
                  <mat-icon class="!text-xl">delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns" class="border-b border-slate-100"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-slate-50/80 border-b border-slate-50 transition-all group last:border-0 overflow-hidden"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="px-8 py-24 text-center" colspan="6">
                <mat-icon class="!w-16 !h-16 !text-6xl mx-auto mb-4 text-slate-100">inventory</mat-icon>
                <h3 class="text-lg font-bold text-slate-900">No products found</h3>
                <p class="text-sm text-slate-400 mt-1">Try to add some products to see them here.</p>
              </td>
            </tr>
          </table>
        </div>

        <div class="px-8 py-5 border-t border-slate-100 bg-slate-50/20 flex flex-col md:flex-row items-center justify-between gap-4">
           <div class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Showing <span class="text-slate-900">{{ (paginator ? paginator.pageIndex * paginator.pageSize + 1 : 1) }}</span> to 
              <span class="text-slate-900">{{ (paginator ? Math.min((paginator.pageIndex + 1) * paginator.pageSize, dataSource.data.length) : Math.min(10, dataSource.data.length)) }}</span> 
              of <span class="text-slate-900">{{ dataSource.data.length }}</span> results
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
    if (stock <= 0) return 'bg-red-50 text-red-600 border-red-100';
    if (stock < 10) return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  }

  getStockStatusDot(stock: number): string {
    if (stock <= 0) return 'bg-red-500';
    if (stock < 10) return 'bg-amber-500';
    return 'bg-emerald-500';
  }
}
