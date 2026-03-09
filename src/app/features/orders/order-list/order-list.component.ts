import { Component, OnInit, inject, ViewChild, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { LocationService } from '../../../core/services/location.service';
import { Order } from '../../../core/models/order.model';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';
import { map } from 'rxjs';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, FormsModule, MatTableModule,
    MatPaginatorModule, MatSortModule, MatFormFieldModule, MatSelectModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatDatepickerModule, MatNativeDateModule, StatusBadgeComponent
  ],
  template: `
    <div class="h-full flex flex-col">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Orders</h1>
          <p class="text-gray-500 text-sm mt-1">Manage all incoming ecommerce orders</p>
        </div>
        <button mat-flat-button color="primary" routerLink="/orders/new" class="!py-6">
          <mat-icon>add</mat-icon> Create Order
        </button>
      </div>

      <!-- Filters Section -->
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6" [formGroup]="filterForm">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          
          <mat-form-field appearance="outline" class="w-full !mb-[-1.25em]">
            <mat-label>Search (Name, Phone)</mat-label>
            <mat-icon matPrefix class="text-gray-400">search</mat-icon>
            <input matInput formControlName="search" placeholder="Type to search...">
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full !mb-[-1.25em]">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="">All Statuses</mat-option>
              <mat-option *ngFor="let s of statuses" [value]="s">{{ s }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full !mb-[-1.25em]">
            <mat-label>Product</mat-label>
            <mat-select formControlName="product">
              <mat-option value="">All Products</mat-option>
              <mat-option *ngFor="let p of products()" [value]="p.name">{{ p.name }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full !mb-[-1.25em]">
            <mat-label>Province</mat-label>
            <mat-select formControlName="province">
              <mat-option value="">All Provinces</mat-option>
              <mat-option *ngFor="let prov of provinces$ | async" [value]="prov">{{ prov }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full !mb-[-1.25em]">
            <mat-label>City</mat-label>
            <mat-select formControlName="city" [disabled]="!filterForm.get('province')?.value">
              <mat-option value="">All Cities</mat-option>
              <mat-option *ngFor="let city of cities" [value]="city">{{ city }}</mat-option>
            </mat-select>
          </mat-form-field>

        </div>
        
        <div class="mt-4 flex justify-end">
          <button mat-button color="warn" (click)="resetFilters()" *ngIf="hasActiveFilters">
            Clear Filters
          </button>
        </div>
      </div>

      <!-- Table Section -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
        
        <div class="relative flex-1 overflow-auto">
          <div *ngIf="orderService.isLoading()" class="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <table mat-table [dataSource]="dataSource" matSort class="w-full min-w-[800px]">
            
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="!font-bold !text-gray-700 whitespace-nowrap"> Date </th>
              <td mat-cell *matCellDef="let row" class="text-gray-500 text-sm whitespace-nowrap"> {{row.date | date:'MMM d, yyyy'}} </td>
            </ng-container>

            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef mat-sort-header="fullName" class="!font-bold !text-gray-700"> Customer </th>
              <td mat-cell *matCellDef="let row">
                <div class="font-medium text-gray-900">{{row.fullName}}</div>
                <div class="text-xs text-gray-500">{{row.phone}}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="product">
              <th mat-header-cell *matHeaderCellDef mat-sort-header="productName" class="!font-bold !text-gray-700"> Product </th>
              <td mat-cell *matCellDef="let row" class="text-gray-700"> 
                {{row.productName}} <span class="text-gray-400 text-xs text-nowrap">x{{row.productQuantity}}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="location">
              <th mat-header-cell *matHeaderCellDef class="!font-bold !text-gray-700"> Location </th>
              <td mat-cell *matCellDef="let row">
                <div class="text-sm text-gray-800">{{row.city}}</div>
                <div class="text-xs text-gray-500">{{row.province}}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef class="!font-bold !text-gray-700 text-right"> Total </th>
              <td mat-cell *matCellDef="let row" class="text-right font-medium text-gray-900"> 
                RD$ {{(row.productPrice * row.productQuantity) + (row.shippingCost || 0) + (row.packaging || 0) | number:'1.2-2'}} 
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="!font-bold !text-gray-700 text-center"> Status </th>
              <td mat-cell *matCellDef="let row" class="text-center">
                <app-status-badge [status]="row.status"></app-status-badge>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="!font-bold !text-gray-700 w-16 text-right"> </th>
              <td mat-cell *matCellDef="let row" class="text-right pr-4">
                <button mat-icon-button color="primary" [routerLink]="['/orders', row._rowNumber]" matTooltip="View Details">
                  <mat-icon>chevron_right</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns" class="bg-gray-50 border-b border-gray-200"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-blue-50/40 transition-colors border-b border-gray-100 last:border-0"></tr>

            <!-- Row shown when there is no matching data. -->
            <tr class="mat-row hover:bg-transparent" *matNoDataRow>
              <td class="mat-cell p-12 text-center text-gray-500" colspan="7">
                <mat-icon class="!w-16 !h-16 !text-6xl mx-auto mb-4 text-gray-300">search_off</mat-icon>
                <p class="text-lg">No orders found matching the current filters.</p>
                <button mat-stroked-button color="primary" class="mt-4" (click)="resetFilters()" *ngIf="hasActiveFilters">Clear Filters</button>
              </td>
            </tr>
          </table>
        </div>

        <mat-paginator [pageSizeOptions]="[10, 25, 50, 100]" aria-label="Select page of orders" class="border-t border-gray-100 bg-gray-50/50"></mat-paginator>
      </div>
    </div>
  `,
  styles: [`
    .mat-mdc-table { background: transparent !important; }
  `]
})
export class OrderListComponent implements OnInit {
  public orderService = inject(OrderService);
  public productService = inject(ProductService);
  public locationService = inject(LocationService);
  private fb = inject(FormBuilder);

  displayedColumns: string[] = ['date', 'customer', 'product', 'location', 'total', 'status', 'actions'];
  dataSource: MatTableDataSource<Order> = new MatTableDataSource();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  products = this.productService.products;
  provinces$ = this.locationService.getProvinces();
  cities: string[] = [];

  statuses = [
    'cancelado', 'desaparecido', 'no confirmado',
    'pendiente de ubicacion', 'confirmado completo',
    'empacado', 'envio en proceso', 'entregado', 'dinero recibido'
  ];

  filterForm: FormGroup = this.fb.group({
    search: [''],
    status: [''],
    product: [''],
    province: [''],
    city: [{ value: '', disabled: true }],
    date: ['']
  });

  get hasActiveFilters(): boolean {
    const vals = this.filterForm.value;
    return !!(vals.search || vals.status || vals.product || vals.province || vals.city || vals.date);
  }

  constructor() {
    effect(() => {
      const data = this.orderService.orders();
      this.dataSource.data = data;

      // Re-apply filter config if data changes to preserve current view
      if (this.dataSource.filter) {
        // just trigger a re-eval
        this.dataSource.filter = this.dataSource.filter;
      }
    });
  }

  ngOnInit() {
    this.orderService.loadOrders();
    this.productService.loadProducts();

    // Setup custom filter predicate
    this.dataSource.filterPredicate = this.createFilter();

    // Listen to filter changes dynamically
    this.filterForm.valueChanges.subscribe(values => {
      this.dataSource.filter = JSON.stringify(values);
      if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
      }
    });

    // Cascading dropdown
    this.filterForm.get('province')?.valueChanges.subscribe(province => {
      if (province) {
        this.filterForm.get('city')?.enable();
        this.locationService.getCities(province).subscribe(cities => this.cities = cities);
      } else {
        this.filterForm.get('city')?.disable();
        this.filterForm.get('city')?.setValue('');
        this.cities = [];
      }
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    // Customize sorting for total
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'total': return (item.productPrice * item.productQuantity) + (item.shippingCost || 0) + (item.packaging || 0);
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
      city: '',
      date: ''
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
          data.phone?.includes(searchTerms.search)) : true;

      const matchStatus = searchTerms.status ? data.status?.toLowerCase() === searchTerms.status.toLowerCase() : true;
      const matchProduct = searchTerms.product ? data.productName?.toLowerCase() === searchTerms.product.toLowerCase() : true;
      const matchProvince = searchTerms.province ? data.province?.toLowerCase() === searchTerms.province.toLowerCase() : true;
      const matchCity = searchTerms.city ? data.city?.toLowerCase() === searchTerms.city.toLowerCase() : true;

      // We don't have date filtering in UI yet, but setting it up for future expansion if requested
      const matchDate = searchTerms.date ? data.date === searchTerms.date : true;

      return Boolean(matchSearch && matchStatus && matchProduct && matchProvince && matchCity && matchDate);
    };
  }
}
