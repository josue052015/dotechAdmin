import { Component, OnInit, inject, ViewChild, effect, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { LocationService } from '../../../core/services/location.service';
import { Order } from '../../../core/models/order.model';
import { Observable } from 'rxjs';

interface ColumnFilter {
  operator: 'eq' | 'neq';
  values: string[];
}

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, FormsModule, MatTableModule,
    MatPaginatorModule, MatSortModule, LucideAngularModule, MatProgressSpinnerModule,
    MatMenuModule, MatCheckboxModule
  ],
  template: `
    <div class="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <!-- Top Actions Row -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Orders List</h1>
          <p class="text-slate-400 text-[10px] md:text-xs font-semibold uppercase tracking-widest mt-0.5">Real-time monitoring of all sales channels</p>
        </div>
        
        <div class="flex items-center space-x-2 w-full sm:w-auto" [formGroup]="filterForm">
            <div class="relative flex-1 sm:w-64 md:w-80 group">
              <lucide-icon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 md:w-5 md:h-5 group-focus-within:text-primary transition-colors"></lucide-icon>
              <input type="text" formControlName="search" 
                     placeholder="Search..." 
                     class="input-stitch pl-12 md:pl-14 h-10 md:h-12 text-sm">
            </div>
           
           <button routerLink="/orders/new" class="bg-blue-600 hover:bg-blue-700 text-white p-2.5 md:p-3 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 flex items-center justify-center">
              <lucide-icon name="plus" class="w-5 h-5 md:w-6 md:h-6"></lucide-icon>
           </button>
        </div>
      </div>

      <!-- Filters Grid (Responsive Layout) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
         <ng-container *ngIf="orderService.isLoading()">
            <div *ngFor="let i of [1,2,3,4]" class="h-10 md:h-12 rounded-xl skeleton"></div>
         </ng-container>

         <ng-container *ngIf="!orderService.isLoading()">
            <div class="relative group" [formGroup]="filterForm">
               <div class="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-focus-within:bg-blue-50 group-focus-within:border-blue-100 transition-colors">
                  <lucide-icon name="activity" class="text-slate-400 w-3.5 h-3.5"></lucide-icon>
               </div>
               <select formControlName="status" class="select-stitch h-10 md:h-12 pl-14 pr-10 font-bold text-xs">
                  <option value="">All Statuses</option>
                  <option *ngFor="let s of statuses" [value]="s">{{ s | titlecase }}</option>
               </select>
               <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 pointer-events-none"></lucide-icon>
            </div>

            <div class="relative group" [formGroup]="filterForm">
               <div class="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-focus-within:bg-blue-50 group-focus-within:border-blue-100 transition-colors">
                  <lucide-icon name="map-pin" class="text-slate-400 w-3.5 h-3.5"></lucide-icon>
               </div>
               <select formControlName="province" class="select-stitch h-10 md:h-12 pl-14 pr-10 font-bold text-xs">
                  <option value="">All Provinces</option>
                  <option *ngFor="let prov of provinces$ | async" [value]="prov">{{ prov }}</option>
               </select>
               <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 pointer-events-none"></lucide-icon>
            </div>

            <div class="relative group" [formGroup]="filterForm">
               <div class="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-focus-within:bg-blue-50 group-focus-within:border-blue-100 transition-colors">
                  <lucide-icon name="package" class="text-slate-400 w-3.5 h-3.5"></lucide-icon>
               </div>
               <select formControlName="product" class="select-stitch h-10 md:h-12 pl-14 pr-10 font-bold text-xs">
                  <option value="">All Products</option>
                  <option *ngFor="let p of products()" [value]="p.name">{{ p.name }}</option>
               </select>
               <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 pointer-events-none"></lucide-icon>
            </div>

            <div class="relative group" [formGroup]="filterForm">
               <div class="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-focus-within:bg-blue-50 group-focus-within:border-blue-100 transition-colors">
                  <lucide-icon name="truck" class="text-slate-400 w-3.5 h-3.5"></lucide-icon>
               </div>
               <select formControlName="carrier" class="select-stitch h-10 md:h-12 pl-14 pr-10 font-bold text-xs">
                  <option value="">All Carriers</option>
                  <option *ngFor="let c of carriers" [value]="c">{{ c | titlecase }}</option>
               </select>
               <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 pointer-events-none"></lucide-icon>
            </div>
         </ng-container>
      </div>

      <!-- Advanced Column Filters (Adaptive / Mobile First) -->
      <div class="flex flex-col space-y-3 px-1 md:hidden" *ngIf="!orderService.isLoading()">
         <div class="flex items-center justify-between">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter by Column</p>
            <button *ngIf="hasActiveColumnFilters()" (click)="columnFilters.set({})" class="text-[9px] font-bold text-primary active:scale-95 uppercase tracking-tighter">Clear All</button>
         </div>
         <div class="flex flex-wrap gap-2 pb-1 overflow-x-auto no-scrollbar">
            <button *ngFor="let col of filterableColumns" 
                    [matMenuTriggerFor]="filterMenu"
                    (click)="$event.stopPropagation()"
                    [class.bg-blue-600]="isColumnFiltered(col.id)"
                    [class.text-white]="isColumnFiltered(col.id)"
                    [class.border-transparent]="isColumnFiltered(col.id)"
                    [class.shadow-md]="isColumnFiltered(col.id)"
                    class="px-4 py-2 rounded-xl border border-slate-100 bg-white text-[10px] font-bold uppercase transition-all flex items-center space-x-2 active:scale-95 shadow-sm whitespace-nowrap">
               <span>{{ col.label }}</span>
               <lucide-icon [name]="isColumnFiltered(col.id) ? 'check' : 'chevron-down'" class="w-3 h-3"></lucide-icon>
               <mat-menu #filterMenu="matMenu" class="filter-menu-popover">
                  <ng-container *ngTemplateOutlet="filterTemplate; context: { column: col.id }"></ng-container>
               </mat-menu>
            </button>
         </div>
      </div>

      <!-- Main Table Container -->
      <div class="card-stitch flex flex-col bg-white overflow-hidden min-h-[500px]">
        
        <div class="relative flex-1 overflow-auto custom-scrollbar">
          
          <!-- Desktop Table Skeleton (md+) -->
          <div *ngIf="orderService.isLoading()" class="hidden md:block">
            <table class="table-stitch">
              <thead>
                <tr>
                  <th *ngFor="let col of filterableColumns">{{col.label}}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let i of [1,2,3,4,5,6,7,8]">
                  <td *ngFor="let col of filterableColumns">
                    <div class="h-5 w-5/6 rounded-lg skeleton"></div>
                  </td>
                  <td><div class="w-8 h-8 rounded-lg skeleton"></div></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Card Skeleton (<md) -->
          <div *ngIf="orderService.isLoading()" class="md:hidden flex flex-col gap-4 p-4">
             <div *ngFor="let i of [1,2,3,4]" class="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
                <div class="flex justify-between items-start">
                   <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 rounded-xl skeleton"></div>
                      <div class="space-y-2">
                         <div class="h-4 w-24 rounded skeleton"></div>
                         <div class="h-3 w-16 rounded skeleton"></div>
                      </div>
                   </div>
                   <div class="w-16 h-5 rounded-full skeleton"></div>
                </div>
                <div class="h-20 bg-slate-50 rounded-xl skeleton"></div>
                <div class="flex justify-between items-end">
                   <div class="space-y-2 w-1/3">
                      <div class="h-2 w-12 rounded skeleton"></div>
                      <div class="h-5 w-full rounded skeleton"></div>
                   </div>
                   <div class="w-10 h-10 rounded-lg skeleton"></div>
                </div>
             </div>
          </div>

          <!-- Actual Content (Visible when NOT loading) -->
          <div *ngIf="!orderService.isLoading()" class="animate-in fade-in duration-500">
            <!-- Desktop Table View -->
            <div class="hidden md:block">
              <table mat-table [dataSource]="dataSource" matSort class="table-stitch">
              
              <!-- Date Column -->
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>
                   <div class="flex items-center space-x-2">
                      <span>Date</span>
                      <button [matMenuTriggerFor]="filterMenu" (click)="$event.stopPropagation()" class="p-1 hover:bg-slate-200 rounded transition-colors" [class.text-primary]="isColumnFiltered('date')">
                         <lucide-icon name="filter" class="w-3 h-3"></lucide-icon>
                      </button>
                      <mat-menu #filterMenu="matMenu" class="filter-menu-popover">
                         <ng-container *ngTemplateOutlet="filterTemplate; context: { column: 'date' }"></ng-container>
                      </mat-menu>
                   </div>
                </th>
                <td mat-cell *matCellDef="let row">
                  <span class="text-xs font-medium text-slate-500">{{ row.date | date:'dd/MM/yy' }}</span>
                </td>
              </ng-container>

              <!-- Customer Column -->
              <ng-container matColumnDef="customer">
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="w-1/4">
                   <div class="flex items-center space-x-2">
                      <span>Customer</span>
                      <button [matMenuTriggerFor]="filterMenu" (click)="$event.stopPropagation()" class="p-1 hover:bg-slate-200 rounded transition-colors" [class.text-primary]="isColumnFiltered('customer')">
                         <lucide-icon name="filter" class="w-3 h-3"></lucide-icon>
                      </button>
                      <mat-menu #filterMenu="matMenu" class="filter-menu-popover">
                         <ng-container *ngTemplateOutlet="filterTemplate; context: { column: 'customer' }"></ng-container>
                      </mat-menu>
                   </div>
                </th>
                <td mat-cell *matCellDef="let row">
                  <div class="flex items-center space-x-4">
                     <div class="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shadow-sm">
                        {{ row.fullName.charAt(0) }}{{ row.fullName.split(' ')[1]?.charAt(0) || '' }}
                     </div>
                     <div class="flex flex-col">
                        <span class="text-sm font-bold leading-tight">{{row.fullName}}</span>
                        <span class="text-[10px] font-bold text-text-muted uppercase tracking-tighter mt-0.5">ID: {{row.id || row['_rowNumber']}}</span>
                     </div>
                  </div>
                </td>
              </ng-container>

              <!-- Phone Column -->
              <ng-container matColumnDef="phone">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>
                   <div class="flex items-center space-x-2">
                      <span>Phone</span>
                      <button [matMenuTriggerFor]="filterMenu" (click)="$event.stopPropagation()" class="p-1 hover:bg-slate-200 rounded transition-colors" [class.text-primary]="isColumnFiltered('phone')">
                         <lucide-icon name="filter" class="w-3 h-3"></lucide-icon>
                      </button>
                      <mat-menu #filterMenu="matMenu" class="filter-menu-popover">
                         <ng-container *ngTemplateOutlet="filterTemplate; context: { column: 'phone' }"></ng-container>
                      </mat-menu>
                   </div>
                </th>
                <td mat-cell *matCellDef="let row">
                  <div class="flex items-center space-x-2">
                    <lucide-icon name="phone" class="text-text-muted w-4 h-4"></lucide-icon>
                    <span class="text-xs font-bold">{{row.phone}}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Product Column -->
              <ng-container matColumnDef="product">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="productName">
                   <div class="flex items-center space-x-2">
                      <span>Product</span>
                      <button [matMenuTriggerFor]="filterMenu" (click)="$event.stopPropagation()" class="p-1 hover:bg-slate-200 rounded transition-colors" [class.text-primary]="isColumnFiltered('product')">
                         <lucide-icon name="filter" class="w-3 h-3"></lucide-icon>
                      </button>
                      <mat-menu #filterMenu="matMenu" class="filter-menu-popover">
                         <ng-container *ngTemplateOutlet="filterTemplate; context: { column: 'product' }"></ng-container>
                      </mat-menu>
                   </div>
                </th>
                <td mat-cell *matCellDef="let row">
                  <span class="text-xs font-semibold leading-relaxed">{{row.productName}}</span>
                </td>
              </ng-container>

              <!-- Quantity Column -->
              <ng-container matColumnDef="qty">
                <th mat-header-cell *matHeaderCellDef class="text-center">
                   <div class="flex items-center justify-center space-x-2">
                      <span>Qty</span>
                      <button [matMenuTriggerFor]="filterMenu" (click)="$event.stopPropagation()" class="p-1 hover:bg-slate-200 rounded transition-colors" [class.text-primary]="isColumnFiltered('qty')">
                         <lucide-icon name="filter" class="w-3 h-3"></lucide-icon>
                      </button>
                      <mat-menu #filterMenu="matMenu" class="filter-menu-popover">
                         <ng-container *ngTemplateOutlet="filterTemplate; context: { column: 'qty' }"></ng-container>
                      </mat-menu>
                   </div>
                </th>
                <td mat-cell *matCellDef="let row" class="text-center">
                  <span class="text-xs font-bold px-2 py-1 rounded-md bg-slate-100">{{row.productQuantity}}</span>
                </td>
              </ng-container>

              <!-- Price Column -->
              <ng-container matColumnDef="price">
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="text-right">
                   <div class="flex items-center justify-end space-x-2">
                      <span>Price</span>
                      <button [matMenuTriggerFor]="filterMenu" (click)="$event.stopPropagation()" class="p-1 hover:bg-slate-200 rounded transition-colors" [class.text-primary]="isColumnFiltered('price')">
                         <lucide-icon name="filter" class="w-3 h-3"></lucide-icon>
                      </button>
                      <mat-menu #filterMenu="matMenu" class="filter-menu-popover">
                         <ng-container *ngTemplateOutlet="filterTemplate; context: { column: 'price' }"></ng-container>
                      </mat-menu>
                   </div>
                </th>
                <td mat-cell *matCellDef="let row" class="text-right">
                  <span class="text-sm font-black">RD$ {{(row.productPrice * row.productQuantity) + (row.shippingCost || 0) + (row.packaging || 0) | number:'1.2-2'}}</span>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="text-center">
                   <div class="flex items-center justify-center space-x-2">
                      <span>Status</span>
                      <button [matMenuTriggerFor]="filterMenu" (click)="$event.stopPropagation()" class="p-1 hover:bg-slate-200 rounded transition-colors" [class.text-primary]="isColumnFiltered('status')">
                         <lucide-icon name="filter" class="w-3 h-3"></lucide-icon>
                      </button>
                      <mat-menu #filterMenu="matMenu" class="filter-menu-popover">
                         <ng-container *ngTemplateOutlet="filterTemplate; context: { column: 'status' }"></ng-container>
                      </mat-menu>
                   </div>
                </th>
                <td mat-cell *matCellDef="let row" class="text-center">
                  <div [class]="getStatusClass(row.status)" class="inline-flex items-center px-3 py-1 rounded-pill text-[10px] font-bold uppercase tracking-wider">
                     {{row.status}}
                  </div>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="text-right"> </th>
                <td mat-cell *matCellDef="let row" class="text-right">
                  <button [routerLink]="['/orders', row['_rowNumber']]" class="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-90 group focus:outline-none">
                    <lucide-icon name="chevron-right" class="w-5 h-5 group-hover:translate-x-0.5 transition-transform"></lucide-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="cursor-pointer group" [routerLink]="['/orders', row['_rowNumber']]"></tr>

              <!-- No Data Row -->
              <tr class="mat-row bg-white" *matNoDataRow>
                <td class="px-6 py-24 text-center" colspan="8">
                  <div class="flex flex-col items-center">
                     <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                        <lucide-icon name="search" class="w-10 h-10 text-slate-200" [strokeWidth]="1.5"></lucide-icon>
                     </div>
                     <h3 class="text-lg font-bold">No orders found</h3>
                     <p class="text-sm text-text-muted font-medium max-w-xs mx-auto mt-2">Adjust your filters or search keywords to find what you're looking for.</p>
                     <button (click)="resetFilters()" class="mt-8 text-primary font-bold hover:underline flex items-center space-x-2">
                         <span>Clear all filters</span>
                     </button>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Mobile Card View -->
          <div class="md:hidden flex flex-col gap-4 p-4">
             <div *ngFor="let row of dataSource.filteredData" [routerLink]="['/orders', row['_rowNumber']]" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 active:bg-slate-50 transition-colors space-y-4">
                <div class="flex justify-between items-start">
                   <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                         {{ row.fullName.charAt(0) }}{{ row.fullName.split(' ')[1]?.charAt(0) || '' }}
                      </div>
                      <div class="flex flex-col min-w-0">
                         <p class="text-sm font-bold text-slate-900 leading-tight truncate max-w-[140px]">{{row.fullName}}</p>
                         <div class="flex items-center space-x-2 mt-0.5 text-[10px] font-bold text-slate-400">
                            <span>ID: {{row.id || row['_rowNumber']}}</span>
                            <span>•</span>
                            <span class="text-primary/70">{{row.date | date:'dd/MM/yy'}}</span>
                         </div>
                      </div>
                   </div>
                   <div [class]="getStatusClass(row.status)" class="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                      {{row.status}}
                   </div>
                </div>

                <div class="bg-slate-50/50 rounded-xl p-3 border border-slate-100/50 space-y-2">
                   <div class="flex items-center justify-between text-xs">
                      <span class="text-slate-400 font-semibold">Product</span>
                      <span class="text-slate-900 font-bold truncate ml-4">{{row.productName}}</span>
                   </div>
                   <div class="flex items-center justify-between text-xs">
                      <span class="text-slate-400 font-semibold">Quantity</span>
                      <span class="text-slate-900 font-bold">{{row.productQuantity}} units</span>
                   </div>
                   <div class="flex items-center justify-between text-xs">
                      <span class="text-slate-400 font-semibold">Phone</span>
                      <div class="flex items-center space-x-1.5 font-bold text-slate-900">
                         <lucide-icon name="phone" class="w-3 h-3 text-slate-400"></lucide-icon>
                         <span>{{row.phone}}</span>
                      </div>
                   </div>
                </div>

                <div class="flex justify-between items-center pt-1 px-1">
                   <div class="flex flex-col">
                      <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Total Amount</span>
                      <span class="text-base font-black text-slate-900 tracking-tight">RD$ {{(row.productPrice * row.productQuantity) + (row.shippingCost || 0) + (row.packaging || 0) | number:'1.2-2'}}</span>
                   </div>
                   <button class="bg-slate-900 text-white p-2 rounded-lg shadow-sm">
                      <lucide-icon name="chevron-right" class="w-4 h-4"></lucide-icon>
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>

         <!-- Styled Paginator -->
         <div *ngIf="!orderService.isLoading()" class="px-4 md:px-8 py-4 md:py-5 border-t border-slate-100 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center md:text-left">
               Showing <span class="text-slate-900">{{ dataSource.filteredData.length === 0 ? 0 : (paginator ? paginator.pageIndex * paginator.pageSize + 1 : 1) }}</span> to 
               <span class="text-slate-900">{{ paginator ? Math.min((paginator.pageIndex + 1) * paginator.pageSize, dataSource.filteredData.length) : Math.min(10, dataSource.filteredData.length) }}</span> 
               of <span class="text-slate-900">{{ dataSource.filteredData.length }}</span> results
            </div>
            <mat-paginator [pageSizeOptions]="[10, 25, 50]" class="!bg-transparent !border-none !text-xs !font-bold" hidePageSize></mat-paginator>
         </div>
      </div>
    </div>

    <!-- Filter Popover Template -->
    <ng-template #filterTemplate let-col="column">
       <div class="p-4 bg-white min-w-[240px] max-w-[300px]" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
             <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter By {{ col | titlecase }}</span>
             <button (click)="clearColumnFilter(col)" class="text-[9px] font-bold text-primary hover:underline uppercase">Clear</button>
          </div>

          <!-- Operator Toggle -->
          <div class="flex bg-slate-100 p-1 rounded-lg mb-4">
             <button (click)="setOperator(col, 'eq')" 
                     [class.bg-white]="getColumnOperator(col) === 'eq'"
                     [class.shadow-sm]="getColumnOperator(col) === 'eq'"
                     class="flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all">Equal To</button>
             <button (click)="setOperator(col, 'neq')" 
                     [class.bg-white]="getColumnOperator(col) === 'neq'"
                     [class.shadow-sm]="getColumnOperator(col) === 'neq'"
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
       </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    ::ng-deep .mat-mdc-paginator-container { justify-content: flex-end !important; min-height: auto !important; }
    ::ng-deep .filter-menu-popover { border-radius: 16px !important; overflow: hidden !important; border: 1px solid #f1f5f9 !important; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important; }
  `]
})
export class OrderListComponent implements OnInit, AfterViewInit {
  public orderService = inject(OrderService);
  public productService = inject(ProductService);
  public locationService = inject(LocationService);
  private fb = inject(FormBuilder);
  public Math = Math;

  displayedColumns: string[] = ['date', 'customer', 'phone', 'product', 'qty', 'price', 'status', 'actions'];
  dataSource: MatTableDataSource<Order> = new MatTableDataSource();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  products = this.productService.products;
  provinces$ = this.locationService.getProvinces();

  statuses = [
    'cancelado', 'desaparecido', 'no confirmado',
    'pendiente de ubicacion', 'confirmado completo',
    'empacado', 'envio en proceso', 'entregado', 'dinero recibido'
  ];

  carriers = ['envio local', 'aurel pack', 'gintracom'];

  filterableColumns = [
    { id: 'date', label: 'Date' },
    { id: 'id', label: 'Order ID' },
    { id: 'customer', label: 'Customer' },
    { id: 'phone', label: 'Phone' },
    { id: 'product', label: 'Product' },
    { id: 'status', label: 'Status' },
    { id: 'qty', label: 'Quantity' },
    { id: 'price', label: 'Total' }
  ];

  filterForm: FormGroup = this.fb.group({
    search: [''],
    status: [''],
    product: [''],
    province: [''],
    carrier: ['']
  });

  // Advanced Column Filters
  columnFilters = signal<{ [key: string]: ColumnFilter }>({});

  constructor() {
    effect(() => {
      const data = this.orderService.orders();
      this.dataSource.data = data;
    });

    effect(() => {
      // Access signal to register dependency
      this.columnFilters(); 
      this.applyFilters();
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.orderService.loadOrders();
    this.productService.loadProducts();
    this.dataSource.filterPredicate = this.createFilter();

    // Consolidate filter updates
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
      if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
      }
    });
  }

  applyFilters() {
    const colFilters = this.columnFilters();
    const formValues = this.filterForm.value;
    // We add a timestamp to force the filter to re-run even if terms seem same
    this.dataSource.filter = JSON.stringify({ ...formValues, colFilters, _ts: Date.now() });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'price': return (item.productPrice * item.productQuantity) + (item.shippingCost || 0) + (item.packaging || 0);
        case 'customer': return item.fullName.toLowerCase();
        default: return (item as any)[property];
      }
    };
  }

  resetFilters() {
    this.filterForm.reset({
      search: '',
      status: '',
      product: '',
      province: '',
      carrier: ''
    });
    this.columnFilters.set({});
  }

  hasActiveColumnFilters(): boolean {
    return Object.keys(this.columnFilters()).length > 0;
  }

  // Advanced Filter Helpers
  isColumnFiltered(col: string): boolean {
    const filter = this.columnFilters()[col];
    return !!filter && filter.values.length > 0;
  }

  getColumnOperator(col: string): 'eq' | 'neq' {
    return this.columnFilters()[col]?.operator || 'eq';
  }

  setOperator(col: string, op: 'eq' | 'neq') {
    const current = this.columnFilters();
    const colFilter = current[col] || { operator: 'eq', values: [] };
    this.columnFilters.set({
      ...current,
      [col]: { ...colFilter, operator: op }
    });
  }

  toggleColumnValue(col: string, val: string) {
    const current = this.columnFilters();
    const colFilter = current[col] || { operator: 'eq', values: [] };
    const index = colFilter.values.indexOf(val);
    
    let newValues = [...colFilter.values];
    if (index > -1) {
      newValues.splice(index, 1);
    } else {
      newValues.push(val);
    }

    this.columnFilters.set({
      ...current,
      [col]: { ...colFilter, values: newValues }
    });
  }

  isValSelected(col: string, val: string): boolean {
    return (this.columnFilters()[col]?.values || []).includes(val);
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
      // Unselect all currently visible unique values
      newValues = newValues.filter(v => !uniqueVals.includes(v));
    } else {
      // Select all currently visible unique values
      uniqueVals.forEach(v => {
        if (!newValues.includes(v)) newValues.push(v);
      });
    }

    this.columnFilters.set({
      ...current,
      [col]: { ...colFilter, values: newValues }
    });
  }

  clearColumnFilter(col: string) {
    const current = this.columnFilters();
    const { [col]: removed, ...rest } = current;
    this.columnFilters.set(rest);
  }

  getUniqueValuesForCol(col: string, search: string = ''): string[] {
    const data = this.orderService.orders();
    let values = data.map(o => {
      if (col === 'customer') return o.fullName;
      if (col === 'product') return o.productName;
      if (col === 'qty') return o.productQuantity;
      if (col === 'price') return (o.productPrice * o.productQuantity) + (o.shippingCost || 0) + (o.packaging || 0);
      return (o as any)[col];
    });

    let unique = Array.from(new Set(values.map(v => String(v || '')))).sort();
    if (search) {
      unique = unique.filter(v => v.toLowerCase().includes(search.toLowerCase()));
    }
    return unique;
  }

  private createFilter(): (data: Order, filter: string) => boolean {
    return (data: Order, filter: string): boolean => {
      let filterTerms;
      try {
        filterTerms = JSON.parse(filter);
      } catch (e) {
        return true;
      }

      const { colFilters, ...searchTerms } = filterTerms;

      // 1. Basic Filters (Search & Dropdowns)
      const matchSearch = searchTerms.search ?
        (data.fullName?.toLowerCase().includes(searchTerms.search.toLowerCase()) ||
          data.phone?.includes(searchTerms.search) ||
          data.id?.toString().includes(searchTerms.search)) : true;

      const matchStatus = searchTerms.status ? data.status?.toLowerCase() === searchTerms.status.toLowerCase() : true;
      const matchProduct = searchTerms.product ? data.productName?.toLowerCase() === searchTerms.product.toLowerCase() : true;
      const matchProvince = searchTerms.province ? data.province?.toLowerCase() === searchTerms.province.toLowerCase() : true;
      const matchCarrier = searchTerms.carrier ? (data.carrier?.toLowerCase() || 'envio local') === searchTerms.carrier.toLowerCase() : true;

      if (!matchSearch || !matchStatus || !matchProduct || !matchProvince || !matchCarrier) return false;

      // 2. Advanced Column Filters
      for (const col in colFilters) {
        const f = colFilters[col];
        if (!f || f.values.length === 0) continue;

        let val: any = '';
        if (col === 'customer') val = data.fullName;
        else if (col === 'product') val = data.productName;
        else if (col === 'qty') val = data.productQuantity;
        else if (col === 'price') val = (data.productPrice * data.productQuantity) + (data.shippingCost || 0) + (data.packaging || 0);
        else val = (data as any)[col];

        const valStr = String(val || '');
        const isIncluded = f.values.includes(valStr);

        if (f.operator === 'eq' && !isIncluded) return false;
        if (f.operator === 'neq' && isIncluded) return false;
      }

      return true;
    };
  }

  private normalize(s: string): string {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  getStatusClass(status: string): string {
    const s = this.normalize(status || '');
    if (s === 'cancelado') return 'bg-[#ebd9fc] text-[#5e2b97]';
    if (s === 'desaparecido') return 'bg-[#542b7c] text-white';
    if (s === 'no confirmado') return 'bg-[#f0f0f0] text-[#4a4a4a]';
    if (s === 'pendiente de ubicacion') return 'bg-[#fce0e3] text-[#cc2936]';
    if (s === 'confirmado completo') return 'bg-[#fff2b2] text-[#b08d1a]';
    if (s === 'empacado') return 'bg-[#d2ecb9] text-[#285b28]';
    if (s === 'envio en proceso') return 'bg-[#c3e4fc] text-[#1e5d94]';
    if (s === 'entregado') return 'bg-[#c30010] text-white';
    if (s === 'dinero recibido') return 'bg-[#0b4f9a] text-white';
    return 'bg-slate-100 text-slate-500';
  }
}
