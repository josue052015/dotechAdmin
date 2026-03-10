import { Component, OnInit, inject, ViewChild, effect, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
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
    MatPaginatorModule, MatSortModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <!-- Top Actions Row -->
      <div class="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Orders List</h1>
          <p class="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-1">Real-time monitoring of all sales channels</p>
        </div>
        
        <div class="flex items-center space-x-3 w-full xl:w-auto" [formGroup]="filterForm">
           <div class="relative flex-1 xl:w-80 group">
              <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 !text-xl group-focus-within:text-blue-600 transition-colors">search</mat-icon>
              <input type="text" formControlName="search" 
                     placeholder="Search customer, ID, or phone..." 
                     class="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm">
           </div>
           
           <button routerLink="/orders/new" class="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 flex items-center justify-center">
              <mat-icon class="!text-2xl">add</mat-icon>
           </button>
        </div>
      </div>

      <!-- Filters Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4" [formGroup]="filterForm">
         <div class="relative">
            <select formControlName="status" class="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer shadow-sm">
               <option value="">All Statuses</option>
               <option *ngFor="let s of statuses" [value]="s">{{ s | titlecase }}</option>
            </select>
            <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
         </div>

         <div class="relative">
            <select formControlName="province" class="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer shadow-sm">
               <option value="">All Provinces</option>
               <option *ngFor="let prov of provinces$ | async" [value]="prov">{{ prov }}</option>
            </select>
            <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
         </div>

         <div class="relative">
            <select formControlName="product" class="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer shadow-sm">
               <option value="">All Products</option>
               <option *ngFor="let p of products()" [value]="p.name">{{ p.name }}</option>
            </select>
            <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
         </div>
      </div>

      <!-- Main Table Container -->
      <div class="card-stitch flex flex-col bg-white overflow-hidden min-h-[500px]">
        
        <div class="relative flex-1 overflow-auto custom-scrollbar">
          <!-- Loading Overlay -->
          <div *ngIf="orderService.isLoading()" class="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10 transition-opacity">
            <mat-spinner diameter="40" strokeWidth="3"></mat-spinner>
          </div>

          <table mat-table [dataSource]="dataSource" matSort class="w-full">
            
            <!-- Customer Column -->
            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef mat-sort-header="fullName" class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50"> Customer </th>
              <td mat-cell *matCellDef="let row" class="px-6 py-4">
                <div class="flex items-center space-x-4">
                   <div class="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[11px] font-bold text-blue-700 shadow-sm">
                      {{ row.fullName.charAt(0) }}{{ row.fullName.split(' ')[1]?.charAt(0) || '' }}
                   </div>
                   <div class="flex flex-col">
                      <span class="text-[13px] font-bold text-slate-900 leading-tight">{{row.fullName}}</span>
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">ID: #ORD-{{row._rowNumber || row.id}}</span>
                   </div>
                </div>
              </td>
            </ng-container>

            <!-- Product Column -->
            <ng-container matColumnDef="product">
              <th mat-header-cell *matHeaderCellDef mat-sort-header="productName" class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50"> Product </th>
              <td mat-cell *matCellDef="let row" class="px-6 py-4">
                <span class="text-[12px] font-semibold text-slate-600 leading-relaxed">{{row.productName}}</span>
              </td>
            </ng-container>

            <!-- Quantity Column -->
            <ng-container matColumnDef="qty">
              <th mat-header-cell *matHeaderCellDef class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 text-center"> Qty </th>
              <td mat-cell *matCellDef="let row" class="px-6 py-4 text-center">
                <span class="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{{row.productQuantity}}</span>
              </td>
            </ng-container>

            <!-- Price Column -->
            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 text-right"> Price </th>
              <td mat-cell *matCellDef="let row" class="px-6 py-4 text-right">
                <span class="text-[13px] font-black text-slate-900">RD$ {{(row.productPrice * row.productQuantity) + (row.shippingCost || 0) + (row.packaging || 0) | number:'1.2-2'}}</span>
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 text-center"> Status </th>
              <td mat-cell *matCellDef="let row" class="px-6 py-4 text-center">
                <div [class]="getStatusClass(row.status)" class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border shadow-sm">
                   <span class="w-1.5 h-1.5 rounded-full" [class]="getStatusDot(row.status)"></span>
                   <span class="text-[10px] font-bold uppercase tracking-wider">{{row.status}}</span>
                </div>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 text-right"> </th>
              <td mat-cell *matCellDef="let row" class="px-6 py-4 text-right">
                <button [routerLink]="['/orders', row._rowNumber]" class="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-90 group focus:outline-none">
                  <mat-icon class="!text-xl group-hover:translate-x-0.5 transition-transform">chevron_right</mat-icon>
                </button>
              </td>
            </ng-container>

            <!-- Header and Row Definitions -->
            <tr mat-header-row *matHeaderRowDef="displayedColumns" class="border-b border-slate-100"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-slate-50/80 border-b border-slate-50 transition-all cursor-pointer group last:border-0" [routerLink]="['/orders', row._rowNumber]"></tr>

            <!-- No Data Row -->
            <tr class="mat-row bg-white" *matNoDataRow>
              <td class="px-6 py-24 text-center" colspan="6">
                <div class="flex flex-col items-center">
                   <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                      <mat-icon class="!text-4xl text-slate-200">search_off</mat-icon>
                   </div>
                   <h3 class="text-lg font-bold text-slate-900">No orders found</h3>
                   <p class="text-sm text-slate-400 font-medium max-w-xs mx-auto mt-2">Adjust your filters or search keywords to find what you're looking for.</p>
                   <button (click)="resetFilters()" class="mt-8 text-blue-600 font-bold hover:underline flex items-center space-x-2">
                       <span>Clear all filters</span>
                   </button>
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Styled Paginator -->
        <div class="px-8 py-5 border-t border-slate-100 bg-slate-50/30 flex flex-col md:flex-row items-center justify-between gap-4">
           <div class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Showing <span class="text-slate-900">{{ (paginator ? paginator.pageIndex * paginator.pageSize + 1 : 1) }}</span> to 
              <span class="text-slate-900">{{ (paginator ? Math.min((paginator.pageIndex + 1) * paginator.pageSize, dataSource.data.length) : 10) }}</span> 
              of <span class="text-slate-900">{{ dataSource.data.length }}</span> results
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

  displayedColumns: string[] = ['customer', 'product', 'qty', 'price', 'status', 'actions'];
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

  filterForm: FormGroup = this.fb.group({
    search: [''],
    status: [''],
    product: [''],
    province: ['']
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
      province: ''
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

      return Boolean(matchSearch && matchStatus && matchProduct && matchProvince);
    };
  }

  getStatusClass(status: string): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('entregado') || s.includes('recibido')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (s.includes('cancelado') || s.includes('desaparecido')) return 'bg-red-50 text-red-600 border-red-100';
    if (s.includes('pendiente') || s.includes('espera') || s.includes('no confirmado')) return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-blue-50 text-blue-600 border-blue-100';
  }

  getStatusDot(status: string): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('entregado') || s.includes('recibido')) return 'bg-emerald-500';
    if (s.includes('cancelado') || s.includes('desaparecido')) return 'bg-red-500';
    if (s.includes('pendiente') || s.includes('espera') || s.includes('no confirmado')) return 'bg-amber-500';
    return 'bg-blue-500';
  }
}
