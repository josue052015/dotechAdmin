import { Component, OnInit, inject, effect, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { MessageService } from '../../../core/services/message.service';
import { ProductService } from '../../../core/services/product.service';
import { LocationService } from '../../../core/services/location.service';
import { Order } from '../../../core/models/order.model';

import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ConfirmService } from '../../../core/services/confirm.service';
import { WhatsappSelectorDialogComponent } from '../../../shared/components/whatsapp-selector-dialog/whatsapp-selector-dialog.component';
import { StatusSelectorDialogComponent } from '../../../shared/components/status-selector-dialog/status-selector-dialog.component';
import { Router } from '@angular/router';

@Component({
   selector: 'app-order-detail',
   standalone: true,
   imports: [
      CommonModule, RouterModule, LucideAngularModule, MatProgressSpinnerModule,
      FormsModule, ReactiveFormsModule, MatButtonModule, MatSnackBarModule, MatDialogModule
   ],
   template: `
    <div [class.max-w-[1000px]]="!isDialog" [class.mx-auto]="!isDialog" 
         class="animate-in fade-in duration-500 relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
      
      <!-- Modal Header -->
      <div class="px-6 pt-6 pb-3 md:px-10 md:pt-8 md:pb-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between bg-slate-50/50 sticky top-0 z-50 backdrop-blur-md gap-2 md:gap-4">
         <div class="flex items-start justify-between w-full md:w-auto">
            <div class="flex flex-col">
               <div class="flex items-center space-x-3">
                  <h1 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Order {{ order?.id || '#' + order?.['_rowNumber'] }}</h1>
                  <span (click)="openStatusSelector()" 
                        [class]="getStatusClass(order?.status || '')" 
                        class="px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all">
                     {{ (order?.status || 'SIN ESTADO') | uppercase }}
                  </span>
                  <span *ngIf="order?.isDeleted" class="px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-sm animate-pulse">
                     ELIMINADO
                  </span>
               </div>
               <p *ngIf="order" class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {{ order.fullName || 'Cliente sin identificar' }} • {{ order.date | date:'mediumDate' }}
               </p>
            </div>
            
            <button (click)="closeDialog()" class="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
               <lucide-icon name="x" class="w-6 h-6"></lucide-icon>
            </button>
         </div>

         <div class="flex items-center space-x-2 w-full md:w-auto justify-start md:justify-end -mx-6 px-6 py-3 mt-3 bg-white/50 border-t border-slate-100/50 md:mx-0 md:px-0 md:py-0 md:mt-0 md:bg-transparent md:border-none">
            <ng-container *ngIf="!isEditing; else editingActions">
                <button *ngIf="order && !order.isDeleted" (click)="toggleEdit()" class="flex items-center space-x-2 px-2.5 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all active:scale-95 mr-2">
                   <lucide-icon name="pencil" class="w-4 h-4"></lucide-icon>
                   <span class="text-[9px] font-black uppercase tracking-widest">Edit</span>
                </button>
                <button *ngIf="order && !order.isDeleted" (click)="copyAllInfo()" class="flex items-center space-x-2 px-2.5 py-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-95" title="Copy for Delivery">
                   <lucide-icon name="copy" class="w-4 h-4"></lucide-icon>
                   <span class="text-[9px] font-black uppercase tracking-widest">Copy</span>
                </button>
                <button *ngIf="order && !order.isDeleted" (click)="confirmDelete()" class="flex items-center space-x-2 px-2.5 py-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95" title="Delete Order">
                   <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
                   <span class="text-[9px] font-black uppercase tracking-widest">Delete</span>
                </button>
             </ng-container>
            <ng-template #editingActions>
               <button [disabled]="isSaving" (click)="cancelEdit()" class="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all font-bold text-xs active:scale-95">
                  Cancel
               </button>
               <button [disabled]="orderForm.invalid || isSaving" (click)="saveOrder()" class="p-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-all font-bold text-xs flex items-center space-x-2 shadow-lg shadow-emerald-100 active:scale-95 ml-2">
                  <mat-spinner diameter="16" *ngIf="isSaving" class="mr-2"></mat-spinner>
                  <lucide-icon *ngIf="!isSaving" name="check" class="w-4 h-4"></lucide-icon>
                  <span>Save Changes</span>
               </button>
            </ng-template>
            <button (click)="closeDialog()" class="hidden md:flex p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all ml-2">
               <lucide-icon name="x" class="w-6 h-6"></lucide-icon>
            </button>
         </div>
      </div>

      <div class="px-6 pt-2 pb-20 md:px-10 md:pt-4 md:pb-10 max-h-[80vh] overflow-y-auto custom-scrollbar overflow-x-hidden">
         
         <div *ngIf="isLoading" class="flex flex-col items-center justify-center py-24 space-y-4">
            <mat-spinner diameter="40" strokeWidth="3"></mat-spinner>
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading order details...</p>
         </div>

         <div *ngIf="!isLoading && order" [class.opacity-60]="isSaving" class="animate-in slide-in-from-bottom-4 duration-500">
            
            <!-- Summary Area (Visual Only) -->
            <div *ngIf="!isEditing" class="hidden md:grid md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
               <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 flex flex-col items-center text-center">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</span>
                  <span (click)="openStatusSelector()" class="text-xs font-bold text-slate-900 truncate w-full cursor-pointer hover:text-primary transition-all">{{ order.status | titlecase }}</span>
               </div>
               <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 flex flex-col items-center text-center">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Quantity</span>
                  <span class="text-xs font-bold text-slate-900">{{ order.productQuantity }} units</span>
               </div>
               <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 flex flex-col items-center text-center">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit Price</span>
                  <span class="text-xs font-bold text-slate-900">RD$ {{ order.productPrice | number }}</span>
               </div>
               <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100/50 flex flex-col items-center text-center">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</span>
                  <span class="text-xs font-black text-blue-600">RD$ {{ totalAmount | number }}</span>
               </div>
               <div class="col-span-2 hidden lg:flex bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 items-center justify-center space-x-3">
                  <button (click)="openWhatsAppSelector()" class="flex items-center space-x-2 text-emerald-700 font-black text-xs uppercase tracking-wider hover:underline">
                     <lucide-icon name="message-square" class="w-4 h-4"></lucide-icon>
                     <span>Send WhatsApp Message</span>
                  </button>
               </div>
            </div>

            <!-- WhatsApp Option for Mobile -->
            <div *ngIf="!isEditing && order && !order.isDeleted" class="md:hidden bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 mb-8 flex items-center justify-center">
               <button (click)="openWhatsAppSelector()" class="flex items-center space-x-2 text-emerald-700 font-black text-xs uppercase tracking-wider hover:underline">
                  <lucide-icon name="message-square" class="w-4 h-4"></lucide-icon>
                  <span>Send WhatsApp Message</span>
               </button>
            </div>

            <!-- Detail Grid -->
            <div [formGroup]="orderForm" class="grid grid-cols-1 lg:grid-cols-12 gap-8">
               
               <!-- Primary Info Section -->
               <div class="lg:col-span-8 space-y-8">
                  
                  <!-- Customer Card -->
                  <div class="card-stitch p-6 md:p-8 space-y-6">
                     <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                           <lucide-icon name="user" class="text-primary w-5 h-5"></lucide-icon>
                           <h2 class="text-sm font-black text-slate-900 tracking-tight uppercase tracking-widest">Customer Information</h2>
                        </div>
                     </div>

                     <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div class="space-y-1.5">
                           <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</p>
                           <ng-container *ngIf="!isEditing">
                              <p class="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2.5 rounded-xl">{{ order.fullName || 'No name provided' }}</p>
                           </ng-container>
                           <input *ngIf="isEditing" type="text" formControlName="fullName" class="input-stitch text-sm" placeholder="Customer Name">
                        </div>
                        <div class="space-y-1.5">
                           <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</p>
                           <ng-container *ngIf="!isEditing">
                              <p class="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2.5 rounded-xl">{{ order.phone }}</p>
                           </ng-container>
                           <input *ngIf="isEditing" type="text" formControlName="phone" class="input-stitch text-sm" placeholder="Phone Number">
                        </div>
                        <div class="md:col-span-2 space-y-1.5">
                           <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</p>
                           <ng-container *ngIf="!isEditing">
                              <div class="flex items-start space-x-2 bg-slate-50 px-3 py-2.5 rounded-xl">
                                 <lucide-icon name="map-pin" class="w-3.5 h-3.5 text-slate-400 mt-0.5"></lucide-icon>
                                 <p class="text-sm font-bold text-slate-800 leading-snug">{{ order.address1 || 'No address provided' }}</p>
                              </div>
                           </ng-container>
                           <textarea *ngIf="isEditing" formControlName="address1" rows="2" class="input-stitch text-sm py-3" placeholder="Street address, sector..."></textarea>
                        </div>
                        
                        <div class="space-y-1.5">
                           <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Province</p>
                           <ng-container *ngIf="!isEditing">
                              <p class="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2.5 rounded-xl">{{ order.province || 'N/A' }}</p>
                           </ng-container>
                           <div *ngIf="isEditing" class="relative">
                              <select formControlName="province" class="select-stitch text-sm">
                                 <option value="">Select province</option>
                                 <option *ngFor="let p of (provinces$ | async)" [value]="p">{{ p }}</option>
                              </select>
                              <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none"></lucide-icon>
                           </div>
                        </div>

                        <div class="space-y-1.5">
                           <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City</p>
                           <ng-container *ngIf="!isEditing">
                              <p class="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2.5 rounded-xl">{{ order.city || 'N/A' }}</p>
                           </ng-container>
                           <div *ngIf="isEditing" class="relative">
                              <select formControlName="city" class="select-stitch text-sm disabled:bg-slate-50">
                                 <option value="">Select city</option>
                                 <option *ngFor="let c of cities" [value]="c">{{ c }}</option>
                              </select>
                              <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none"></lucide-icon>
                           </div>
                        </div>
                     </div>
                  </div>

                  <!-- Purchase Details Card -->
                  <div class="card-stitch p-6 md:p-8 space-y-6">
                     <div class="flex items-center space-x-3">
                        <lucide-icon name="shopping-bag" class="text-primary w-5 h-5"></lucide-icon>
                        <h2 class="text-sm font-black text-slate-900 tracking-tight uppercase tracking-widest">Product & Purchase</h2>
                     </div>

                     <div class="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                        <div class="md:col-span-8 space-y-1.5">
                           <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product</p>
                           <ng-container *ngIf="!isEditing">
                              <p class="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2.5 rounded-xl truncate">{{ order.productName }}</p>
                           </ng-container>
                           <div *ngIf="isEditing" class="relative">
                              <select formControlName="productName" class="select-stitch text-sm">
                                 <option value="">Select product</option>
                                 <option *ngFor="let p of products()" [value]="p.name">{{ p.name }}</option>
                              </select>
                              <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none"></lucide-icon>
                           </div>
                        </div>
                        <div class="md:col-span-4 space-y-1.5">
                           <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</p>
                           <ng-container *ngIf="!isEditing">
                              <p class="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2.5 rounded-xl">{{ order.productQuantity }}</p>
                           </ng-container>
                           <input *ngIf="isEditing" type="number" formControlName="productQuantity" class="input-stitch text-sm">
                        </div>

                        <div class="md:col-span-4 space-y-1.5">
                           <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Price</p>
                           <ng-container *ngIf="!isEditing">
                              <p class="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2.5 rounded-xl">RD$ {{ order.productPrice | number }}</p>
                           </ng-container>
                           <div *ngIf="isEditing" class="relative">
                              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                              <input type="number" formControlName="productPrice" class="input-stitch pl-8 text-sm bg-slate-50" readonly>
                           </div>
                        </div>
                        <div class="md:col-span-8 space-y-1.5">
                           <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shipping</p>
                           <ng-container *ngIf="!isEditing">
                              <p class="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2.5 rounded-xl">RD$ {{ order.shippingCost || 0 | number }}</p>
                           </ng-container>
                           <div *ngIf="isEditing" class="relative">
                              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                              <input type="number" formControlName="shippingCost" class="input-stitch pl-8 text-sm">
                           </div>
                        </div>
                     </div>

                     <!-- Pricing Totals Summary -->
                     <div class="mt-8 pt-8 border-t border-slate-100 flex flex-col items-end space-y-1">
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Transaction Amount</span>
                        <div class="flex items-center space-x-2">
                           <span class="text-2xl md:text-3xl font-black text-blue-600 tracking-tighter">RD$ {{ (isEditing ? formTotalAmount : totalAmount) | number:'1.2-2' }}</span>
                        </div>
                     </div>
                  </div>
               </div>

               <!-- Right Column: Operations -->
               <div class="lg:col-span-4 space-y-8">
                  
                  <!-- Metadata Card -->
                  <div class="card-stitch p-6 md:p-8 space-y-6 bg-slate-50/50">
                     <div class="flex items-center space-x-3">
                        <lucide-icon name="activity" class="text-primary w-5 h-5"></lucide-icon>
                        <h2 class="text-sm font-black text-slate-900 tracking-tight uppercase tracking-widest">Operations</h2>
                     </div>

                     <div class="space-y-6 pt-2">
                        <div class="space-y-1.5">
                           <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Status</p>
                           <ng-container *ngIf="!isEditing">
                              <div (click)="openStatusSelector()" class="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                                 <span class="text-xs font-bold text-slate-700 capitalize">{{ order.status }}</span>
                                 <lucide-icon name="chevron-down" class="w-4 h-4 text-slate-300"></lucide-icon>
                              </div>
                           </ng-container>
                           <div *ngIf="isEditing" class="relative">
                              <select formControlName="status" class="select-stitch text-sm">
                                 <option *ngFor="let s of statuses" [value]="s">{{ s | titlecase }}</option>
                              </select>
                              <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none"></lucide-icon>
                           </div>
                        </div>

                        <div class="space-y-1.5">
                           <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Delivery Carrier</p>
                           <ng-container *ngIf="!isEditing">
                              <div class="p-3 bg-white border border-slate-100 rounded-xl flex items-center space-x-3 shadow-sm">
                                 <div [class]="getCarrierClass(order.carrier || '')" class="w-6 h-6 rounded flex items-center justify-center">
                                    <lucide-icon name="truck" class="w-3.5 h-3.5 text-white"></lucide-icon>
                                 </div>
                                 <span class="text-xs font-bold text-slate-700 capitalize">{{ order.carrier || 'Envio Local' }}</span>
                              </div>
                           </ng-container>
                           <div *ngIf="isEditing" class="relative">
                              <select formControlName="carrier" class="select-stitch text-sm">
                                 <option *ngFor="let c of carriers" [value]="c">{{ c | titlecase }}</option>
                              </select>
                              <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none"></lucide-icon>
                           </div>
                        </div>

                        <div class="md:col-span-2 space-y-1.5">
                           <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Administrative Notes</p>
                            <ng-container *ngIf="!isEditing">
                               <div [class]="order.notes ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50/50 border-slate-100/50 border-dashed'"
                                    class="p-4 rounded-2xl border min-h-[100px] transition-all duration-300">
                                  <p [class]="order.notes ? 'text-slate-700' : 'text-slate-400 italic'" class="text-xs font-medium leading-relaxed">
                                     {{ order.notes || 'No administrative notes.' }}
                                  </p>
                               </div>
                            </ng-container>
                           <textarea *ngIf="isEditing" formControlName="notes" rows="4" class="input-stitch text-sm py-3" placeholder="Add order observations..."></textarea>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <!-- Action Footer (Hidden on Desktop Header Actions, but useful for clarity or mobile) -->
      <div *ngIf="isEditing" class="px-6 py-4 md:px-10 md:py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end items-center space-x-4 md:hidden">
          <button (click)="cancelEdit()" class="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Cancel</button>
          <button [disabled]="orderForm.invalid || isSaving" (click)="saveOrder()" class="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-100">
             {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </button>
      </div>
    </div>
  `,
   styles: [`
    :host { display: block; overflow: hidden; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    ::ng-deep .custom-dialog-container .mat-mdc-dialog-container { padding: 0 !important; border-radius: 24px !important; }
  `]
})
export class OrderDetailComponent implements OnInit {
   private fb = inject(FormBuilder);
   private route = inject(ActivatedRoute);
   private location = inject(Location);
   private snackBar = inject(MatSnackBar);
   private dialog = inject(MatDialog);
   public orderService = inject(OrderService);
   public messageService = inject(MessageService);
   public productService = inject(ProductService);
   public locationService = inject(LocationService);
   private router = inject(Router);
   private dialogRef = inject(MatDialogRef<OrderDetailComponent>, { optional: true });
   private dialogData = inject(MAT_DIALOG_DATA, { optional: true });
   private confirmService = inject(ConfirmService);

   isDialog = false;
   isEditing = false;
   isSaving = false;

   orderRowNumber: number | null = null;
   order: Order | null = null;
   isLoading = true;

   provinces$ = this.locationService.getProvinces();
   cities: string[] = [];
   products = this.productService.products;

   orderForm: FormGroup = this.fb.group({
      fullName: [''],
      phone: ['', Validators.required],
      address1: [''],
      province: [''],
      city: [''],
      productName: ['', Validators.required],
      productQuantity: [1, [Validators.required, Validators.min(1)]],
      productPrice: [0, Validators.required],
      shippingCost: [0],
      carrier: ['envio local'],
      status: ['no confirmado', Validators.required],
      notes: ['']
   });

   statuses = [
      'cancelado', 'desaparecido', 'no confirmado', 'pendiente de ubicacion',
      'confirmado completo', 'no cobertura', 'empacado', 'envio en proceso', 'entregado', 'dinero recibido'
   ];
 
   carriers = ['envio local', 'aurel pack', 'gintracom'];

   get totalAmount() {
      if (!this.order) return 0;
      const subtotal = (this.order.productPrice * this.order.productQuantity);
      return subtotal + (this.order.shippingCost || 0);
   }

   get formTotalAmount() {
      const vals = this.orderForm.getRawValue();
      const subtotal = (vals.productPrice || 0) * (vals.productQuantity || 0);
      return subtotal + (vals.shippingCost || 0);
   }

   constructor() {
      effect(() => {
         const orders = this.orderService.orders();
         if (orders.length > 0 && this.orderRowNumber && !this.isEditing) {
            const found = orders.find(o => o['_rowNumber'] === this.orderRowNumber);
            if (found) {
               this.order = { ...found };
               this.isLoading = false;
            }
         }
      });
   }

   ngOnInit() {
      this.messageService.loadTemplates();
      this.productService.loadProducts();
      
      this.setupFormLogic();

      if (this.dialogData?.order) {
         this.isDialog = true;
         this.order = { ...this.dialogData.order };
         this.orderRowNumber = this.order?.['_rowNumber'] || null;
         this.isLoading = false;
      } else {
         this.route.paramMap.subscribe(params => {
            const idStr = params.get('id');
            if (idStr) {
               this.orderRowNumber = parseInt(idStr, 10);
               this.orderService.loadOrders();
            }
         });
      }
   }

   setupFormLogic() {
      this.orderForm.get('province')?.valueChanges.subscribe(province => {
         if (province) {
            this.locationService.getCities(province).subscribe(cities => this.cities = cities);
         } else {
            this.cities = [];
            this.orderForm.get('city')?.setValue('');
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

   toggleEdit() {
      if (!this.order) return;
      this.isEditing = true;
      this.orderForm.patchValue({
         fullName: this.order.fullName,
         phone: this.order.phone,
         address1: this.order.address1,
         province: this.order.province,
         productName: this.order.productName,
         productQuantity: this.order.productQuantity,
         productPrice: this.order.productPrice,
         shippingCost: this.order.shippingCost,
         carrier: this.order.carrier || 'envio local',
         status: this.order.status,
         notes: this.order.notes
      });

      if (this.order.province) {
         this.locationService.getCities(this.order.province).subscribe(cities => {
            this.cities = cities;
            this.orderForm.get('city')?.setValue(this.order?.city);
         });
      }
   }

   cancelEdit() {
      this.isEditing = false;
      this.orderForm.reset();
   }

   saveOrder() {
      if (this.orderForm.invalid || !this.order || !this.order['_rowNumber']) return;

      this.isSaving = true;
      const updatedData = {
         ...this.order,
         ...this.orderForm.getRawValue()
      };

      this.orderService.updateOrder(this.order['_rowNumber'], updatedData).subscribe({
         next: () => {
            this.order = { ...updatedData };
            this.isSaving = false;
            this.isEditing = false;
            this.snackBar.open('Order updated successfully', 'Close', { duration: 3000 });
         },
         error: () => {
            this.isSaving = false;
            this.snackBar.open('Error updating order', 'Close', { duration: 3000 });
         }
      });
   }

   openStatusSelector() {
     if (!this.order || this.isEditing) return;
     const dialogRef = this.dialog.open(StatusSelectorDialogComponent, {
       data: { 
         statuses: this.statuses,
         currentStatus: this.order.status
       },
       width: '400px',
       maxWidth: '95vw',
       panelClass: 'custom-dialog-container'
     });

     dialogRef.afterClosed().subscribe(status => {
       if (status) {
         this.updateStatus(status);
       }
     });
   }

   updateStatus(newStatus: string) {
      if (this.order && this.order['_rowNumber']) {
         const oldStatus = this.order.status;
         this.order.status = newStatus;
         this.orderService.updateOrder(this.order['_rowNumber'], this.order).subscribe({
            next: () => {
               this.snackBar.open(`Status updated to ${newStatus}`, 'Close', { duration: 3000 });
            },
            error: () => {
               this.order!.status = oldStatus;
               this.snackBar.open('Error updating status', 'Close', { duration: 3000 });
            }
         });
      }
   }

   openWhatsAppSelector() {
     if (!this.order) return;
     const templates = this.messageService.templates();
     const dialogRef = this.dialog.open(WhatsappSelectorDialogComponent, {
       data: { templates },
       width: '400px',
       maxWidth: '95vw',
       panelClass: 'custom-dialog-container'
     });

     dialogRef.afterClosed().subscribe(template => {
       if (template) {
         this.sendWhatsApp(template.text);
       }
     });
   }

   sendWhatsApp(templateText: string) {
      if (this.order && templateText) {
         const url = this.messageService.generateWhatsAppUrl(this.order, templateText);
         window.open(url, '_blank');
      }
   }

   copyTracking() {
      const tracking = this.order?.id || this.order?.['_rowNumber']?.toString() || '';
      navigator.clipboard.writeText(tracking).then(() => {
         this.snackBar.open('Tracking ID copied', 'Close', { duration: 2000 });
      });
   }

   copyAllInfo() {
      if (!this.order) return;
      const o = this.order;
      const text = `
ID: ${o.id || '#' + o['_rowNumber']}
CLIENTE: ${o.fullName || 'Cliente sin identificar'}
CEL: ${o.phone || 'N/A'}
DIR: ${o.address1 || 'Dirección pendiente'}, ${o.city || ''}, ${o.province || ''}
PROD: ${o.productQuantity}x ${o.productName}
TOTAL: RD$ ${this.totalAmount.toLocaleString()}
      `.trim();

      navigator.clipboard.writeText(text).then(() => {
         this.snackBar.open('Delivery info copied', 'Close', { duration: 2000 });
      });
   }

   normalize(s: string): string {
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
 
   getCarrierClass(carrier: string): string {
      const c = this.normalize(carrier || 'envio local');
      if (c === 'aurel pack') return 'bg-orange-500';
      if (c === 'gintracom') return 'bg-red-500';
      return 'bg-blue-600'; // default/local
   }

   closeDialog() {
       this.dialogRef?.close();
   }

   goBack() {
      if (this.isDialog) {
          this.closeDialog();
      } else {
          this.location.back();
      }
   }

   confirmDelete() {
       if (!this.order) return;
       this.confirmService.ask({
           title: 'Eliminar Pedido',
           message: `¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.`,
           confirmText: 'Eliminar',
           isDanger: true
       }).subscribe(confirmed => {
           if (confirmed) {
               this.orderService.deleteOrder(this.order!['_rowNumber']!).subscribe({
                   next: () => {
                       this.snackBar.open('Pedido eliminado correctamente', 'Cerrar', { duration: 3000 });
                       this.goBack();
                   },
                   error: () => this.snackBar.open('Error al eliminar el pedido', 'Cerrar', { duration: 3000 })
               });
           }
       });
   }
}
