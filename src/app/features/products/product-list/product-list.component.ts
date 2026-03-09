import { Component, OnInit, inject, ViewChild, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatTableModule,
    MatPaginatorModule, MatSortModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDialogModule
  ],
  template: `
    <div class="h-full flex flex-col">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">Products</h1>
        <button mat-flat-button color="primary" (click)="openForm()">
          <mat-icon>add</mat-icon> Add Product
        </button>
      </div>

      <!-- Add/Edit Form inside a card -->
      <div *ngIf="showForm" class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 transition-all">
        <h2 class="text-xl font-semibold mb-4">{{ isEditing ? 'Edit Product' : 'New Product' }}</h2>
        <form [formGroup]="productForm" (ngSubmit)="saveProduct()" class="flex flex-col md:flex-row gap-4 items-start">
          
          <mat-form-field appearance="outline" class="w-full md:w-1/2">
            <mat-label>Product Name</mat-label>
            <input matInput formControlName="name" placeholder="e.g. Wireless Mouse">
            <mat-error *ngIf="productForm.get('name')?.hasError('required')">Name is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full md:w-1/3">
            <mat-label>Price (RD$)</mat-label>
            <input matInput type="number" formControlName="price" placeholder="0.00">
            <mat-error *ngIf="productForm.get('price')?.hasError('required')">Price is required</mat-error>
            <mat-error *ngIf="productForm.get('price')?.hasError('min')">Price must be greater than 0</mat-error>
          </mat-form-field>

          <div class="flex gap-2 pt-2 md:pt-4">
            <button mat-button type="button" (click)="closeForm()">Cancel</button>
            <button mat-flat-button color="primary" type="submit" [disabled]="productForm.invalid || isSaving">
              <mat-spinner diameter="20" *ngIf="isSaving" class="mr-2 inline"></mat-spinner>
              {{ isEditing ? 'Update' : 'Save' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Search and Table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
        
        <div class="p-4 border-b border-gray-100 flex gap-4">
          <mat-form-field appearance="outline" class="w-full md:w-1/3 !mb-[-1.25em]">
            <mat-label>Search Products</mat-label>
            <mat-icon matPrefix class="text-gray-400">search</mat-icon>
            <input matInput (keyup)="applyFilter($event)" placeholder="Search by name..." #input>
          </mat-form-field>
        </div>

        <div class="relative flex-1 overflow-auto">
          <div *ngIf="productService.isLoading()" class="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <table mat-table [dataSource]="dataSource" matSort class="w-full">
            
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="!font-bold !text-gray-700"> Name </th>
              <td mat-cell *matCellDef="let row" class="font-medium text-gray-900"> {{row.name}} </td>
            </ng-container>

            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="!font-bold !text-gray-700"> Price </th>
              <td mat-cell *matCellDef="let row" class="text-gray-600"> RD$ {{row.price | number:'1.2-2'}} </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="!font-bold !text-gray-700 w-32 text-right"> Actions </th>
              <td mat-cell *matCellDef="let row" class="text-right">
                <button mat-icon-button color="primary" (click)="editProduct(row)" matTooltip="Edit">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteProduct(row)" matTooltip="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns" class="bg-gray-50 border-b border-gray-200"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-blue-50/30 transition-colors"></tr>

            <!-- Row shown when there is no matching data. -->
            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell p-8 text-center text-gray-500" colspan="3">
                <mat-icon class="!w-12 !h-12 !text-5xl mx-auto mb-4 text-gray-300">inventory_2</mat-icon>
                <p>No products found matching "{{input.value}}"</p>
              </td>
            </tr>
          </table>
        </div>

        <mat-paginator [pageSizeOptions]="[10, 25, 100]" aria-label="Select page of products" class="border-t border-gray-100"></mat-paginator>
      </div>

    </div>
  `,
  styles: [`
    .mat-mdc-table {
      background: transparent !important;
    }
  `]
})
export class ProductListComponent implements OnInit {
  public productService = inject(ProductService);
  private fb = inject(FormBuilder);

  displayedColumns: string[] = ['name', 'price', 'actions'];
  dataSource: MatTableDataSource<Product> = new MatTableDataSource();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  showForm = false;
  isEditing = false;
  isSaving = false;
  currentRowNumber: number | null = null;

  productForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0.01)]],
    id: ['']
  });

  constructor() {
    // React to signal changes safely
    effect(() => {
      const data = this.productService.products();
      this.dataSource.data = data;
    });
  }

  ngOnInit() {
    this.productService.loadProducts();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openForm() {
    this.productForm.reset({ price: 0 });
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
    const value = this.productForm.value;

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
}
