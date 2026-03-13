import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { MessageService } from '../../../core/services/message.service';
import { Order } from '../../../core/models/order.model';

import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { WhatsappSelectorDialogComponent } from '../../../shared/components/whatsapp-selector-dialog/whatsapp-selector-dialog.component';
import { StatusSelectorDialogComponent } from '../../../shared/components/status-selector-dialog/status-selector-dialog.component';

@Component({
   selector: 'app-order-detail',
   standalone: true,
   imports: [
      CommonModule, RouterModule, LucideAngularModule, MatProgressSpinnerModule,
      FormsModule, MatButtonModule, MatSnackBarModule, MatDialogModule
   ],
   template: `
    <div class="max-w-[1200px] mx-auto p-4 md:px-8 md:py-4 space-y-6 animate-in fade-in duration-500 pb-20">
      
      <!-- Top Bar: Breadcrumbs & Actions -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
         <div class="flex items-center space-x-2 text-[10px] md:text-sm text-slate-400 font-medium">
            <a routerLink="/orders" class="hover:text-blue-600 transition-colors uppercase tracking-widest font-bold">Orders</a>
            <lucide-icon name="chevron-right" class="w-3 h-3 flex items-center justify-center"></lucide-icon>
            <span class="text-slate-600 font-bold font-mono">{{ order?.id || order?.['_rowNumber'] }}</span>
         </div>
         <div class="hidden sm:flex items-center space-x-4">
            <div class="relative w-48 lg:w-64 group">
               <lucide-icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4"></lucide-icon>
               <input type="text" placeholder="Search orders..." class="w-full bg-slate-100/50 border-none rounded-ui py-2 pl-10 pr-4 text-xs focus:ring-2 focus:ring-primary/20 transition-all outline-none">
            </div>
            <button class="p-2 text-text-muted hover:text-text transition-colors">
               <lucide-icon name="bell" class="w-5 h-5"></lucide-icon>
            </button>
            <div class="w-8 h-8 rounded-ui bg-primary flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm">
               AC
            </div>
         </div>
      </div>

      <!-- Header: Title & Status -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Order {{ order?.id || order?.['_rowNumber'] }}</h1>
            <span [class]="getStatusClass(order?.status || '')" class="px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider">
               {{ order?.status || 'SIN ESTADO' }}
            </span>
         </div>
         <div class="flex items-center space-x-2 w-full sm:w-auto">
             <button (click)="openStatusSelector()" class="flex-1 sm:flex-none flex items-center justify-between space-x-3 px-4 py-2.5 bg-white border border-border rounded-xl text-xs font-bold text-text hover:bg-slate-50 transition-all">
                <span>Change Status</span>
                <lucide-icon name="chevron-down" class="w-4 h-4"></lucide-icon>
             </button>
            <button *ngIf="order" (click)="copyAllInfo()" class="p-2.5 bg-secondary hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-xs flex items-center space-x-2 border border-slate-200">
               <lucide-icon name="copy" class="w-4 h-4"></lucide-icon>
               <span class="hidden md:inline">Copy for Delivery</span>
            </button>
            <button *ngIf="order" [routerLink]="['/orders', order?.['_rowNumber'], 'edit']" class="p-2.5 bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all font-bold text-xs flex items-center space-x-2 border border-transparent">
               <lucide-icon name="pencil" class="w-4 h-4"></lucide-icon>
               <span class="hidden md:inline">Edit Order</span>
            </button>
         </div>
      </div>

      <!-- WhatsApp Main Action -->
      <button (click)="openWhatsAppSelector()" 
              class="w-full bg-[#25D366] hover:bg-[#20bd5c] text-white py-4 md:py-5 rounded-xl flex items-center justify-center space-x-3 shadow-lg shadow-emerald-100 transition-all active:scale-[0.98]">
         <lucide-icon name="message-square" class="w-5 h-5 md:w-6 md:h-6"></lucide-icon>
         <span class="text-sm md:text-base font-black uppercase tracking-widest">Send WhatsApp Message</span>
      </button>

      <div *ngIf="isLoading" class="flex justify-center py-24">
         <mat-spinner diameter="40" strokeWidth="3"></mat-spinner>
      </div>

      <div *ngIf="!isLoading && order" class="grid grid-cols-1 lg:grid-cols-12 gap-8">
         
         <!-- Left Column -->
         <div class="lg:col-span-8 space-y-6">
            
            <!-- Customer Information -->
            <div class="card-stitch p-5 md:p-8 space-y-6 md:space-y-8">
               <div class="flex items-center space-x-3">
                  <lucide-icon name="user" class="text-primary w-4 h-4 md:w-5 md:h-5"></lucide-icon>
                  <h2 class="text-sm md:text-base font-black text-slate-900 tracking-tight uppercase tracking-wider">Customer</h2>
               </div>

               <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] md:text-[12px] font-bold text-primary shadow-sm">
                       {{ order.fullName.charAt(0) }}{{ order.fullName.split(' ')[1] ? order.fullName.split(' ')[1].charAt(0) : '' }}
                    </div>
                  <div class="min-w-0">
                     <h3 class="text-lg md:text-xl font-bold text-slate-900 leading-tight truncate">{{ order.fullName }}</h3>
                     <p class="text-[11px] md:text-sm text-slate-500 font-medium truncate">Since {{ order.date | date:'MMMM yyyy' }}</p>
                  </div>
               </div>

               <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 pt-2">
                  <div class="space-y-1">
                     <p class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                     <div class="flex items-center space-x-2">
                        <lucide-icon name="phone" class="w-3 h-3 text-slate-400"></lucide-icon>
                        <p class="text-sm font-bold text-slate-800">{{ order.phone }}</p>
                     </div>
                  </div>
                  <div class="sm:col-span-2 space-y-1">
                     <p class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Address</p>
                     <div class="flex items-start space-x-2">
                        <lucide-icon name="map-pin" class="w-3 h-3 text-slate-400 mt-0.5"></lucide-icon>
                        <p class="text-sm font-bold text-slate-800 leading-snug">{{ order.address1 }}, {{ order.city }}, {{ order.province }}</p>
                     </div>
                  </div>
               </div>
            </div>
            <!-- Order Items -->
            <div class="card-stitch overflow-hidden">
               <div class="px-5 md:px-8 py-4 md:py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                  <div class="flex items-center space-x-3">
                     <lucide-icon name="shopping-bag" class="text-primary w-4 h-4 md:w-5 md:h-5"></lucide-icon>
                     <h2 class="text-sm md:text-base font-black text-slate-900 tracking-tight uppercase tracking-wider">Order Items</h2>
                  </div>
                  <span class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">{{ order.productQuantity }} Units</span>
               </div>
               
               <div class="p-4">
                  <div class="flex flex-col gap-4">
                     <div class="p-5 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 hover:bg-slate-50/50 transition-colors relative bg-white border border-slate-100 rounded-2xl shadow-sm sm:border-none sm:shadow-none sm:bg-transparent">
                        <div class="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center p-2 border border-slate-100 flex-shrink-0">
                           <img [src]="'https://api.dicebear.com/7.x/identicon/svg?seed=' + order.productName" class="w-full h-full object-contain">
                        </div>
                        <div class="flex-1 min-w-0 overflow-hidden w-full">
                           <h4 class="text-sm md:text-base font-bold text-slate-900 overflow-hidden text-ellipsis whitespace-nowrap" style="max-width: calc(100vw - 6rem);">{{ order.productName }}</h4>
                           <p class="text-[10px] md:text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">SKU: {{ 'SKU-' + order['_rowNumber'] }}</p>
                           <div class="sm:hidden mt-2 flex items-center justify-between">
                              <span class="text-xs font-bold text-slate-900">{{ order.productQuantity }} units</span>
                              <span class="text-sm font-black text-slate-900">RD$ {{ order.productPrice | number }}</span>
                           </div>
                        </div>
                        <div class="hidden sm:block text-center w-12 flex-shrink-0">
                           <p class="text-sm font-bold text-slate-900">{{ order.productQuantity }}</p>
                        </div>
                        <div class="hidden sm:block text-right w-32 flex-shrink-0">
                           <p class="text-[15px] md:text-lg font-black text-slate-900">RD$ {{ order.productPrice | number }}</p>
                        </div>
                     </div>
                  </div>

                  <!-- Price Summary -->
                  <div class="bg-slate-50/50 p-5 md:p-8 flex flex-col items-end space-y-4">
                     <div class="w-full md:w-72 space-y-3">
                        <div class="flex justify-between text-xs md:text-sm font-medium text-slate-500">
                           <span>Subtotal</span>
                           <span class="text-slate-900 font-bold italic">RD$ {{ order.productPrice * order.productQuantity | number }}</span>
                        </div>
                        <div *ngIf="order.shippingCost" class="flex justify-between text-xs md:text-sm font-medium text-slate-500">
                           <span>Shipping</span>
                           <span class="text-slate-900 font-bold italic">RD$ {{ order.shippingCost | number }}</span>
                        </div>
                        <div *ngIf="order.packaging" class="flex justify-between text-xs md:text-sm font-medium text-slate-500">
                           <span>Packaging</span>
                           <span class="text-slate-900 font-bold italic">RD$ {{ order.packaging | number }}</span>
                        </div>

                        <div class="pt-4 border-t border-slate-200 flex justify-between items-center mt-4">
                           <span class="text-base md:text-lg font-black text-slate-900 uppercase tracking-tighter">Total Amount</span>
                           <div class="flex flex-col items-end">
                              <span class="text-xl md:text-2xl font-black text-primary tracking-tighter italic">RD$ {{ totalAmount | number:'1.2-2' }}</span>
                              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">VAT Included</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <!-- Right Column -->
         <div class="lg:col-span-4 space-y-6">
            
            <!-- Delivery Info -->
            <div class="card-stitch p-5 md:p-8 space-y-6">
               <div class="flex items-center space-x-3 mb-2">
                  <lucide-icon name="truck" class="text-primary w-4 h-4 md:w-5 md:h-5"></lucide-icon>
                  <h2 class="text-sm md:text-base font-black text-slate-900 tracking-tight uppercase tracking-wider">Delivery Info</h2>
               </div>

               <div class="space-y-6">
                  <div>
                     <p class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Carrier</p>
                     <div class="flex items-center space-x-3">
                        <div [class]="getCarrierClass(order?.carrier || '')" class="w-8 h-8 rounded-lg flex items-center justify-center p-1 shadow-sm">
                           <lucide-icon name="truck" class="w-4 h-4 text-white"></lucide-icon>
                        </div>
                        <span class="text-sm font-bold text-slate-900 capitalize">{{ order.carrier || 'Envio Local' }}</span>
                     </div>
                  </div>

                  <div>
                     <p class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tracking Number</p>
                     <div class="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                        <span class="text-[10px] md:text-xs font-bold text-slate-700 font-mono tracking-tighter">{{ order.id || order['_rowNumber'] }}</span>
                        <button (click)="copyTracking()" class="text-slate-300 hover:text-blue-600 transition-colors">
                           <lucide-icon name="copy" class="w-4 h-4"></lucide-icon>
                        </button>
                     </div>
                  </div>
               </div>
            </div>

            <!-- Order Notes -->
            <div class="card-stitch p-5 md:p-8 space-y-6">
               <div class="flex items-center space-x-3 mb-2">
                  <lucide-icon name="file-text" class="text-primary w-4 h-4 md:w-5 md:h-5"></lucide-icon>
                  <h2 class="text-sm md:text-base font-black text-slate-900 tracking-tight uppercase tracking-wider">Order Notes</h2>
               </div>

               <div class="space-y-4">
                  <div class="bg-primary/5 p-4 rounded-xl border border-primary/20 relative overflow-hidden">
                     <div class="absolute top-0 right-0 p-2 opacity-5">
                        <lucide-icon name="message-square" class="w-8 h-8"></lucide-icon>
                     </div>
                     <p class="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-widest mb-2">Customer Note:</p>
                     <p class="text-xs text-slate-600 font-medium leading-relaxed italic">
                        "{{ order.notes || 'No customer notes provided for this order.' }}"
                     </p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  `,
   styles: [`
    :host { display: block; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
  `]
})
export class OrderDetailComponent implements OnInit {
   private route = inject(ActivatedRoute);
   private location = inject(Location);
   private snackBar = inject(MatSnackBar);
   private dialog = inject(MatDialog);
   public orderService = inject(OrderService);
   public messageService = inject(MessageService);

   orderRowNumber: number | null = null;
   order: Order | null = null;
   isLoading = true;

   statuses = [
      'cancelado', 'desaparecido', 'no confirmado', 'pendiente de ubicacion',
      'confirmado completo', 'empacado', 'envio en proceso', 'entregado', 'dinero recibido'
   ];

   get totalAmount() {
      if (!this.order) return 0;
      const subtotal = (this.order.productPrice * this.order.productQuantity);
      return subtotal + (this.order.shippingCost || 0) + (this.order.packaging || 0);
   }

   constructor() {
      effect(() => {
         const orders = this.orderService.orders();
         if (orders.length > 0 && this.orderRowNumber) {
            const found = orders.find(o => o['_rowNumber'] === this.orderRowNumber);
            this.order = found ? { ...found } : null;
            this.isLoading = false;
         }
      });
   }

   ngOnInit() {
      this.messageService.loadTemplates();
      this.route.paramMap.subscribe(params => {
         const idStr = params.get('id');
         if (idStr) {
            this.orderRowNumber = parseInt(idStr, 10);
            this.orderService.loadOrders();
         }
      });
   }

   openStatusSelector() {
    if (!this.order) return;
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
         this.order.status = newStatus;
         this.orderService.updateOrder(this.order['_rowNumber'], this.order).subscribe();
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
         // Visual feedback can be added later
      });
   }

   copyAllInfo() {
      if (!this.order) return;
      const o = this.order;
      const text = `
ID: #${o.id || o['_rowNumber']}
CLIENTE: ${o.fullName}
CEL: ${o.phone}
DIR: ${o.address1}, ${o.city}
PROD: ${o.productQuantity}x ${o.productName}
TOTAL: RD$ ${this.totalAmount.toLocaleString()}
      `.trim();

      navigator.clipboard.writeText(text).then(() => {
         // Visual feedback could be added here
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
      if (s === 'confirmado completo') return 'bg-[#fff2b2] text-[#b08d1a]';
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

   goBack() {
      this.location.back();
   }
}
