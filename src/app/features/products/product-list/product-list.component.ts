import { Component, OnInit, inject, effect, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ExportSelectorDialogComponent } from '../../../shared/components/export-selector-dialog/export-selector-dialog.component';
import { Router } from '@angular/router';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject, BehaviorSubject } from 'rxjs';

interface ColumnFilter {
  operator: 'eq' | 'neq';
  values: string[];
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatTableModule,
    LucideAngularModule, MatProgressSpinnerModule, ScrollingModule,
    MatDialogModule, MatMenuModule, MatCheckboxModule
  ],
  template: `
    <div class="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      <!-- Header Area -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div class="flex flex-col">
          <h1 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Product Inventory</h1>
          <p class="text-slate-400 text-[10px] md:text-xs font-semibold uppercase tracking-widest mt-0.5">Manage your catalog, pricing, and stock levels</p>
        </div>
        
        <div class="flex items-center space-x-3 w-full sm:w-auto">
           <div class="relative flex-1 sm:w-64 lg:w-80 group">
              <lucide-icon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 md:w-5 md:h-5 group-focus-within:text-primary transition-colors"></lucide-icon>
              <input type="text" (input)="onSearch($event)" 
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
                  <p class="text-xl md:text-2xl font-black text-slate-900 mt-0.5">{{ visibleRows().length | number }}</p>
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

      <!-- Filter by Column Buttons 
      <div class="flex flex-col space-y-3">
         <span class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Filter by Column</span>
         <div class="flex flex-wrap gap-2">
            <button *ngFor="let col of columnDefs" 
                    [matMenuTriggerFor]="filterMenu" 
                    (click)="activeFilterCol = col.id"
                    class="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 hover:border-primary/30 hover:text-primary transition-all shadow-sm flex items-center space-x-2"
                    [class.border-primary]="isColumnFiltered(col.id)"
                    [class.text-primary]="isColumnFiltered(col.id)">
               <span>{{ col.label }}</span>
               <lucide-icon name="chevron-down" class="w-3 h-3 opacity-50"></lucide-icon>
            </button>
            
            <mat-menu #filterMenu="matMenu" class="filter-menu-popover">
               <ng-container *ngTemplateOutlet="filterTemplate; context: { column: activeFilterCol }"></ng-container>
            </mat-menu>
         </div>
      </div>
      -->

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
        <div class="relative flex-1 flex flex-col min-h-0">
          
          <!-- Loading Skeletons (Only when truly empty) -->
          <div *ngIf="productService.isLoading() && visibleRows().length === 0" class="flex-1 overflow-auto">
            <!-- Desktop Table Skeleton -->
            <div class="hidden md:block">
              <table class="table-stitch">
                <thead>
                  <tr>
                    <th class="w-1/3">Product</th>
                    <th class="text-left">Category</th>
                    <th class="text-left">Price</th>
                    <th class="text-left">Stock</th>
                    <th class="text-left">Status</th>
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
                    <td><div class="h-5 w-20 rounded skeleton"></div></td>
                    <td><div class="h-5 w-24 rounded skeleton"></div></td>
                    <td><div class="h-5 w-16 rounded skeleton"></div></td>
                    <td><div class="h-8 w-24 rounded-full skeleton"></div></td>
                    <td><div class="w-8 h-8 rounded-lg skeleton"></div></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Card Skeleton -->
            <div class="md:hidden flex flex-col gap-4 p-4">
               <div *ngFor="let i of [1,2,3,4]" class="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
                  <div class="flex items-center space-x-4">
                     <div class="w-14 h-14 rounded-xl skeleton"></div>
                     <div class="flex-1 space-y-2">
                        <div class="h-4 w-3/4 rounded skeleton"></div>
                        <div class="h-3 w-1/2 rounded skeleton"></div>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          <!-- Actual Content -->
          <div *ngIf="visibleRows().length > 0 || !productService.isLoading()" class="flex-1 flex flex-col">
            


            <!-- Empty State -->
            <div *ngIf="!productService.isLoading() && visibleRows().length === 0" 
                 class="flex flex-col items-center justify-center py-24 px-6 text-center animate-fade-in">
              <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <lucide-icon name="package-search" class="w-12 h-12 text-slate-300"></lucide-icon>
              </div>
              <h3 class="text-xl font-bold text-slate-800 mb-2">No hay productos disponibles</h3>
              <p class="text-slate-500 max-w-sm text-sm">
                No se encontraron productos en el catálogo o no coinciden con la búsqueda.
              </p>
            </div>

            <!-- Desktop Header (Only if data exists) -->
            <div *ngIf="visibleRows().length > 0" class="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/50 border-b border-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-400 sticky top-0 z-10">
               <div class="col-span-4 text-left">Product Details</div>
               <div class="col-span-2 text-left ml-4">Category</div>
               <div class="col-span-2 text-left">Price</div>
               <div class="col-span-1 text-left">Stock</div>
               <div class="col-span-2 text-left">Status</div>
               <div class="col-span-1 text-left"></div>
            </div>

            <cdk-virtual-scroll-viewport itemSize="72" class="flex-1 custom-scrollbar h-[600px]">
              <!-- Desktop Rows -->
              <!-- Row Container -->
              <div *cdkVirtualFor="let row of visibleRows(); trackBy: trackByRowNumber">
                <!-- Desktop Layout -->
                <div class="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-50 hover:bg-blue-50/30 transition-all items-center group">
                  <div class="col-span-4 flex items-center space-x-5 text-left">
                     <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                        <img [src]="'https://api.dicebear.com/7.x/identicon/svg?seed=' + row.name" alt="Img" class="w-full h-full object-cover">
                     </div>
                     <div class="flex flex-col min-w-0">
                        <span class="text-sm font-bold text-slate-900 leading-tight truncate">{{row.name}}</span>
                        <span class="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">SKU: {{ row.sku || 'SKU-' + row['_rowNumber'] }}</span>
                     </div>
                  </div>

                  <div class="col-span-2 text-left ml-4">
                    <span class="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/50">
                      {{ row.category || 'General' }}
                    </span>
                  </div>

                  <div class="col-span-2 font-black text-slate-900 text-sm italic text-left"> 
                    RD$ {{row.price | number:'1.2-2'}} 
                  </div>

                  <div class="col-span-1 text-xs font-bold text-slate-600 text-left"> 
                     {{ row.stock || 0 }} units 
                  </div>

                  <div class="col-span-2 text-left">
                    <div [class]="getStockStatusClass(row.stock || 0)" class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border shadow-sm">
                       <span class="w-1.5 h-1.5 rounded-full" [class]="getStockStatusDot(row.stock || 0)"></span>
                       <span class="text-[10px] font-bold uppercase tracking-wider">{{ getStockStatusLabel(row.stock || 0) }}</span>
                    </div>
                  </div>

                  <div class="col-span-1 flex justify-end items-center space-x-1">
                    <button (click)="editProduct(row)" class="p-2 text-slate-400 hover:text-primary transition-colors rounded-xl hover:bg-primary/5">
                       <lucide-icon name="pencil" class="w-4 h-4"></lucide-icon>
                    </button>
                    <button (click)="deleteProduct(row)" class="p-2 text-slate-400 hover:text-danger transition-colors rounded-xl hover:bg-danger/5">
                       <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
                    </button>
                  </div>
                </div>

                <!-- Mobile Layout -->
                <div class="md:hidden flex flex-col gap-4 p-4 border-b border-slate-50">
                   <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 active:bg-slate-50 transition-all space-y-4">
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
                </div>
              </div>

              <!-- Loading more spinner -->
              <div *ngIf="productService.listState().isLoadingMore" class="p-8 flex justify-center items-center">
                <mat-spinner diameter="24"></mat-spinner>
                <span class="ml-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cargando más productos...</span>
              </div>
            </cdk-virtual-scroll-viewport>
          </div>
        </div>
        </div>

        <div *ngIf="!productService.isLoading()" class="px-5 md:px-8 py-4 md:py-5 border-t border-slate-100 bg-slate-50/20 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div class="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Mostrando <span class="text-slate-900">{{ visibleRows().length }}</span> productos
           </div>
           <div class="flex items-center space-x-4">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scroll para cargar más</span>
           </div>
         </div>
      </div>

    <!-- Filter Template -->
    <ng-template #filterTemplate let-col="column">
       <div class="p-4 bg-white min-w-[240px] max-w-[300px]" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
             <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter By {{ col | titlecase }}</span>
             <button (click)="clearColumnFilter(col)" class="text-[9px] font-bold text-primary hover:underline uppercase">Clear</button>
          </div>

          <!-- Operator Toggle -->
          <div class="flex bg-slate-100 p-1 rounded-lg mb-4">
             <button (click)="setOperator(col, 'eq')" 
                     [class.bg-white]="(columnFilters()[col]?.operator || 'eq') === 'eq'"
                     [class.shadow-sm]="(columnFilters()[col]?.operator || 'eq') === 'eq'"
                     class="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all">Equal To</button>
             <button (click)="setOperator(col, 'neq')" 
                     [class.bg-white]="(columnFilters()[col]?.operator || 'eq') === 'neq'"
                     [class.shadow-sm]="(columnFilters()[col]?.operator || 'eq') === 'neq'"
                     class="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all">Not Equal To</button>
          </div>

          <!-- Value Search -->
          <div class="relative group mb-3">
             <lucide-icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-3.5 h-3.5"></lucide-icon>
             <input type="text" #valSearch placeholder="Search values..." 
                    class="w-full bg-slate-50 border border-slate-100 rounded-lg py-1.5 pl-9 pr-3 text-xs focus:ring-1 focus:ring-primary/20 outline-none">
          </div>

          <!-- Unique Values List -->
          <div class="mb-2">
             <button (click)="toggleSelectAll(col, valSearch.value)" 
                     class="w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors group">
                <mat-checkbox [checked]="isAllSelected(col, valSearch.value)" 
                               [indeterminate]="isPartiallySelected(col, valSearch.value)"
                               (change)="toggleSelectAll(col, valSearch.value)" 
                               color="primary" class="pointer-events-none"></mat-checkbox>
                <span class="text-xs font-bold text-slate-800 uppercase tracking-tighter">Select All</span>
             </button>
          </div>
          <div class="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1 pr-1 border-t border-slate-50 pt-2">
             <div *ngFor="let val of getUniqueValuesForCol(col, valSearch.value)" 
                  class="flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer group"
                  (click)="toggleColumnValue(col, val)">
                <mat-checkbox [checked]="isValSelected(col, val)" (change)="toggleColumnValue(col, val)" color="primary" class="pointer-events-none"></mat-checkbox>
                <span class="text-xs font-medium text-slate-600 truncate">{{ val || '(Empty)' }}</span>
             </div>
          </div>
          
          <div class="pt-4 border-t border-slate-100 flex justify-end">
             <button (click)="applyFilters()" class="bg-primary text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95">
                Apply Filters
             </button>
          </div>
       </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    cdk-virtual-scroll-viewport { display: block; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
  `]
})
export class ProductListComponent implements OnInit {
  public productService = inject(ProductService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private confirmService = inject(ConfirmService);
  public Math = Math;

  private searchSubject = new BehaviorSubject<string>('');
  visibleRows = computed(() => this.productService.listState().visibleRows);
  
  displayedColumns: string[] = ['product', 'category', 'price', 'stock', 'status', 'actions'];

  showForm = false;
  isEditing = false;
  isSaving = false;
  currentRowNumber: number | null = null;

  lowStockCount = 0;
  outOfStockCount = 0;

  activeFilterCol = '';
  columnDefs = [
    { id: 'name', label: 'Product Name' },
    { id: 'category', label: 'Category' },
    { id: 'status', label: 'Status' },
    { id: 'stock', label: 'Stock' },
    { id: 'price', label: 'Price' }
  ];

  columnFilters = signal<{ [key: string]: ColumnFilter }>({});

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
      this.calculateStockStats(data);
    });
  }

  ngOnInit() {
    this.productService.initLargeList();
    
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.productService.applyQuery({ 
        search: term, 
        columnFilters: this.columnFilters(), 
        sort: { active: '', direction: '' } 
      });
    });
  }

  onScroll(index: number) {
    const total = this.visibleRows().length;
    if (index > total - 10) {
      this.productService.loadMoreChunk();
    }
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  trackByRowNumber(index: number, item: any) {
    if (!item) return index;
    return item['_rowNumber'] || item.id || index;
  }

  calculateStockStats(products: Product[]) {
    this.lowStockCount = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 10).length;
    this.outOfStockCount = products.filter(p => (p.stock || 0) === 0).length;
  }

  applyFilter(event: Event) {
    // Handled by search subject
  }

  isColumnFiltered(col: string): boolean {
    const filter = this.columnFilters()[col];
    return !!filter && filter.values.length > 0;
  }

  isValSelected(col: string, val: string): boolean {
    return (this.columnFilters()[col]?.values || []).includes(val);
  }

  toggleColumnValue(col: string, val: string) {
    const current = this.columnFilters();
    const colFilter = current[col] || { operator: 'eq', values: [] };
    const index = colFilter.values.indexOf(val);
    
    let newValues = [...colFilter.values];
    if (index > -1) newValues.splice(index, 1);
    else newValues.push(val);

    this.columnFilters.set({
      ...current,
      [col]: { ...colFilter, values: newValues }
    });
  }

  setOperator(col: string, op: 'eq' | 'neq') {
    const current = this.columnFilters();
    const colFilter = current[col] || { operator: 'eq', values: [] };
    this.columnFilters.set({
      ...current,
      [col]: { ...colFilter, operator: op }
    });
  }

  clearColumnFilter(col: string) {
    const current = this.columnFilters();
    const { [col]: removed, ...rest } = current;
    this.columnFilters.set(rest);
  }

  getUniqueValuesForCol(col: string, search: string = ''): string[] {
    const data = this.productService.products();
    let values = data.map(p => {
      if (col === 'status') return this.getStockStatusLabel(p.stock || 0);
      return (p as any)[col];
    });

    let unique = Array.from(new Set(values.map(v => String(v || '')))).sort();
    if (search) unique = unique.filter(v => v.toLowerCase().includes(search.toLowerCase()));
    return unique;
  }

  isAllSelected(col: string, search: string = ''): boolean {
    const uniqueVals = this.getUniqueValuesForCol(col, search);
    const selected = this.columnFilters()[col]?.values || [];
    return uniqueVals.length > 0 && uniqueVals.every(v => selected.includes(v));
  }

  isPartiallySelected(col: string, search: string = ''): boolean {
    const uniqueVals = this.getUniqueValuesForCol(col, search);
    const selected = this.columnFilters()[col]?.values || [];
    const some = uniqueVals.some(v => selected.includes(v));
    return some && !this.isAllSelected(col, search);
  }

  toggleSelectAll(col: string, search: string = '') {
    const uniqueVals = this.getUniqueValuesForCol(col, search);
    const current = this.columnFilters();
    const colFilter = current[col] || { operator: 'eq', values: [] };
    
    let newValues = [...colFilter.values];
    if (this.isAllSelected(col, search)) {
      newValues = newValues.filter(v => !uniqueVals.includes(v));
    } else {
      uniqueVals.forEach(v => { if (!newValues.includes(v)) newValues.push(v); });
    }

    this.columnFilters.set({ ...current, [col]: { ...colFilter, values: newValues } });
  }

  applyFilters() {
     this.productService.applyQuery({ 
        search: this.searchSubject.value, 
        columnFilters: this.columnFilters(), 
        sort: { active: '', direction: '' } 
     });
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
    this.currentRowNumber = product['_rowNumber'] || null;
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
    if (!product['_rowNumber']) return;
    this.confirmService.ask({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      confirmText: 'Delete Product',
      isDanger: true
    }).subscribe(confirmed => {
      if (confirmed) {
        this.productService.deleteProduct(product._rowNumber!).subscribe();
      }
    });
  }

  openExportDialog() {
    const isFiltering = this.productService.listState().isFiltering;
    const dataset = isFiltering ? this.visibleRows() : this.productService.allRecords();

    this.dialog.open(ExportSelectorDialogComponent, {
      data: {
        sourceKey: 'products',
        dataset: dataset
      },
      width: '450px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container'
    }).afterClosed().subscribe((result: any) => {
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
