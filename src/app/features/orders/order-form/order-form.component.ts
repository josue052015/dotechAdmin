import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { LocationService } from '../../../core/services/location.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-order-form',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
        MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule
    ],
    template: `
    <div class="h-full flex flex-col max-w-4xl mx-auto">
      <div class="flex items-center mb-6">
        <button mat-icon-button (click)="goBack()" class="mr-2 text-gray-500 hover:text-gray-800">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="text-3xl font-bold text-gray-800">Create New Order</h1>
      </div>

      <mat-card class="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-auto">
        <mat-card-header class="border-b border-gray-100 pb-4 mb-4 pt-6 px-6">
          <mat-card-title>Order Details</mat-card-title>
          <mat-card-subtitle>Fill in the customer information and product details</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content class="px-6 pb-6">
          <form [formGroup]="orderForm" (ngSubmit)="submitOrder()" class="flex flex-col gap-6">
            
            <!-- Customer Section -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Full Name</mat-label>
                <input matInput formControlName="fullName" placeholder="John Doe">
                <mat-error *ngIf="orderForm.get('fullName')?.hasError('required')">Required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Phone Number</mat-label>
                <input matInput formControlName="phone" placeholder="(809) 555-0199">
                <mat-error *ngIf="orderForm.get('phone')?.hasError('required')">Required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full md:col-span-2">
                <mat-label>Address Line 1</mat-label>
                <input matInput formControlName="address1" placeholder="123 Main St, Apt 4">
                <mat-error *ngIf="orderForm.get('address1')?.hasError('required')">Required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Province</mat-label>
                <mat-select formControlName="province">
                  <mat-option *ngFor="let prov of provinces$ | async" [value]="prov">{{ prov }}</mat-option>
                </mat-select>
                <mat-error *ngIf="orderForm.get('province')?.hasError('required')">Required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>City</mat-label>
                <mat-select formControlName="city">
                  <mat-option *ngFor="let city of cities" [value]="city">{{ city }}</mat-option>
                </mat-select>
                <mat-error *ngIf="orderForm.get('city')?.hasError('required')">Required</mat-error>
              </mat-form-field>
            </div>

            <div class="border-t border-gray-100 my-2"></div>

            <!-- Product Section -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <mat-form-field appearance="outline" class="w-full lg:col-span-2">
                <mat-label>Product</mat-label>
                <mat-select formControlName="productName">
                  <mat-option *ngFor="let p of products()" [value]="p.name">{{ p.name }} (RD$ {{ p.price }})</mat-option>
                </mat-select>
                <mat-error *ngIf="orderForm.get('productName')?.hasError('required')">Required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Quantity</mat-label>
                <input matInput type="number" formControlName="productQuantity" min="1">
                <mat-error *ngIf="orderForm.get('productQuantity')?.hasError('required')">Required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Unit Price</mat-label>
                <input matInput type="number" formControlName="productPrice" readonly class="text-gray-500">
                <span matPrefix class="mr-1 text-gray-500">RD$ </span>
              </mat-form-field>
            </div>

            <!-- Additional Costs & Status -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Shipping Cost</mat-label>
                <input matInput type="number" formControlName="shippingCost" min="0">
                <span matPrefix class="mr-1 text-gray-500">RD$ </span>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Packaging Cost</mat-label>
                <input matInput type="number" formControlName="packaging" min="0">
                <span matPrefix class="mr-1 text-gray-500">RD$ </span>
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Status</mat-label>
                <mat-select formControlName="status">
                  <mat-option *ngFor="let s of statuses" [value]="s">{{ s }}</mat-option>
                </mat-select>
                <mat-error *ngIf="orderForm.get('status')?.hasError('required')">Required</mat-error>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Notes</mat-label>
              <textarea matInput rows="3" formControlName="notes" placeholder="Delivery instructions or additional comments..."></textarea>
            </mat-form-field>

            <!-- Total Preview -->
            <div class="bg-blue-50/50 p-4 rounded-lg flex justify-between items-center border border-blue-100">
              <span class="text-blue-800 font-medium">Order Total:</span>
              <span class="text-2xl font-bold text-blue-900">RD$ {{ calculateTotal() | number:'1.2-2' }}</span>
            </div>

            <div class="flex justify-end gap-4 mt-4">
              <button mat-button type="button" (click)="goBack()">Cancel</button>
              <button mat-flat-button color="primary" type="submit" class="!px-8" [disabled]="orderForm.invalid || isSaving">
                <mat-spinner diameter="20" *ngIf="isSaving" class="mr-2 inline"></mat-spinner>
                Create Order
              </button>
            </div>

          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
    styles: []
})
export class OrderFormComponent implements OnInit {
    private fb = inject(FormBuilder);
    private locationService = inject(LocationService);
    private productService = inject(ProductService);
    private orderService = inject(OrderService);
    private location = inject(Location);
    private router = inject(Router);

    isSaving = false;
    products = this.productService.products;
    provinces$ = this.locationService.getProvinces();
    cities: string[] = [];

    statuses = [
        'cancelado', 'desaparecido', 'no confirmado',
        'pendiente de ubicacion', 'confirmado completo',
        'empacado', 'envio en proceso', 'entregado', 'dinero recibido'
    ];

    orderForm: FormGroup = this.fb.group({
        fullName: ['', Validators.required],
        phone: ['', Validators.required],
        address1: ['', Validators.required],
        province: ['', Validators.required],
        city: [{ value: '', disabled: true }, Validators.required],
        productName: ['', Validators.required],
        productQuantity: [1, [Validators.required, Validators.min(1)]],
        productPrice: [0, Validators.required],
        shippingCost: [0],
        packaging: [0],
        status: ['no confirmado', Validators.required],
        notes: ['']
    });

    ngOnInit() {
        this.productService.loadProducts();

        // Cascading dropdown
        this.orderForm.get('province')?.valueChanges.subscribe(province => {
            if (province) {
                this.orderForm.get('city')?.enable();
                this.locationService.getCities(province).subscribe(cities => this.cities = cities);
            } else {
                this.orderForm.get('city')?.disable();
                this.orderForm.get('city')?.setValue('');
                this.cities = [];
            }
        });

        // Auto populate product price
        this.orderForm.get('productName')?.valueChanges.subscribe(name => {
            if (name) {
                const prod = this.products().find(p => p.name === name);
                if (prod) {
                    this.orderForm.get('productPrice')?.setValue(prod.price);
                }
            }
        });
    }

    calculateTotal(): number {
        const vals = this.orderForm.value;
        const qty = vals.productQuantity || 0;
        const price = vals.productPrice || 0;
        const shipping = vals.shippingCost || 0;
        const packaging = vals.packaging || 0;

        // Have to read raw value for productPrice as it might be disabled/readonly but we made it readonly attribute, so value is there
        return (qty * price) + shipping + packaging;
    }

    submitOrder() {
        if (this.orderForm.invalid) {
            this.orderForm.markAllAsTouched();
            return;
        }

        this.isSaving = true;
        const orderData = this.orderForm.getRawValue(); // gets values even if disabled

        this.orderService.createOrder(orderData).subscribe({
            next: () => {
                this.isSaving = false;
                this.router.navigate(['/orders']);
            },
            error: () => {
                this.isSaving = false;
                alert('Failed to save order. Please check console.');
            }
        });
    }

    goBack() {
        this.location.back();
    }
}
