import { Component, OnInit, inject, effect, signal, computed, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { WhatsappSelectorDialogComponent } from '../../../shared/components/whatsapp-selector-dialog/whatsapp-selector-dialog.component';
import { DateFilterService } from '../../../core/services/date-filter.service';
import { ExportSelectorDialogComponent } from '../../../shared/components/export-selector-dialog/export-selector-dialog.component';
import { AbandonedOrderService } from '../../../core/services/abandoned-order.service';
import { ProductService } from '../../../core/services/product.service';
import { LocationService } from '../../../core/services/location.service';
import { AbandonedOrder } from '../../../core/models/abandoned-order.model';
import { MessageService } from '../../../core/services/message.service';
import { ExportTemplateService } from '../../../core/services/export-template.service';
import { StatusSelectorDialogComponent } from '../../../shared/components/status-selector-dialog/status-selector-dialog.component';
import { AbandonedOrderDetailComponent } from '../abandoned-order-detail/abandoned-order-detail.component';


interface ColumnFilter {
  operator: 'eq' | 'neq';
  values: string[];
}

@Component({
  selector: 'app-abandoned-order-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, FormsModule, MatTableModule,
    LucideAngularModule, MatProgressSpinnerModule, ScrollingModule,
    MatMenuModule, MatCheckboxModule, MatSnackBarModule, MatDialogModule,
    AbandonedOrderDetailComponent
  ],
  template: `
    <div class="flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <!-- Top Actions Row -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Abandoned Orders</h1>
          <p class="text-slate-400 text-[10px] md:text-xs font-semibold uppercase tracking-widest mt-0.5">Recovery pipeline for incomplete orders</p>
        </div>
        
        <div class="flex items-center space-x-2 w-full sm:w-auto" [formGroup]="filterForm">
            <div class="relative flex-1 sm:w-64 md:w-80 group">
              <lucide-icon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 md:w-5 md:h-5 group-focus-within:text-primary transition-colors"></lucide-icon>
              <input type="text" formControlName="search" 
                     placeholder="Search abandoned orders..." 
                     class="input-stitch pl-12 md:pl-14 h-10 md:h-12 text-sm">
            </div>

           <button (click)="openExportDialog()" 
                   class="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 md:p-3 rounded-xl shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all active:scale-95 flex items-center justify-center"
                   title="Export to Excel">
              <lucide-icon name="file-spreadsheet" class="w-5 h-5 md:w-6 md:h-6"></lucide-icon>
           </button>
        </div>
      </div>

      <!-- Filters Grid (Responsive Layout) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
         <ng-container *ngIf="abandonedOrderService.isLoading()">
            <div *ngFor="let i of [1,2,3,4]" class="h-10 md:h-12 rounded-xl skeleton"></div>
         </ng-container>

         <ng-container *ngIf="!abandonedOrderService.isLoading()">
            <div class="relative group" [formGroup]="filterForm">
               <div class="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-focus-within:bg-blue-50 group-focus-within:border-blue-100 transition-colors">
                  <lucide-icon name="calendar" class="text-slate-400 w-3.5 h-3.5"></lucide-icon>
               </div>
               <select #dateRangeSelect (change)="onDateRangeChange(dateRangeSelect.value)" class="select-stitch h-10 md:h-12 pl-14 pr-10 font-bold text-xs">
                  <option value="all" [selected]="dateFilterService.activeRangeType() === 'all'">All Time</option>
                  <option value="today" [selected]="dateFilterService.activeRangeType() === 'today'">Today</option>
                  <option value="7days" [selected]="dateFilterService.activeRangeType() === '7days'">Last 7 Days</option>
                  <option value="month" [selected]="dateFilterService.activeRangeType() === 'month'">This Month</option>
                  <option value="custom" [selected]="dateFilterService.activeRangeType() === 'custom'">Custom Range</option>
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
                  <option *ngFor="let c of carriers()" [value]="c">{{ c }}</option>
               </select>
               <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 pointer-events-none"></lucide-icon>
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

      <!-- Main Table Container -->
      <div class="card-stitch bg-white overflow-hidden min-h-[500px] flex flex-col w-full max-w-full">
        <div class="relative flex-1 flex flex-col min-h-0 w-full">
          
          <!-- Loading Skeletons (Only when truly empty) -->
          <div *ngIf="abandonedOrderService.isLoading() && visibleRows().length === 0" class="flex-1 overflow-auto">
            <!-- Desktop Table Skeleton -->
            <div class="hidden md:block">
              <div class="hidden md:grid grid-cols-7 gap-4 px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                <div *ngFor="let col of [1,2,3,4,5,6,7]" class="h-3 w-16 bg-slate-200 rounded animate-pulse"></div>
              </div>
              <div *ngFor="let row of [1,2,3,4,5,6,7,8]" class="grid grid-cols-7 gap-4 px-6 py-6 border-b border-slate-50 items-center">
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
          <div *ngIf="visibleRows().length > 0 || !abandonedOrderService.isLoading()" class="flex-1 flex flex-col">
            


            <!-- Empty State -->
            <div *ngIf="!abandonedOrderService.isLoading() && visibleRows().length === 0" 
                 class="flex flex-col items-center justify-center py-24 px-6 text-center animate-fade-in">
              <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <lucide-icon name="package-open" class="w-12 h-12 text-slate-300"></lucide-icon>
              </div>
              <h3 class="text-xl font-bold text-slate-800 mb-2">No hay pedidos abandonados</h3>
              <p class="text-slate-500 max-w-sm">
                No hay registros que coincidan con los filtros seleccionados o la base de datos estÃ¡ vacÃ­a.
              </p>
              <button (click)="abandonedOrderService.initLargeList()" 
                      class="mt-8 px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                Reintentar carga
              </button>
            </div>

            <!-- Desktop Header -->
            <div class="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/50 border-b border-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-400 sticky top-0 z-10">
               <div class="col-span-1">Date</div>
               <div class="col-span-3">Customer</div>
               <div class="col-span-2">Phone</div>
               <div class="col-span-3">Product</div>
               <div class="col-span-1">Qty</div>
               <div class="col-span-1">Price</div>
               <div class="col-span-1"></div>
            </div>

            <div class="flex-1 w-full">
              <!-- Desktop Rows -->
              <ng-container *ngFor="let row of visibleRows(); trackBy: trackByRowNumber">
                  @defer (on viewport) {
                  <div (click)="openOrderDetail(row)"
                       class="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-50 hover:bg-blue-50/30 transition-all cursor-pointer items-center group">
                  
                  <div class="col-span-1 text-[11px] font-bold text-slate-500 italic">{{ row.date | date:'dd/MM/yy' }}</div>
                  
                  <div class="col-span-2 flex items-center space-x-4">
                    <div class="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shadow-sm">
                      {{ row.fullName?.charAt(0) || 'C' }}{{ row.fullName?.split(' ')?.[1]?.charAt(0) || '' }}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="text-sm font-bold leading-tight truncate uppercase" [class.text-red-600]="!row.fullName || row.fullName.toLowerCase() === 'cliente sin identificar'">{{row.fullName || 'Cliente sin identificar'}}</span>
                      <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">ID: #{{row.id}}</span>
                    </div>
                  </div>

                  <div class="col-span-2 flex items-center space-x-2" *ngIf="row.phone">
                    <lucide-icon name="phone" class="text-slate-400 w-3.5 h-3.5"></lucide-icon>
                    <span class="text-xs font-bold text-slate-600">{{row.phone}}</span>
                  </div>
                  <div class="col-span-2" *ngIf="!row.phone"></div>

                  <div class="col-span-3 text-xs font-bold leading-relaxed truncate text-slate-700">{{row.productName}}</div>
                  
                  <div class="col-span-1 text-left">
                    <span class="text-xs font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-md">{{row.productQuantity}}</span>
                  </div>

                  <div class="col-span-1 text-left text-sm font-black text-slate-900 whitespace-nowrap italic">
                    RD$ {{(row.productPrice * row.productQuantity) + (row.shippingCost || 0) + (row.packaging || 0) | number:'1.2-2'}}
                  </div>

                  <div class="col-span-1 flex items-center justify-end space-x-2">
                     <button (click)="openWhatsApp(row); $event.stopPropagation()" class="p-1.5 text-emerald-500 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-lg transition-all active:scale-90">
                        <lucide-icon name="message-square" class="w-4 h-4"></lucide-icon>
                     </button>
                     <div class="p-1.5 text-slate-400">
                        <lucide-icon name="chevron-right" class="w-4 h-4"></lucide-icon>
                     </div>
                  </div>
                  </div>
                  } @placeholder {
                    <div class="hidden md:grid grid-cols-12 gap-4 px-6 py-6 border-b border-slate-50 items-center animate-pulse">
                      <div class="col-span-1 h-3 bg-slate-100 rounded w-12"></div>
                      <div class="col-span-2 flex items-center space-x-4">
                        <div class="w-10 h-10 rounded-full bg-slate-100"></div>
                        <div class="space-y-2 flex-1">
                          <div class="h-4 bg-slate-100 rounded w-24"></div>
                          <div class="h-2 bg-slate-100 rounded w-12"></div>
                        </div>
                      </div>
                      <div class="col-span-2 h-3 bg-slate-100 rounded w-20"></div>
                      <div class="col-span-3 h-3 bg-slate-100 rounded w-32"></div>
                      <div class="col-span-1 h-3 bg-slate-100 rounded w-8"></div>
                      <div class="col-span-1 h-4 bg-slate-100 rounded w-16"></div>
                      <div class="col-span-1 h-4 bg-slate-100 rounded w-8"></div>
                    </div>
                  }

                  <!-- Mobile Layout -->
                  @defer (on viewport) {
                  <div (click)="openOrderDetail(row)"
                        class="md:hidden p-4 border-b border-slate-200/60 hover:bg-slate-50/50 odd:bg-slate-50/20 transition-colors">
                   <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 active:bg-slate-50 transition-colors space-y-4">
                      <div class="flex justify-between items-start gap-2">
                         <div class="flex items-center space-x-3 min-w-0">
                            <div class="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                               {{ row.fullName?.charAt(0) || 'C' }}{{ row.fullName?.split(' ')?.[1]?.charAt(0) || '' }}
                            </div>
                            <div class="flex flex-col min-w-0">
                               <p class="text-sm font-bold leading-tight truncate" [class.text-red-600]="!row.fullName || row.fullName.toLowerCase() === 'cliente sin identificar'">{{row.fullName || 'Cliente sin identificar'}}</p>
                               <div class="flex flex-wrap items-center gap-x-2 mt-0.5 text-[10px] font-bold text-slate-400">
                                   <span>#{{row.id}}</span>
                                  <span class="hidden xs:inline">•</span>
                                  <span class="text-primary/70">{{row.date | date:'dd/MM/yy'}}</span>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div class="bg-slate-50/50 rounded-xl p-3 border border-slate-100/50 space-y-2">
                         <div class="flex items-start justify-between gap-4">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0">Product</span>
                            <span class="text-[11px] font-bold text-slate-900 text-right min-w-0 truncate leading-relaxed block">{{row.productName}}</span>
                         </div>
                         <div class="flex items-center justify-between border-t border-slate-100 pt-2">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</span>
                            <span class="text-[11px] font-bold text-slate-900">{{row.productQuantity}} units</span>
                         </div>
                         <div class="flex items-center justify-between border-t border-slate-100 pt-2" *ngIf="row.phone">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</span>
                            <span class="text-[11px] font-bold text-slate-600">{{row.phone}}</span>
                         </div>
                      </div>

                      <div class="flex items-center justify-between pt-1">
                         <button (click)="openWhatsApp(row); $event.stopPropagation()" class="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border border-emerald-100">
                            <lucide-icon name="message-square" class="w-3.5 h-3.5"></lucide-icon>
                            <span>WhatsApp</span>
                         </button>
                         <div class="flex flex-col items-end">
                            <span class="text-[14px] font-black text-slate-900 italic">RD$ {{(row.productPrice * row.productQuantity) + (row.shippingCost || 0) + (row.packaging || 0) | number}}</span>
                         </div>
                      </div>
                   </div>
                  </div>
                  } @placeholder {
                    <div class="md:hidden p-4 border-b border-slate-50">
                      <div class="bg-white rounded-2xl border border-slate-100 p-4 space-y-4 animate-pulse">
                        <div class="flex items-center space-x-3">
                          <div class="w-10 h-10 rounded-xl bg-slate-100"></div>
                          <div class="space-y-2 flex-1">
                            <div class="h-4 bg-slate-100 rounded w-32"></div>
                            <div class="h-2 bg-slate-100 rounded w-16"></div>
                          </div>
                        </div>
                        <div class="h-20 bg-slate-50 rounded-xl"></div>
                        <div class="flex justify-between items-center">
                          <div class="h-8 bg-slate-100 rounded-xl w-24"></div>
                          <div class="h-8 bg-slate-100 rounded-xl w-20"></div>
                        </div>
                      </div>
                    </div>
                  }
              </ng-container>

            </div>
          </div>
        </div>

         <!-- Styled Paginator -->
         <div *ngIf="!abandonedOrderService.isLoading()" class="px-4 md:px-8 py-4 md:py-5 border-t border-slate-100 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center md:text-left">
               Mostrando <span class="text-slate-900">{{ visibleRows().length }}</span> registros
            </div>
            <div class="flex items-center space-x-4">
               <button *ngIf="abandonedOrderService.listState().hasMore" 
                       (click)="abandonedOrderService.loadMoreChunk()"
                       class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95">
                  Cargar mÃ¡s pedidos
               </button>
               <div *ngIf="!abandonedOrderService.listState().hasMore && visibleRows().length > 0" class="flex items-center space-x-2 text-slate-300">
                  <span class="text-[10px] font-bold uppercase tracking-widest">Fin de la lista</span>
                  <lucide-icon name="check-circle" class="w-3.5 h-3.5"></lucide-icon>
               </div>
            </div>
         </div>
      </div>
    <!-- Filter Template (Reusable for all columns) -->
    <ng-template #filterTemplate let-column="column">
       <div class="bg-white p-4 w-[280px] flex flex-col space-y-4 shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-50 pb-3">
             <div class="flex flex-col">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar por</span>
                <span class="text-sm font-bold text-slate-900">{{column | titlecase}}</span>
             </div>
             <button (click)="clearColumnFilter(column)" class="text-[10px] font-bold text-primary hover:underline">Limpiar</button>
          </div>
          
          <div class="relative group">
             <lucide-icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-3.5 h-3.5 group-focus-within:text-primary transition-colors"></lucide-icon>
             <input #filterSearch type="text" placeholder="Buscar..." 
                    class="w-full bg-slate-50 border border-slate-100 rounded-lg pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all">
          </div>

          <div class="max-h-[220px] overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-1">
             <div class="flex items-center space-x-2 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer group" (click)="toggleSelectAll(column, filterSearch.value)">
                <mat-checkbox [checked]="isAllSelected(column, filterSearch.value)" [indeterminate]="isPartiallySelected(column, filterSearch.value)" color="primary" class="pointer-events-none"></mat-checkbox>
                <span class="text-[11px] font-bold text-slate-600 group-hover:text-slate-900">(Seleccionar Todo)</span>
             </div>
             
             <div *ngFor="let val of getUniqueValuesForCol(column, filterSearch.value)" 
                  class="flex items-center space-x-2 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer group"
                  (click)="toggleColumnValue(column, val)">
                <mat-checkbox [checked]="isColumnValueSelected(column, val)" color="primary" class="pointer-events-none"></mat-checkbox>
                <span class="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 truncate">{{val || '(Empty)'}}</span>
             </div>
          </div>

          <div class="pt-3 border-t border-slate-50 flex justify-between items-center">
             <div class="flex flex-col">
                <span class="text-[9px] font-bold text-slate-400 uppercase">Operador</span>
                <select [value]="columnFilters()[column]?.operator || 'eq'" 
                        (change)="setColumnOperator(column, $any($event.target).value)"
                        class="bg-transparent border-none p-0 text-[11px] font-black text-primary focus:ring-0 cursor-pointer">
                   <option value="eq">Es igual a</option>
                   <option value="neq">No es igual a</option>
                </select>
             </div>
             <button (click)="applyFilters()" class="bg-primary text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all">Aplicar</button>
          </div>
       </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .filter-menu-popover { border-radius: 16px !important; overflow: hidden !important; border: 1px solid #f1f5f9 !important; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AbandonedOrderListComponent implements OnInit {
  public isMobile = window.innerWidth < 768;
  public abandonedOrderService = inject(AbandonedOrderService);
  public productService = inject(ProductService);
  public locationService = inject(LocationService);
  public dateFilterService = inject(DateFilterService);
  private messageService = inject(MessageService);
  private exportTemplateService = inject(ExportTemplateService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  public Math = Math;

  visibleRows = computed(() => this.abandonedOrderService.listState().visibleRows);
  displayedColumns: string[] = ['date', 'customer', 'phone', 'product', 'qty', 'price', 'actions'];

  filterForm: FormGroup = this.fb.group({
    search: [''],
    product: [''],
    province: [''],
    carrier: ['']
  });

  activeFilterCol = '';
  columnDefs = [
    { id: 'date', label: 'Date' },
    { id: 'id', label: 'Order ID' },
    { id: 'customer', label: 'Customer' },
    { id: 'phone', label: 'Phone' },
    { id: 'product', label: 'Product' },
    { id: 'productQuantity', label: 'Quantity' },
    { id: 'total', label: 'Total' }
  ];

  carriers = computed(() => {
     const data = this.abandonedOrderService.allRecords();
     return Array.from(new Set(data.map(o => o.carrier).filter(Boolean))).sort();
  });

  columnFilters = signal<{ [key: string]: ColumnFilter }>({});
  provinces$ = this.locationService.getProvinces();
  products = computed(() => this.productService.products());

  ngOnInit() {
    this.abandonedOrderService.initLargeList();
    this.productService.initLargeList();
    this.messageService.loadTemplates(true).subscribe();
    this.exportTemplateService.loadTemplates(true).subscribe();

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
    
    this.abandonedOrderService.applyQuery({ 
      ...formValues, 
      columnFilters: colFilters, 
      dateRange: { 
        start: dateRange.start ? (dateRange.start as any).getTime() : null, 
        end: dateRange.end ? (dateRange.end as any).getTime() : null 
      }
    });
  }

  onDateRangeChange(type: any) {
    this.dateFilterService.setRangeType(type);
    this.applyFilters();
  }

  onScroll(index: number) {
    const total = this.visibleRows().length;
    if (index > total - 20) {
      this.abandonedOrderService.loadMoreChunk();
    }
  }

  trackByRowNumber(index: number, item: any) {
    return item['_rowNumber'] || item.id || index;
  }

  openExportDialog() {
    const isFiltering = this.abandonedOrderService.listState().isFiltering;
    const dataset = isFiltering ? this.visibleRows() : this.abandonedOrderService.allRecords();

    this.dialog.open(ExportSelectorDialogComponent, {
      data: {
        sourceKey: 'abandoned_orders',
        dataset: dataset
      },
      width: '450px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container'
    });
  }

  openOrderDetail(order: AbandonedOrder) {
     this.dialog.open(AbandonedOrderDetailComponent, {
       data: { order },
       width: '1200px',
       maxWidth: '95vw',
       maxHeight: '90vh',
       panelClass: 'custom-dialog-container'
     });
  }

  private snackBar = inject(MatSnackBar);

  openWhatsApp(row: AbandonedOrder) {
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

  // Column Filtering Logic
  isColumnFiltered(col: string): boolean {
    return !!this.columnFilters()[col];
  }

  isColumnValueSelected(col: string, val: string): boolean {
    const filter = this.columnFilters()[col];
    return filter ? filter.values.includes(val) : false;
  }

  toggleColumnValue(col: string, val: string) {
    const current = this.columnFilters();
    const colFilter = current[col] || { operator: 'eq', values: [] };
    
    let newValues = [...colFilter.values];
    const idx = newValues.indexOf(val);
    if (idx >= 0) newValues.splice(idx, 1);
    else newValues.push(val);

    if (newValues.length === 0) {
      this.clearColumnFilter(col);
    } else {
      this.columnFilters.set({
        ...current,
        [col]: { ...colFilter, values: newValues }
      });
    }
  }

  setColumnOperator(col: string, op: 'eq' | 'neq') {
    const current = this.columnFilters();
    if (!current[col]) return;
    this.columnFilters.set({
      ...current,
      [col]: { ...current[col], operator: op }
    });
  }

  getUniqueValuesForCol(col: string, search: string = ''): string[] {
    const data = this.abandonedOrderService.allRecords();
    let values = data.map(o => {
      if (col === 'id') return o.id;
      if (col === 'customer') return o.fullName;
      if (col === 'product') return o.productName;
      if (col === 'productQuantity' || col === 'qty') return o.productQuantity;
      if (col === 'total' || col === 'price') return (o.productPrice * o.productQuantity) + (o.shippingCost || 0) + (o.packaging || 0);
      return (o as any)[col];
    });

    let unique = Array.from(new Set(values.map(v => String(v || '')))).sort();
    if (search) {
      unique = unique.filter(v => v.toLowerCase().includes(search.toLowerCase()));
    }
    return unique;
  }

  isAllSelected(col: string, search: string = ''): boolean {
    const uniqueVals = this.getUniqueValuesForCol(col, search);
    const selected = this.columnFilters()[col]?.values || [];
    return uniqueVals.every(v => selected.includes(v));
  }

  isPartiallySelected(col: string, search: string = ''): boolean {
    const uniqueVals = this.getUniqueValuesForCol(col, search);
    const selected = this.columnFilters()[col]?.values || [];
    const some = uniqueVals.some(v => selected.includes(v));
    return some && !this.isAllSelected(col, search);
  }

  toggleSelectAll(col: string, search: string = '') {
    const uniqueVals = this.getUniqueValuesForCol(col, search);
    const isAll = this.isAllSelected(col, search);
    
    const current = this.columnFilters();
    const colFilter = current[col] || { operator: 'eq', values: [] };
    let newValues = [...colFilter.values];

    if (isAll) {
      newValues = newValues.filter(v => !uniqueVals.includes(v));
    } else {
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
    const current = { ...this.columnFilters() };
    delete current[col];
    this.columnFilters.set(current);
  }
}
