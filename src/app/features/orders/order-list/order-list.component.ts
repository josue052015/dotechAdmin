import { Component, OnInit, inject, ViewChild, effect, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { LocationService } from '../../../core/services/location.service';
import { Order } from '../../../core/models/order.model';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, FormsModule, MatTableModule,
    MatPaginatorModule, MatSortModule, LucideAngularModule, MatProgressSpinnerModule
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
                     class="input-stitch pl-10 md:pl-12 h-10 md:h-12 text-sm">
           </div>
           
           <button routerLink="/orders/new" class="bg-blue-600 hover:bg-blue-700 text-white p-2.5 md:p-3 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 flex items-center justify-center">
              <lucide-icon name="plus" class="w-5 h-5 md:w-6 md:h-6"></lucide-icon>
           </button>
        </div>
      </div>

      <!-- Filters Grid (Responsive Layout) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4" [formGroup]="filterForm">
         <div class="relative group">
            <div class="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-focus-within:bg-blue-50 group-focus-within:border-blue-100 transition-colors">
               <lucide-icon name="activity" class="text-slate-400 w-3.5 h-3.5"></lucide-icon>
            </div>
            <select formControlName="status" class="select-stitch h-10 md:h-12 pl-14 pr-10 font-bold text-xs">
               <option value="">All Statuses</option>
               <option *ngFor="let s of statuses" [value]="s">{{ s | titlecase }}</option>
            </select>
            <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 pointer-events-none"></lucide-icon>
         </div>

         <div class="relative group">
            <div class="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-focus-within:bg-blue-50 group-focus-within:border-blue-100 transition-colors">
               <lucide-icon name="map-pin" class="text-slate-400 w-3.5 h-3.5"></lucide-icon>
            </div>
            <select formControlName="province" class="select-stitch h-10 md:h-12 pl-14 pr-10 font-bold text-xs">
               <option value="">All Provinces</option>
               <option *ngFor="let prov of provinces$ | async" [value]="prov">{{ prov }}</option>
            </select>
            <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 pointer-events-none"></lucide-icon>
         </div>

         <div class="relative group">
            <div class="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-focus-within:bg-blue-50 group-focus-within:border-blue-100 transition-colors">
               <lucide-icon name="package" class="text-slate-400 w-3.5 h-3.5"></lucide-icon>
            </div>
            <select formControlName="product" class="select-stitch h-10 md:h-12 pl-14 pr-10 font-bold text-xs">
               <option value="">All Products</option>
               <option *ngFor="let p of products()" [value]="p.name">{{ p.name }}</option>
            </select>
            <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 pointer-events-none"></lucide-icon>
         </div>

         <div class="relative group">
            <div class="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-focus-within:bg-blue-50 group-focus-within:border-blue-100 transition-colors">
               <lucide-icon name="truck" class="text-slate-400 w-3.5 h-3.5"></lucide-icon>
            </div>
            <select formControlName="carrier" class="select-stitch h-10 md:h-12 pl-14 pr-10 font-bold text-xs">
               <option value="">All Carriers</option>
               <option *ngFor="let c of carriers" [value]="c">{{ c | titlecase }}</option>
            </select>
            <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 pointer-events-none"></lucide-icon>
         </div>
      </div>

      <!-- Main Table Container -->
      <div class="card-stitch flex flex-col bg-white overflow-hidden min-h-[500px]">
        
        <div class="relative flex-1 overflow-auto custom-scrollbar">
          <!-- Loading Overlay -->
          <div *ngIf="orderService.isLoading()" class="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10 transition-opacity">
            <mat-spinner diameter="40" strokeWidth="3"></mat-spinner>
          </div>

          <!-- Desktop Table View (Hidden on mobile) -->
          <div class="hidden md:block">
            <table mat-table [dataSource]="dataSource" matSort class="table-stitch">
              
              <!-- Customer Column -->
              <ng-container matColumnDef="customer">
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="w-1/4"> Customer </th>
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
                <th mat-header-cell *matHeaderCellDef mat-sort-header> Phone Number </th>
                <td mat-cell *matCellDef="let row">
                  <div class="flex items-center space-x-2">
                    <lucide-icon name="phone" class="text-text-muted w-4 h-4"></lucide-icon>
                    <span class="text-xs font-bold">{{row.phone}}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Product Column -->
              <ng-container matColumnDef="product">
                <th mat-header-cell *matHeaderCellDef mat-sort-header="productName"> Product </th>
                <td mat-cell *matCellDef="let row">
                  <span class="text-xs font-semibold leading-relaxed">{{row.productName}}</span>
                </td>
              </ng-container>

              <!-- Quantity Column -->
              <ng-container matColumnDef="qty">
                <th mat-header-cell *matHeaderCellDef class="text-center"> Qty </th>
                <td mat-cell *matCellDef="let row" class="text-center">
                  <span class="text-xs font-bold px-2 py-1 rounded-md bg-slate-100">{{row.productQuantity}}</span>
                </td>
              </ng-container>

              <!-- Price Column -->
              <ng-container matColumnDef="price">
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="text-right"> Price </th>
                <td mat-cell *matCellDef="let row" class="text-right">
                  <span class="text-sm font-black">RD$ {{(row.productPrice * row.productQuantity) + (row.shippingCost || 0) + (row.packaging || 0) | number:'1.2-2'}}</span>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="text-center"> Status </th>
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
                <td class="px-6 py-24 text-center" colspan="7">
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

          <!-- Mobile Card View (Displays on small screens) -->
          <div class="md:hidden divide-y divide-slate-50">
             <div *ngFor="let row of dataSource.filteredData" [routerLink]="['/orders', row['_rowNumber']]" class="p-4 active:bg-slate-50 transition-colors space-y-4">
                <div class="flex justify-between items-start">
                   <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                         {{ row.fullName.charAt(0) }}{{ row.fullName.split(' ')[1]?.charAt(0) || '' }}
                      </div>
                      <div>
                         <p class="text-sm font-bold text-slate-900 leading-tight truncate max-w-[140px]">{{row.fullName}}</p>
                         <p class="text-[10px] font-bold text-slate-400 mt-0.5">ID: {{row.id || row['_rowNumber']}}</p>
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

             <!-- No Data Mobile -->
             <div *ngIf="dataSource.filteredData.length === 0" class="p-12 text-center">
                <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                   <lucide-icon name="search" class="w-8 h-8 text-slate-300"></lucide-icon>
                </div>
                <p class="text-sm font-bold text-slate-900">No results found</p>
                <p class="text-xs text-slate-400 mt-1">Try changing your search or filters.</p>
                <button (click)="resetFilters()" class="mt-6 text-primary font-bold text-xs uppercase tracking-widest">Clear all</button>
             </div>
          </div>
        </div>

         <!-- Styled Paginator -->
         <div class="px-4 md:px-8 py-4 md:py-5 border-t border-slate-100 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center md:text-left">
               Showing <span class="text-slate-900">{{ dataSource.filteredData.length === 0 ? 0 : (paginator ? paginator.pageIndex * paginator.pageSize + 1 : 1) }}</span> to 
               <span class="text-slate-900">{{ paginator ? Math.min((paginator.pageIndex + 1) * paginator.pageSize, dataSource.filteredData.length) : Math.min(10, dataSource.filteredData.length) }}</span> 
               of <span class="text-slate-900">{{ dataSource.filteredData.length }}</span> results
            </div>
            <mat-paginator [pageSizeOptions]="[10, 25, 50]" class="!bg-transparent !border-none !text-xs !font-bold" hidePageSize></mat-paginator>
         </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    ::ng-deep .mat-mdc-paginator-container { justify-content: flex-end !important; min-height: auto !important; }
    ::ng-deep .mat-mdc-paginator-navigation-previous, 
    ::ng-deep .mat-mdc-paginator-navigation-next { 
      background: white !important; border: 1px solid #e2e8f0 !important; border-radius: 8px !important; margin: 0 4px !important; 
    }
  `]
})
export class OrderListComponent implements OnInit, AfterViewInit {
  public orderService = inject(OrderService);
  public productService = inject(ProductService);
  public locationService = inject(LocationService);
  private fb = inject(FormBuilder);
  public Math = Math;

  displayedColumns: string[] = ['customer', 'phone', 'product', 'qty', 'price', 'status', 'actions'];
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

  filterForm: FormGroup = this.fb.group({
    search: [''],
    status: [''],
    product: [''],
    province: [''],
    carrier: ['']
  });

  constructor() {
    effect(() => {
      const data = this.orderService.orders();
      this.dataSource.data = data;
    });
  }

  ngOnInit() {
    this.orderService.loadOrders();
    this.productService.loadProducts();
    this.dataSource.filterPredicate = this.createFilter();

    this.filterForm.valueChanges.subscribe(values => {
      this.dataSource.filter = JSON.stringify(values);
      if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
      }
    });
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
  }

  private createFilter(): (data: Order, filter: string) => boolean {
    return (data: Order, filter: string): boolean => {
      let searchTerms;
      try {
        searchTerms = JSON.parse(filter);
      } catch (e) {
        return true;
      }

      const matchSearch = searchTerms.search ?
        (data.fullName?.toLowerCase().includes(searchTerms.search.toLowerCase()) ||
          data.phone?.includes(searchTerms.search) ||
          data.id?.toString().includes(searchTerms.search)) : true;

      const matchStatus = searchTerms.status ? data.status?.toLowerCase() === searchTerms.status.toLowerCase() : true;
      const matchProduct = searchTerms.product ? data.productName?.toLowerCase() === searchTerms.product.toLowerCase() : true;
      const matchProvince = searchTerms.province ? data.province?.toLowerCase() === searchTerms.province.toLowerCase() : true;
      const matchCarrier = searchTerms.carrier ? (data.carrier?.toLowerCase() || 'envio local') === searchTerms.carrier.toLowerCase() : true;

      return Boolean(matchSearch && matchStatus && matchProduct && matchProvince && matchCarrier);
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

    return 'bg-slate-100 text-slate-500'; // Default
  }
}
