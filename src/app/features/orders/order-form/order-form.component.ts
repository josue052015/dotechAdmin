import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import { LocationService } from '../../../core/services/location.service';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Order } from '../../../core/models/order.model';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule, LucideAngularModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="max-w-[850px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      <!-- Breadcrumbs & Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="space-y-1">
          <nav class="flex items-center space-x-2 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 md:mb-2">
             <a routerLink="/orders" class="hover:text-blue-600 transition-colors">Orders</a>
             <lucide-icon name="chevron-right" class="w-3 h-3 md:w-3 md:h-3 flex items-center justify-center"></lucide-icon>
             <span class="text-slate-600">{{ isEditing ? 'Edit Order' : 'Create New Order' }}</span>
          </nav>
          <h1 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{{ isEditing ? 'Edit Order ' + orderId : 'Create New Order' }}</h1>
          <p class="text-[12px] md:text-sm text-slate-500 font-medium leading-relaxed">Fill in the customer and product details to register or update a transaction.</p>
        </div>
      </div>

      <form [formGroup]="orderForm" class="space-y-6">
        
        <!-- Customer Information -->
        <div class="card-stitch p-5 md:p-8 bg-white space-y-6 relative overflow-hidden">
          <div class="flex items-center space-x-3 mb-2">
            <div class="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <lucide-icon name="user" class="w-4 h-4 md:w-5 md:h-5"></lucide-icon>
            </div>
            <h2 class="text-xs md:text-sm font-black text-slate-800 uppercase tracking-wider">Customer Information</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <div class="space-y-1.5">
              <label class="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Name</label>
              <input type="text" formControlName="fullName" placeholder="e.g. John Doe" 
                     class="input-stitch text-sm">
            </div>

            <div class="space-y-1.5">
              <label class="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number <span class="text-red-500">*</span></label>
              <input type="text" formControlName="phone" placeholder="+1 (555) 000-0000" 
                     class="input-stitch text-sm">
            </div>
          </div>
        </div>

        <!-- Product & Pricing -->
        <div class="card-stitch p-5 md:p-8 bg-white space-y-6">
          <div class="flex items-center space-x-3 mb-2">
            <div class="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <lucide-icon name="shopping-bag" class="w-4 h-4 md:w-5 md:h-5"></lucide-icon>
            </div>
            <h2 class="text-xs md:text-sm font-black text-slate-800 uppercase tracking-wider">Product & Pricing</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">
            <div class="md:col-span-6 space-y-1.5">
              <label class="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Selection <span class="text-red-500">*</span></label>
              <div class="relative">
                <select formControlName="productName" class="select-stitch cursor-pointer text-sm">
                  <option value="">Select a product</option>
                  <option *ngFor="let p of products()" [value]="p.name">{{ p.name }}</option>
                </select>
                <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5 pointer-events-none"></lucide-icon>
              </div>
            </div>

            <div class="md:col-span-2 space-y-1.5">
              <label class="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Qty <span class="text-red-500">*</span></label>
              <input type="number" formControlName="productQuantity" min="1" 
                     class="input-stitch text-sm px-3">
            </div>

            <div class="md:col-span-2 space-y-1.5">
              <label class="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Price</label>
              <div class="relative">
                 <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">$</span>
                 <input type="number" [value]="orderForm.get('productPrice')?.value" readonly 
                        class="input-stitch bg-slate-100 text-text-muted cursor-not-allowed pl-6 pr-2 text-sm">
              </div>
            </div>

            <div class="md:col-span-2 space-y-1.5">
              <label class="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Shipping</label>
              <div class="relative">
                 <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">$</span>
                 <input type="number" formControlName="shippingCost" 
                        class="input-stitch pl-6 pr-2 text-sm">
              </div>
            </div>
          </div>
        </div>

        <!-- Shipping Address -->
        <div class="card-stitch p-5 md:p-8 bg-white space-y-6">
          <div class="flex items-center space-x-3 mb-2">
            <div class="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <lucide-icon name="truck" class="w-4 h-4 md:w-5 md:h-5"></lucide-icon>
            </div>
            <h2 class="text-xs md:text-sm font-black text-slate-800 uppercase tracking-wider">Shipping Address</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            <div class="space-y-1.5">
              <label class="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Province / State</label>
              <div class="relative">
                <select formControlName="province" class="select-stitch cursor-pointer text-sm">
                  <option value="">Select province</option>
                  <option *ngFor="let prov of provinces$ | async" [value]="prov">{{ prov }}</option>
                </select>
                <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5 pointer-events-none"></lucide-icon>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
              <div class="relative">
                <select formControlName="city" class="select-stitch cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed text-sm">
                  <option value="">Select city</option>
                  <option *ngFor="let city of cities" [value]="city">{{ city }}</option>
                </select>
                <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5 pointer-events-none"></lucide-icon>
              </div>
            </div>

            <div class="md:col-span-2 space-y-1.5">
              <label class="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Street Address</label>
              <textarea formControlName="address1" placeholder="Full delivery address, apartment, suite, etc." rows="3"
                        class="input-stitch resize-none h-auto py-3 text-sm"></textarea>
            </div>
          </div>
        </div>

        <!-- Status & Notes -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div class="card-stitch p-5 md:p-8 bg-white space-y-4">
               <label class="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Status <span class="text-red-500">*</span></label>
               <div class="relative">
                 <select formControlName="status" class="select-stitch cursor-pointer text-sm">
                   <option *ngFor="let s of statuses" [value]="s">{{ s | titlecase }}</option>
                 </select>
                 <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5 pointer-events-none"></lucide-icon>
               </div>
               
               <label class="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 block pt-2">Shipping Carrier</label>
               <div class="relative">
                 <select formControlName="carrier" class="select-stitch cursor-pointer text-sm">
                   <option *ngFor="let c of carriers" [value]="c">{{ c | titlecase }}</option>
                 </select>
                 <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5 pointer-events-none"></lucide-icon>
               </div>
            </div>

           <div class="card-stitch p-5 md:p-8 bg-white space-y-4">
              <label class="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Additional Notes</label>
              <textarea formControlName="notes" placeholder="Gift instructions, delivery preference..." rows="2"
                        class="input-stitch resize-none h-auto py-3 text-sm"></textarea>
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

        <!-- Form Actions -->
        <div class="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6">
           <button (click)="goBack()" type="button" class="w-full sm:w-auto px-8 py-3 md:py-2.5 rounded-ui border border-border text-text font-bold text-sm bg-white hover:bg-slate-50 transition-all active:scale-95">
              Cancel
           </button>
           <button (click)="submitOrder()" 
                   type="button"
                   [disabled]="orderForm.invalid || isSaving || isLoadingOrders()"
                   class="w-full sm:w-auto bg-primary hover:bg-blue-700 text-white px-10 py-3 md:py-2.5 rounded-ui shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 text-sm font-bold flex items-center justify-center space-x-3">
              <mat-spinner diameter="18" strokeWidth="2.5" *ngIf="isSaving || isLoadingOrders()" class="text-white"></mat-spinner>
               <span *ngIf="!isSaving && !isLoadingOrders()">{{ isEditing ? 'Update Order' : 'Save Order' }}</span>
               <span *ngIf="isSaving && isEditing">Updating...</span>
               <span *ngIf="isSaving && !isEditing">Saving...</span>
               <span *ngIf="isLoadingOrders() && !isSaving">Syncing...</span>
            </button>
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
  private route = inject(ActivatedRoute);

  isSaving = false;
  isEditing = false;
  orderId: string | null = null;
  editingOrder: Order | null = null;
  isLoadingOrders = this.orderService.isLoading;
  products = this.productService.products;
  provinces$ = this.locationService.getProvinces();
  cities: string[] = [];

  statuses = [
    'confirmado completo', 'pendiente de ubicacion', 'no confirmado',
    'cancelado', 'desaparecido', 'empacado', 'envio en proceso',
    'entregado', 'dinero recibido'
  ];
  carriers = ['envio local', 'aurel pack', 'gintracom'];

  orderForm: FormGroup = this.fb.group({
    fullName: [''],
    phone: ['', Validators.required],
    address1: [''],
    province: [''],
    city: [{ value: '', disabled: true }],
    productName: ['', Validators.required],
    productQuantity: [1, [Validators.required, Validators.min(1)]],
    productPrice: [0, Validators.required],
    shippingCost: [0],
    carrier: ['envio local'],
    status: ['no confirmado', Validators.required],
    notes: ['']
  });

  ngOnInit() {
    this.orderService.loadOrders();
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

    this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) {
            this.isEditing = true;
            this.orderId = id;
            this.loadOrderForEditing(id);
        }
    });
  }

  loadOrderForEditing(id: string) {
      // Add effect to wait for orders to load if necessary
      const orders = this.orderService.orders();
      if (orders.length > 0) {
          this.populateForm(id, orders);
      } else {
           // Provide a subscription fallback if orders are still loading 
           // Better pattern is a small timeout or effect but for simplicity we rely on initial load
           setTimeout(() => {
               this.populateForm(id, this.orderService.orders());
           }, 2000);
      }
  }

  populateForm(id: string, orders: Order[]) {
      const order = orders.find(o => o.id === id || o['_rowNumber']?.toString() === id);
      if (order) {
          this.editingOrder = order;
          this.orderForm.patchValue({
              fullName: order.fullName,
              phone: order.phone,
              address1: order.address1,
              province: order.province,
              productName: order.productName,
              productQuantity: order.productQuantity,
              productPrice: order.productPrice,
              shippingCost: order.shippingCost,
              carrier: order.carrier || 'envio local',
              status: order.status,
              notes: order.notes
          });
          
          if (order.province) {
              this.orderForm.get('city')?.enable();
              this.locationService.getCities(order.province).subscribe(cities => {
                  this.cities = cities;
                  // Patch city after loading
                  setTimeout(() => this.orderForm.get('city')?.setValue(order.city), 100);
              });
          }
      }
  }

  submitOrder() {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const orderData = this.orderForm.getRawValue();

    if (this.isEditing && this.editingOrder && this.editingOrder['_rowNumber']) {
        // Carry over original ID and Date
        orderData.id = this.editingOrder.id;
        orderData.date = this.editingOrder.date;
        orderData['_rowNumber'] = this.editingOrder['_rowNumber'];

        this.orderService.updateOrder(this.editingOrder['_rowNumber'], orderData).subscribe({
            next: () => {
                this.isSaving = false;
                this.router.navigate(['/orders', this.editingOrder!['_rowNumber']]);
            },
            error: () => {
                this.isSaving = false;
                alert('Failed to update order. Please check console.');
            }
        });
    } else {
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
  }

  goBack() {
    this.location.back();
  }
}
