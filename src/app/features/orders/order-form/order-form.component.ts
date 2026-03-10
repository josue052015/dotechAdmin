import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { LocationService } from '../../../core/services/location.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="max-w-[850px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      <!-- Breadcrumbs & Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="space-y-1">
          <nav class="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
             <a routerLink="/orders" class="hover:text-blue-600 transition-colors">Orders</a>
             <lucide-icon name="chevron-right" class="w-3 h-3 flex items-center justify-center"></lucide-icon>
             <span class="text-slate-600">Create New Order</span>
          </nav>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Create New Order</h1>
          <p class="text-sm text-slate-500 font-medium">Fill in the customer and product details to register a new transaction.</p>
        </div>

        <div class="flex items-center space-x-3">
           <button (click)="goBack()" class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm bg-white hover:bg-slate-50 transition-all active:scale-95">
              Cancel
           </button>
           <button (click)="submitOrder()" 
                   [disabled]="orderForm.invalid || isSaving"
                   class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 text-sm font-bold flex items-center space-x-2">
              <mat-spinner diameter="16" strokeWidth="2.5" *ngIf="isSaving"></mat-spinner>
              <span *ngIf="!isSaving">Save Order</span>
              <span *ngIf="isSaving">Saving...</span>
           </button>
        </div>
      </div>

      <form [formGroup]="orderForm" class="space-y-6">
        
        <!-- Customer Information -->
        <div class="card-stitch p-8 bg-white space-y-6 relative overflow-hidden">
          <div class="flex items-center space-x-3 mb-2">
            <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <lucide-icon name="user" class="w-5 h-5"></lucide-icon>
            </div>
            <h2 class="text-sm font-black text-slate-800 uppercase tracking-wider">Customer Information</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-1.5">
              <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Name</label>
              <input type="text" formControlName="fullName" placeholder="e.g. John Doe" 
                     class="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all">
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
              <input type="text" formControlName="phone" placeholder="+1 (555) 000-0000" 
                     class="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all">
            </div>
          </div>
        </div>

        <!-- Product & Pricing -->
        <div class="card-stitch p-8 bg-white space-y-6">
          <div class="flex items-center space-x-3 mb-2">
            <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <lucide-icon name="shopping-bag" class="w-5 h-5"></lucide-icon>
            </div>
            <h2 class="text-sm font-black text-slate-800 uppercase tracking-wider">Product & Pricing</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div class="md:col-span-6 space-y-1.5">
              <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Selection</label>
              <div class="relative">
                <select formControlName="productName" class="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all cursor-pointer">
                  <option value="">Select a product</option>
                  <option *ngFor="let p of products()" [value]="p.name">{{ p.name }}</option>
                </select>
                <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none"></lucide-icon>
              </div>
            </div>

            <div class="md:col-span-3 space-y-1.5">
              <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
              <input type="number" formControlName="productQuantity" min="1" 
                     class="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all">
            </div>

            <div class="md:col-span-3 space-y-1.5">
              <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Price ($)</label>
              <div class="relative">
                 <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                 <input type="number" [value]="orderForm.get('productPrice')?.value" readonly 
                        class="w-full bg-slate-100 border border-slate-200 rounded-xl py-3 pl-8 pr-4 text-sm text-slate-500 cursor-not-allowed">
              </div>
            </div>
          </div>
        </div>

        <!-- Shipping Address -->
        <div class="card-stitch p-8 bg-white space-y-6">
          <div class="flex items-center space-x-3 mb-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <lucide-icon name="truck" class="w-5 h-5"></lucide-icon>
            </div>
            <h2 class="text-sm font-black text-slate-800 uppercase tracking-wider">Shipping Address</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-1.5">
              <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Province / State</label>
              <div class="relative">
                <select formControlName="province" class="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all cursor-pointer">
                  <option value="">Select province</option>
                  <option *ngFor="let prov of provinces$ | async" [value]="prov">{{ prov }}</option>
                </select>
                <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none"></lucide-icon>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
              <div class="relative">
                <select formControlName="city" class="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed">
                  <option value="">Select city</option>
                  <option *ngFor="let city of cities" [value]="city">{{ city }}</option>
                </select>
                <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none"></lucide-icon>
              </div>
            </div>

            <div class="md:col-span-2 space-y-1.5">
              <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Street Address</label>
              <textarea formControlName="address1" placeholder="Full delivery address, apartment, suite, etc." rows="3"
                        class="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all resize-none"></textarea>
            </div>
          </div>
        </div>

        <!-- Status & Notes -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div class="card-stitch p-8 bg-white space-y-4">
              <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Status</label>
              <div class="relative">
                <select formControlName="status" class="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer">
                  <option *ngFor="let s of statuses" [value]="s">{{ s | titlecase }}</option>
                </select>
                <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none"></lucide-icon>
              </div>
           </div>

           <div class="card-stitch p-8 bg-white space-y-4">
              <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Additional Notes</label>
              <textarea formControlName="notes" placeholder="Gift instructions, delivery preference..." rows="1"
                        class="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none h-[46px]"></textarea>
           </div>
        </div>

        <!-- Info Card -->
        <div class="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start space-x-4">
           <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-blue-200 mt-0.5">
              <lucide-icon name="info" class="w-4 h-4"></lucide-icon>
           </div>
           <div>
              <p class="text-[13px] font-bold text-blue-900">Inventory Management Notice</p>
              <p class="text-[12px] text-blue-700 font-medium leading-relaxed opacity-80">Inventory will be automatically updated once the order is saved as "Confirmed". Please ensure product availability before submission.</p>
           </div>
        </div>

      </form>
      
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
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
    'confirmado completo', 'pendiente de ubicacion', 'no confirmado',
    'cancelado', 'desaparecido', 'empacado', 'envio en proceso',
    'entregado', 'dinero recibido'
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

    this.orderForm.get('productName')?.valueChanges.subscribe(name => {
      if (name) {
        const prod = this.products().find(p => p.name === name);
        if (prod) {
          this.orderForm.get('productPrice')?.setValue(prod.price);
        }
      }
    });
  }

  submitOrder() {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const orderData = this.orderForm.getRawValue();

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
