import { Component, OnInit, inject, effect, signal, AfterViewInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { StatusSelectorDialogComponent } from '../../../shared/components/status-selector-dialog/status-selector-dialog.component';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { OrderDetailComponent } from '../order-detail/order-detail.component';
import { DateFilterService } from '../../../core/services/date-filter.service';
import { ExportSelectorDialogComponent } from '../../../shared/components/export-selector-dialog/export-selector-dialog.component';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { LocationService } from '../../../core/services/location.service';
import { Order } from '../../../core/models/order.model';
import { Observable } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MessageService } from '../../../core/services/message.service';
import { ExportTemplateService } from '../../../core/services/export-template.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { WhatsappSelectorDialogComponent } from '../../../shared/components/whatsapp-selector-dialog/whatsapp-selector-dialog.component';
import { MatTableDataSource } from '@angular/material/table';

interface ColumnFilter {
  operator: 'eq' | 'neq';
  values: string[];
}

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, FormsModule, MatTableModule,
    LucideAngularModule, MatProgressSpinnerModule, ScrollingModule,
    MatMenuModule, MatCheckboxModule, MatSnackBarModule, MatDialogModule
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

           <button (click)="openExportDialog()" 
                   class="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 md:p-3 rounded-xl shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all active:scale-95 flex items-center justify-center"
                   title="Export to Excel">
              <lucide-icon name="file-spreadsheet" class="w-5 h-5 md:w-6 md:h-6"></lucide-icon>
           </button>
           
           <button routerLink="/orders/new" class="bg-blue-600 hover:bg-blue-700 text-white p-2.5 md:p-3 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 flex items-center justify-center">
              <lucide-icon name="plus" class="w-5 h-5 md:w-6 md:h-6"></lucide-icon>
           </button>
        </div>
      </div>

      <!-- Filters Grid (Responsive Layout) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
         <ng-container *ngIf="orderService.isLoading()">
            <div *ngFor="let i of [1,2,3,4,5]" class="h-14 rounded-2xl skeleton"></div>
         </ng-container>

         <ng-container *ngIf="!orderService.isLoading()">
            <!-- Date Filter -->
            <div class="relative group" [formGroup]="filterForm">
               <div class="card-stitch flex items-center h-14 px-4 bg-white hover:border-primary/30 transition-all cursor-pointer">
                  <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-focus-within:bg-blue-50 group-focus-within:border-blue-100 transition-colors mr-4">
                     <lucide-icon name="calendar" class="text-slate-400 w-4 h-4"></lucide-icon>
                  </div>
                  <div class="flex-1 relative">
                     <select #dateRangeSelect (change)="onDateRangeChange(dateRangeSelect.value)" class="w-full bg-transparent border-none focus:ring-0 font-bold text-sm text-slate-700 appearance-none pr-8">
                        <option value="all" [selected]="dateFilterService.activeRangeType() === 'all'">All Time</option>
                        <option value="today" [selected]="dateFilterService.activeRangeType() === 'today'">Today</option>
                        <option value="7days" [selected]="dateFilterService.activeRangeType() === '7days'">Last 7 Days</option>
                        <option value="month" [selected]="dateFilterService.activeRangeType() === 'month'">This Month</option>
                        <option value="custom" [selected]="dateFilterService.activeRangeType() === 'custom'">Custom Range</option>
                     </select>
                     <lucide-icon name="chevron-down" class="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none"></lucide-icon>
                  </div>
               </div>
            </div>

            <!-- Status Filter -->
            <div class="relative group" [formGroup]="filterForm">
               <div class="card-stitch flex items-center h-14 px-4 bg-white hover:border-primary/30 transition-all cursor-pointer">
                  <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-focus-within:bg-blue-50 group-focus-within:border-blue-100 transition-colors mr-4">
                     <lucide-icon name="activity" class="text-slate-400 w-4 h-4"></lucide-icon>
                  </div>
                  <div class="flex-1 relative">
                     <select formControlName="status" class="w-full bg-transparent border-none focus:ring-0 font-bold text-sm text-slate-700 appearance-none pr-8">
                        <option value="">All Statuses</option>
                        <option *ngFor="let s of statuses" [value]="s">{{ s | titlecase }}</option>
                     </select>
                     <lucide-icon name="chevron-down" class="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none"></lucide-icon>
                  </div>
               </div>
            </div>

            <!-- Province Filter -->
            <div class="relative group" [formGroup]="filterForm">
               <div class="card-stitch flex items-center h-14 px-4 bg-white hover:border-primary/30 transition-all cursor-pointer">
                  <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-focus-within:bg-blue-50 group-focus-within:border-blue-100 transition-colors mr-4">
                     <lucide-icon name="map-pin" class="text-slate-400 w-4 h-4"></lucide-icon>
                  </div>
                  <div class="flex-1 relative">
                     <select formControlName="province" class="w-full bg-transparent border-none focus:ring-0 font-bold text-sm text-slate-700 appearance-none pr-8">
                        <option value="">All Provinces</option>
                        <option *ngFor="let prov of provinces$ | async" [value]="prov">{{ prov }}</option>
                     </select>
                     <lucide-icon name="chevron-down" class="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none"></lucide-icon>
                  </div>
               </div>
            </div>

            <!-- Product Filter -->
            <div class="relative group" [formGroup]="filterForm">
               <div class="card-stitch flex items-center h-14 px-4 bg-white hover:border-primary/30 transition-all cursor-pointer">
                  <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-focus-within:bg-blue-50 group-focus-within:border-blue-100 transition-colors mr-4">
                     <lucide-icon name="package" class="text-slate-400 w-4 h-4"></lucide-icon>
                  </div>
                  <div class="flex-1 relative">
                     <select formControlName="product" class="w-full bg-transparent border-none focus:ring-0 font-bold text-sm text-slate-700 appearance-none pr-8">
                        <option value="">All Products</option>
                        <option *ngFor="let p of products()" [value]="p.name">{{ p.name }}</option>
                     </select>
                     <lucide-icon name="chevron-down" class="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none"></lucide-icon>
                  </div>
               </div>
            </div>

            <!-- Carrier Filter -->
            <div class="relative group" [formGroup]="filterForm">
               <div class="card-stitch flex items-center h-14 px-4 bg-white hover:border-primary/30 transition-all cursor-pointer">
                  <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-focus-within:bg-blue-50 group-focus-within:border-blue-100 transition-colors mr-4">
                     <lucide-icon name="truck" class="text-slate-400 w-4 h-4"></lucide-icon>
                  </div>
                  <div class="flex-1 relative">
                     <select formControlName="carrier" class="w-full bg-transparent border-none focus:ring-0 font-bold text-sm text-slate-700 appearance-none pr-8">
                        <option value="">All Carriers</option>
                        <option *ngFor="let c of carriers" [value]="c">{{ c | titlecase }}</option>
                     </select>
                     <lucide-icon name="chevron-down" class="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none"></lucide-icon>
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

       <!-- Custom Date Range Inputs -->
       <div *ngIf="dateFilterService.activeRangeType() === 'custom'" 
            class="p-4 bg-white rounded-2xl border border-slate-100 animate-in slide-in-from-top-2 duration-300">
          <div class="flex items-center justify-between mb-4">
             <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rango de Fecha</span>
             <button (click)="onDateRangeChange('all')" class="text-[10px] font-bold text-primary uppercase hover:underline">Limpiar Rango</button>
          </div>
          <div class="flex flex-col sm:flex-row gap-4">
            <div class="flex-1 space-y-1.5">
               <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Inicio</label>
               <div class="relative group">
                  <lucide-icon name="calendar" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 group-focus-within:text-primary transition-colors"></lucide-icon>
                  <input type="date" #start [value]="dateFilterService.formatDateForInput(dateFilterService.customRange().start)" 
                         (change)="onCustomDateChange(start.value, end.value)"
                         class="input-stitch pl-11 h-11 text-xs font-bold uppercase">
               </div>
            </div>
            <div class="flex-1 space-y-1.5">
               <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Fin</label>
               <div class="relative group">
                  <lucide-icon name="calendar" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 group-focus-within:text-primary transition-colors"></lucide-icon>
                  <input type="date" #end [value]="dateFilterService.formatDateForInput(dateFilterService.customRange().end)" 
                         (change)="onCustomDateChange(start.value, end.value)"
                         class="input-stitch pl-11 h-11 text-xs font-bold uppercase">
               </div>
            </div>
          </div>
       </div>


      <!-- Main Table Container -->
      <div class="card-stitch bg-white overflow-hidden min-h-[500px] flex flex-col">
        <div class="relative flex-1 flex flex-col min-h-0">
          
          <!-- Loading Skeletons (Only when truly empty) -->
          <div *ngIf="orderService.isLoading() && orderService.listState().visibleRows.length === 0" class="flex-1 overflow-auto">
            <!-- Desktop Table Skeleton -->
            <div class="hidden md:block">
              <div class="hidden md:grid grid-cols-8 gap-4 px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                <div *ngFor="let col of [1,2,3,4,5,6,7,8]" class="h-3 w-16 bg-slate-200 rounded animate-pulse"></div>
              </div>
              <div *ngFor="let row of [1,2,3,4,5,6,7,8]" class="grid grid-cols-8 gap-4 px-6 py-6 border-b border-slate-50 items-center">
                <div class="h-4 w-20 bg-slate-100 rounded animate-pulse"></div>
                <div class="col-span-2 flex items-center space-x-4">
                  <div class="w-10 h-10 rounded-full bg-slate-100 animate-pulse"></div>
                  <div class="space-y-2 flex-1">
                    <div class="h-4 w-32 bg-slate-100 rounded animate-pulse"></div>
                    <div class="h-3 w-20 bg-slate-100 rounded animate-pulse"></div>
                  </div>
                </div>
                <div class="h-4 w-24 bg-slate-100 rounded animate-pulse"></div>
                <div class="h-4 w-28 bg-slate-100 rounded animate-pulse"></div>
                <div class="h-6 w-10 bg-slate-100 rounded-md animate-pulse"></div>
                <div class="h-4 w-20 bg-slate-100 rounded animate-pulse"></div>
                <div class="h-8 w-24 bg-slate-100 rounded-full animate-pulse"></div>
              </div>
            </div>

            <!-- Mobile Card Skeleton -->
            <div class="md:hidden flex flex-col gap-4 p-4">
               <div *ngFor="let i of [1,2,3,4]" class="bg-white rounded-2xl border border-slate-100 p-5 space-y-5 shadow-sm">
                  <div class="flex justify-between items-start">
                     <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 rounded-xl bg-slate-100 animate-pulse"></div>
                        <div class="space-y-2">
                           <div class="h-5 w-32 bg-slate-100 rounded animate-pulse"></div>
                           <div class="h-3 w-20 bg-slate-100 rounded animate-pulse"></div>
                        </div>
                     </div>
                     <div class="w-20 h-6 rounded-full bg-slate-100 animate-pulse"></div>
                  </div>
                  <div class="h-24 bg-slate-50 rounded-2xl animate-pulse"></div>
                  <div class="flex justify-between items-end">
                     <div class="space-y-3 w-1/3">
                        <div class="h-3 w-12 bg-slate-100 rounded animate-pulse"></div>
                        <div class="h-6 w-full bg-slate-100 rounded animate-pulse"></div>
                     </div>
                     <div class="w-12 h-12 rounded-xl bg-slate-100 animate-pulse"></div>
                  </div>
               </div>
            </div>
          </div>

          <!-- Actual Content -->
          <div *ngIf="visibleRows().length > 0 || !orderService.isLoading()" class="flex-1 flex flex-col">
            


            <!-- Empty State -->
            <div *ngIf="!orderService.isLoading() && orderService.listState().visibleRows.length === 0" 
                 class="flex flex-col items-center justify-center py-24 px-6 text-center animate-fade-in">
              <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <lucide-icon name="package-open" class="w-12 h-12 text-slate-300"></lucide-icon>
              </div>
              <h3 class="text-xl font-bold text-slate-800 mb-2">No se encontraron órdenes</h3>
              <p class="text-slate-500 max-w-sm">
                No hay registros que coincidan con los filtros seleccionados o la base de datos está vacía.
              </p>
              <button (click)="orderService.initLargeList()" 
                      class="mt-8 px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                Reintentar carga
              </button>
            </div>

            <!-- Desktop Header -->
            <div class="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/50 border-b border-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-400 sticky top-0 z-10">
               <div class="col-span-1 flex items-center space-x-2">
                  <span>Date</span>
                  <button [matMenuTriggerFor]="dateFilterMenu" (click)="$event.stopPropagation()" class="p-1 hover:bg-slate-200 rounded transition-colors" [class.text-primary]="isColumnFiltered('date')">
                     <lucide-icon name="filter" class="w-3 h-3"></lucide-icon>
                  </button>
                  <mat-menu #dateFilterMenu="matMenu" class="filter-menu-popover">
                     <ng-container *ngTemplateOutlet="filterTemplate; context: { column: 'date' }"></ng-container>
                  </mat-menu>
               </div>
               <div class="col-span-2 flex items-center space-x-2">
                  <span>Customer</span>
                  <button [matMenuTriggerFor]="customerFilterMenu" (click)="$event.stopPropagation()" class="p-1 hover:bg-slate-200 rounded transition-colors" [class.text-primary]="isColumnFiltered('customer')">
                     <lucide-icon name="filter" class="w-3 h-3"></lucide-icon>
                  </button>
                  <mat-menu #customerFilterMenu="matMenu" class="filter-menu-popover">
                     <ng-container *ngTemplateOutlet="filterTemplate; context: { column: 'customer' }"></ng-container>
                  </mat-menu>
               </div>
               <div class="col-span-2 flex items-center space-x-2">
                  <span>Phone</span>
                  <button [matMenuTriggerFor]="phoneFilterMenu" (click)="$event.stopPropagation()" class="p-1 hover:bg-slate-200 rounded transition-colors" [class.text-primary]="isColumnFiltered('phone')">
                     <lucide-icon name="filter" class="w-3 h-3"></lucide-icon>
                  </button>
                  <mat-menu #phoneFilterMenu="matMenu" class="filter-menu-popover">
                     <ng-container *ngTemplateOutlet="filterTemplate; context: { column: 'phone' }"></ng-container>
                  </mat-menu>
               </div>
               <div class="col-span-3 flex items-center space-x-2">
                  <span>Product</span>
                  <button [matMenuTriggerFor]="productFilterMenu" (click)="$event.stopPropagation()" class="p-1 hover:bg-slate-200 rounded transition-colors" [class.text-primary]="isColumnFiltered('product')">
                     <lucide-icon name="filter" class="w-3 h-3"></lucide-icon>
                  </button>
                  <mat-menu #productFilterMenu="matMenu" class="filter-menu-popover">
                     <ng-container *ngTemplateOutlet="filterTemplate; context: { column: 'product' }"></ng-container>
                  </mat-menu>
               </div>
               <div class="col-span-1 flex items-center justify-start space-x-2">
                  <span>Qty</span>
                  <button [matMenuTriggerFor]="qtyFilterMenu" (click)="$event.stopPropagation()" class="p-1 hover:bg-slate-200 rounded transition-colors" [class.text-primary]="isColumnFiltered('qty')">
                     <lucide-icon name="filter" class="w-3 h-3"></lucide-icon>
                  </button>
                  <mat-menu #qtyFilterMenu="matMenu" class="filter-menu-popover">
                     <ng-container *ngTemplateOutlet="filterTemplate; context: { column: 'qty' }"></ng-container>
                  </mat-menu>
               </div>
               <div class="col-span-1 flex items-center justify-start space-x-2">
                  <span>Price</span>
                  <button [matMenuTriggerFor]="priceFilterMenu" (click)="$event.stopPropagation()" class="p-1 hover:bg-slate-200 rounded transition-colors" [class.text-primary]="isColumnFiltered('price')">
                     <lucide-icon name="filter" class="w-3 h-3"></lucide-icon>
                  </button>
                  <mat-menu #priceFilterMenu="matMenu" class="filter-menu-popover">
                     <ng-container *ngTemplateOutlet="filterTemplate; context: { column: 'price' }"></ng-container>
                  </mat-menu>
               </div>
               <div class="col-span-1 flex items-center justify-start space-x-2">
                  <span>Status</span>
                  <button [matMenuTriggerFor]="statusFilterMenu" (click)="$event.stopPropagation()" class="p-1 hover:bg-slate-200 rounded transition-colors" [class.text-primary]="isColumnFiltered('status')">
                     <lucide-icon name="filter" class="w-3 h-3"></lucide-icon>
                  </button>
                  <mat-menu #statusFilterMenu="matMenu" class="filter-menu-popover">
                     <ng-container *ngTemplateOutlet="filterTemplate; context: { column: 'status' }"></ng-container>
                  </mat-menu>
               </div>
               <div class="col-span-1"></div>
            </div>

            <!-- Virtual Scroll Viewport -->
            <cdk-virtual-scroll-viewport itemSize="72" class="flex-1 custom-scrollbar h-[600px]">
              <!-- Desktop Rows -->
              <!-- Row Container (One per item) -->
              <div *cdkVirtualFor="let row of visibleRows(); trackBy: trackByRowNumber">
                <!-- Desktop Layout -->
                <div (click)="openOrderDetail(row)"
                     class="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-50 hover:bg-blue-50/30 transition-all cursor-pointer items-center group">
                  
                  <div class="col-span-1 text-[11px] font-bold text-slate-500 italic">{{ row.date | date:'dd/MM/yy' }}</div>
                  
                  <div class="col-span-2 flex items-center space-x-4">
                    <div class="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shadow-sm">
                      {{ row.fullName?.charAt(0) || 'C' }}{{ row.fullName?.split(' ')?.[1]?.charAt(0) || '' }}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="text-sm font-bold leading-tight truncate uppercase" [class.text-red-600]="!row.fullName || row.fullName.toLowerCase() === 'cliente sin identificar'">{{row.fullName || 'Cliente sin identificar'}}</span>
                      <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">ID: {{row.id}}</span>
                    </div>
                  </div>

                  <div class="col-span-2 flex items-center space-x-2" *ngIf="row.phone">
                    <lucide-icon name="phone" class="text-slate-400 w-3.5 h-3.5"></lucide-icon>
                    <span class="text-xs font-bold text-slate-600">{{row.phone}}</span>
                  </div>
                  <div class="col-span-2" *ngIf="!row.phone"></div>

                  <div class="col-span-3 text-xs font-bold leading-relaxed truncate text-slate-700">{{row.productName}}</div>
                  
                  <div class="col-span-1 text-left">
                    <span class="text-xs font-bold text-slate-900">{{row.productQuantity}}</span>
                  </div>

                  <div class="col-span-1 text-left text-sm font-black text-slate-900 whitespace-nowrap italic">
                    RD$ {{(row.productPrice * row.productQuantity) + (row.shippingCost || 0) + (row.packaging || 0) | number:'1.2-2'}}
                  </div>

                  <div class="col-span-1 flex justify-start items-center">
                    <div [class]="getStatusClass(row.status)" (click)="openStatusSelector(row); $event.stopPropagation()" class="inline-flex items-center px-3 py-1 rounded-pill text-[9px] font-black uppercase tracking-wider cursor-pointer hover:brightness-95 active:scale-95 transition-all">
                        {{row.status}}
                        <lucide-icon name="chevron-down" class="ml-1 w-2.5 h-2.5 text-current opacity-70"></lucide-icon>
                    </div>
                  </div>

                  <div class="col-span-1 flex items-center justify-end space-x-2 transition-all duration-200">
                     <button (click)="openWhatsApp(row); $event.stopPropagation()" class="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors">
                        <lucide-icon name="message-square" class="w-4 h-4"></lucide-icon>
                     </button>
                     <button (click)="confirmDelete(row); $event.stopPropagation()" class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                        <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
                     </button>
                     <div class="p-1.5 text-slate-400">
                        <lucide-icon name="chevron-right" class="w-4 h-4"></lucide-icon>
                     </div>
                  </div>
                </div>

                <!-- Mobile Layout -->
                <div (click)="openOrderDetail(row)"
                     class="md:hidden p-4 border-b border-slate-50">
                   <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 active:bg-slate-50 transition-all space-y-6">
                      
                      <!-- Card Header -->
                      <div class="flex justify-between items-start">
                         <div class="flex items-center space-x-4">
                            <!-- Avatar -->
                            <div class="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-sm font-black text-primary shadow-sm uppercase">
                               {{ row.fullName?.charAt(0) || 'C' }}{{ row.fullName?.split(' ')?.[1]?.charAt(0) || '' }}
                            </div>
                            <div class="flex flex-col min-w-0">
                               <h4 class="text-base font-black text-slate-800 leading-tight truncate max-w-[160px]">{{row.fullName || 'Cliente sin identificar'}}</h4>
                               <div class="flex items-center space-x-2 mt-1 text-[11px] font-bold text-slate-400">
                                  <span>ID: #{{row.id}}</span>
                                  <span>•</span>
                                  <span class="text-primary/70">{{row.date | date:'dd/MM/yy'}}</span>
                               </div>
                            </div>
                         </div>
                         
                         <!-- Status Badge -->
                         <div [class]="getStatusClass(row.status)" [matMenuTriggerFor]="mobileStatusMenu" (click)="$event.stopPropagation()" 
                              class="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest cursor-pointer flex items-center space-x-1.5 shadow-sm border border-transparent">
                             <span>{{row.status}}</span>
                             <lucide-icon name="chevron-down" class="w-3 h-3"></lucide-icon>
                         </div>
                         <mat-menu #mobileStatusMenu="matMenu" class="status-menu-popover">
                             <button mat-menu-item *ngFor="let s of statuses" (click)="updateStatus(row, s)">
                                <span class="text-xs font-bold" [class.text-primary]="row.status === s">{{ s | titlecase }}</span>
                             </button>
                         </mat-menu>
                      </div>

                      <!-- Inner Info Card -->
                      <div class="bg-slate-50/70 rounded-3xl p-5 space-y-4 border border-slate-100/50">
                         <div class="flex items-start justify-between">
                            <span class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Product</span>
                            <span class="text-xs font-bold text-slate-700 text-right ml-6 flex-1 line-clamp-2 leading-relaxed">{{row.productName}}</span>
                         </div>
                         <div class="flex items-center justify-between border-t border-slate-100 pt-3">
                            <span class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Quantity</span>
                            <span class="text-xs font-black text-slate-900">{{row.productQuantity}} units</span>
                         </div>
                         <div class="flex items-center justify-between border-t border-slate-100 pt-3" *ngIf="row.phone">
                            <span class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Phone</span>
                            <div class="flex items-center space-x-2 font-bold text-slate-600 text-xs">
                               <lucide-icon name="phone" class="w-3.5 h-3.5 text-slate-300"></lucide-icon>
                               <span>{{row.phone}}</span>
                            </div>
                         </div>
                      </div>

                      <!-- Action Footer -->
                      <div class="flex items-center justify-between pt-2">
                         <div class="flex items-center space-x-3">
                             <button (click)="openWhatsApp(row); $event.stopPropagation()" 
                                     class="flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-emerald-100 active:scale-95 transition-all shadow-sm">
                                 <lucide-icon name="message-square" class="w-4 h-4"></lucide-icon>
                                 <span>WhatsApp</span>
                             </button>
                             <button (click)="confirmDelete(row); $event.stopPropagation()" 
                                     class="w-12 h-12 flex items-center justify-center text-rose-500 bg-rose-50 rounded-2xl hover:bg-rose-100 active:scale-90 transition-all shadow-sm">
                                 <lucide-icon name="trash-2" class="w-5 h-5"></lucide-icon>
                             </button>
                         </div>
                         
                         <div class="flex items-center space-x-4">
                            <div class="flex flex-col items-end">
                               <span class="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Total Amount</span>
                               <span class="text-lg font-black text-slate-900 italic tracking-tight">RD$ {{(row.productPrice * row.productQuantity) + (row.shippingCost || 0) + (row.packaging || 0) | number:'1.2-2'}}</span>
                            </div>
                            <button class="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-2xl shadow-xl shadow-slate-200 active:scale-90 transition-all">
                               <lucide-icon name="chevron-right" class="w-5 h-5"></lucide-icon>
                            </button>
                         </div>
                      </div>
                   </div>
                </div>
              </div>

              <!-- Loading Indicator at bottom -->
              <div *ngIf="orderService.listState().isLoadingMore" class="p-8 flex justify-center items-center">
                <mat-spinner diameter="24"></mat-spinner>
                <span class="ml-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cargando más registros...</span>
              </div>
              
              <!-- End of list Indicator -->
              <div *ngIf="!orderService.listState().hasMore && visibleRows().length > 0" class="p-8 text-center">
                <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Has llegado al final de la lista</span>
              </div>
            </cdk-virtual-scroll-viewport>
          </div>
        </div>
      </div>

         <!-- Styled Footer (Stats instead of Paginator) -->
         <div *ngIf="!orderService.isLoading()" class="px-4 md:px-8 py-4 md:py-5 border-t border-slate-100 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center md:text-left flex items-center space-x-4">
               <div>Mostrando <span class="text-slate-900">{{ visibleRows().length }}</span> registros cargados</div>
               <div *ngIf="orderService.listState().isFiltering" class="flex items-center space-x-2 text-primary animate-pulse">
                  <div class="w-1.5 h-1.5 rounded-full bg-current"></div>
                  <span>Buscando en todos los registros...</span>
               </div>
            </div>
            <div class="flex items-center space-x-4">
               <span class="text-[10px] font-bold text-slate-400 uppercase">Scroll para cargar más</span>
               <lucide-icon name="mouse-pointer-2" class="w-3.5 h-3.5 text-slate-300 animate-bounce"></lucide-icon>
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
    cdk-virtual-scroll-viewport { display: block; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    ::ng-deep .mat-mdc-paginator-container { justify-content: flex-end !important; min-height: auto !important; }
    ::ng-deep .filter-menu-popover { border-radius: 16px !important; overflow: hidden !important; border: 1px solid #f1f5f9 !important; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important; }
    
    .skeleton {
      background: linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
    }

    @keyframes skeleton-loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .card-stitch {
       box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
    }
  `]
})
export class OrderListComponent implements OnInit, AfterViewInit {
  public orderService = inject(OrderService);
  public productService = inject(ProductService);
  public locationService = inject(LocationService);
  public dateFilterService = inject(DateFilterService);
  private messageService = inject(MessageService);
  private exportTemplateService = inject(ExportTemplateService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private confirmService = inject(ConfirmService);
  public Math = Math;

  displayedColumns: string[] = ['date', 'customer', 'phone', 'product', 'qty', 'price', 'status', 'actions'];
  dataSource: MatTableDataSource<Order> = new MatTableDataSource();

  products = computed(() => {
    const orders = this.orderService.orders();
    const uniqueNames = [...new Set(orders.map(o => o.productName).filter(Boolean))];
    return uniqueNames.map(name => ({ name }));
  });
  provinces$ = this.locationService.getProvinces();

  statuses = [
    'cancelado', 'desaparecido', 'no confirmado',
    'pendiente de ubicacion', 'confirmado completo', 'no cobertura',
    'empacado', 'envio en proceso', 'entregado', 'dinero recibido'
  ];

  carriers = ['envio local', 'aurel pack', 'gintracom'];
  visibleRows = computed(() => this.orderService.listState().visibleRows);
  
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
  activeFilterCol = '';
  columnDefs = [
    { id: 'date', label: 'Date' },
    { id: 'id', label: 'Order ID' },
    { id: 'customer', label: 'Customer' },
    { id: 'status', label: 'Status' },
    { id: 'province', label: 'Province' },
    { id: 'product', label: 'Product' },
    { id: 'total', label: 'Total' }
  ];

  columnFilters = signal<{ [key: string]: ColumnFilter }>({});

  constructor() {
    effect(() => {
      // Access signals to register dependencies
      this.columnFilters(); 
      this.dateFilterService.activeRangeType();
      this.dateFilterService.customRange();
      this.applyFilters();
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.orderService.initLargeList();
    this.exportTemplateService.loadTemplates(true).subscribe();
    this.messageService.loadTemplates(true).subscribe();

    // Consolidate filter updates
    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  applyFilters() {
    const colFilters = this.columnFilters();
    const formValues = this.filterForm.value;
    const dateRange = this.dateFilterService.currentRange();
    
    this.orderService.applyQuery({ 
      ...formValues, 
      columnFilters: colFilters, 
      dateRange: { 
        start: dateRange.start ? (dateRange.start as Date).getTime() : null, 
        end: dateRange.end ? (dateRange.end as Date).getTime() : null 
      }
    });
  }

  onDateRangeChange(type: any) {
    this.dateFilterService.setRangeType(type);
  }

  onCustomDateChange(start: string, end: string) {
    const parseLocal = (s: string) => {
      if (!s) return null;
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    const startDate = parseLocal(start);
    const endDate = parseLocal(end);
    this.dateFilterService.setCustomRange(startDate, endDate);
  }

  openOrderDetail(order: Order) {
    this.dialog.open(OrderDetailComponent, {
      data: { order },
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'custom-dialog-container'
    });
  }

  ngAfterViewInit() {
    // CDK Sort and Paginator are no longer used with manual state
  }

  onScroll(index: number) {
    const total = this.visibleRows().length;
    if (index > total - 20) {
      this.orderService.loadMoreChunk();
    }
  }

  trackByRowNumber(index: number, item: any) {
    return item['_rowNumber'] || item.id || index;
  }

  openStatusSelector(row: Order) {
    const dialogRef = this.dialog.open(StatusSelectorDialogComponent, {
      data: { 
        statuses: this.statuses,
        currentStatus: row.status
      },
      width: '400px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe((status: any) => {
      if (status) {
        this.updateStatus(row, status);
      }
    });
  }

  updateStatus(order: Order, newStatus: string) {
    if (order.status === newStatus) return;
    const updatedOrder = { ...order, status: newStatus };
    this.orderService.updateOrder(order['_rowNumber']!, updatedOrder).subscribe({
      next: () => this.snackBar.open(`Status updated to ${newStatus}`, 'Close', { duration: 3000 }),
      error: () => this.snackBar.open('Error updating status', 'Close', { duration: 3000 })
    });
  }

  openWhatsApp(row: Order) {
    const templates = this.messageService.templates();
    const dialogRef = this.dialog.open(WhatsappSelectorDialogComponent, {
      data: { templates },
      width: '400px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe((template: any) => {
      if (template) {
        const url = this.messageService.generateWhatsAppUrl(row, template.text);
        window.open(url, '_blank');
      }
    });
  }

  openExportDialog() {
    const isFiltering = this.orderService.listState().isFiltering || !!this.filterForm.get('search')?.value;
    const dataset = isFiltering ? this.visibleRows() : this.orderService.allRecords();

    const dialogRef = this.dialog.open(ExportSelectorDialogComponent, {
      data: {
        sourceKey: 'orders',
        dataset: dataset
      },
      width: '450px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result === 'GOTO') {
        this.router.navigate(['/export-templates']);
      }
    });
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
    const data = this.orderService.allRecords();
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

  private normalize(s: string): string {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  getStatusClass(status: string): string {
    const s = this.normalize(status || '');
    if (s === 'cancelado') return 'bg-[#ebd9fc] text-[#5e2b97]';
    if (s === 'desaparecido') return 'bg-[#542b7c] text-white';
    if (s === 'no confirmado') return 'bg-[#f0f0f0] text-[#4a4a4a]';
    if (s === 'pendiente de ubicacion') return 'bg-[#fce0e3] text-[#cc2936]';
    if (s === 'confirmado completo' || s === 'no cobertura') return 'bg-[#fff2b2] text-[#b08d1a]';
    if (s === 'empacado') return 'bg-[#d2ecb9] text-[#285b28]';
    if (s === 'envio en proceso') return 'bg-[#c3e4fc] text-[#1e5d94]';
    if (s === 'entregado') return 'bg-[#c30010] text-white';
    if (s === 'dinero recibido') return 'bg-[#0b4f9a] text-white';
    return 'bg-slate-100 text-slate-500';
  }

  confirmDelete(order: Order) {
    this.confirmService.ask({
      title: 'Eliminar Pedido',
      message: `¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      isDanger: true
    }).subscribe(confirmed => {
      if (confirmed) {
        this.orderService.deleteOrder(order['_rowNumber']!).subscribe({
          next: () => this.snackBar.open('Pedido eliminado correctamente', 'Cerrar', { duration: 3000 }),
          error: () => this.snackBar.open('Error al eliminar el pedido', 'Cerrar', { duration: 3000 })
        });
      }
    });
  }
}
