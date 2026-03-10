import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { MessageService } from '../../../core/services/message.service';
import { Order } from '../../../core/models/order.model';

import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

@Component({
   selector: 'app-order-detail',
   standalone: true,
   imports: [
      CommonModule, RouterModule, LucideAngularModule, MatProgressSpinnerModule,
      FormsModule, MatMenuModule, MatButtonModule
   ],
   template: `
    <div class="max-w-[1200px] mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500 pb-20">
      
      <!-- Top Bar: Breadcrumbs & Search -->
      <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
         <div class="flex items-center space-x-2 text-sm text-slate-400 font-medium">
            <a routerLink="/orders" class="hover:text-blue-600">Orders</a>
            <lucide-icon name="chevron-right" class="w-3 h-3 flex items-center justify-center"></lucide-icon>
            <span class="text-slate-600 font-bold">ORD-{{ order?.id || order?.['_rowNumber'] }}</span>
         </div>
         <div class="flex items-center space-x-4 w-full md:w-auto">
            <div class="relative flex-1 md:w-64 group">
               <lucide-icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"></lucide-icon>
               <input type="text" placeholder="Search orders..." class="w-full bg-slate-100/50 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-100 transition-all">
            </div>
            <button class="p-2 text-slate-400 hover:text-slate-600 transition-colors">
               <lucide-icon name="bell" class="w-5 h-5"></lucide-icon>
            </button>
            <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-[11px] font-bold text-white uppercase">
               ac
            </div>
         </div>
      </div>

      <!-- Header: Title & Actions -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div class="flex items-center space-x-4">
            <h1 class="text-3xl font-black text-slate-900 tracking-tight">Order #ORD-{{ order?.id || order?.['_rowNumber'] }}</h1>
            <span class="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-wider">
               {{ order?.status || 'PROCESSING' }}
            </span>
         </div>
         <div class="flex items-center space-x-3 w-full md:w-auto">
            <button [matMenuTriggerFor]="statusMenu" class="flex-1 md:flex-none flex items-center justify-between space-x-4 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all">
               <span>Change Status</span>
               <lucide-icon name="chevron-down" class="w-4 h-4"></lucide-icon>
            </button>
            <mat-menu #statusMenu="matMenu" class="rounded-xl shadow-xl border border-slate-100">
               <button mat-menu-item *ngFor="let s of statuses" (click)="updateStatus(s)" class="text-xs font-bold uppercase tracking-wide text-slate-600">
                  {{ s }}
               </button>
            </mat-menu>
            <button class="flex-1 md:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-slate-100 text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all">
               <lucide-icon name="pencil" class="w-4 h-4"></lucide-icon>
               <span>Edit Order</span>
            </button>
         </div>
      </div>

      <!-- WhatsApp Main Action -->
      <button [matMenuTriggerFor]="whatsappMenu" 
              class="w-full bg-[#25D366] hover:bg-[#20bd5c] text-white py-4 rounded-xl flex items-center justify-center space-x-3 shadow-lg shadow-emerald-100 transition-all active:scale-[0.99]">
         <lucide-icon name="message-square" class="w-5 h-5"></lucide-icon>
         <span class="text-base font-black uppercase tracking-widest">Send WhatsApp Message</span>
      </button>

      <mat-menu #whatsappMenu="matMenu" class="rounded-2xl shadow-2xl border border-slate-100 min-w-[300px] p-2">
         <div class="px-4 py-3 border-b border-slate-50 mb-2">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Template</p>
         </div>
         <button mat-menu-item *ngFor="let tpl of messageService.templates()" (click)="sendWhatsApp(tpl.text)" 
                 class="hover:bg-slate-50 rounded-xl px-4 py-3 transition-colors flex items-center justify-between group">
            <div class="flex flex-col">
               <span class="text-sm font-bold text-slate-800">{{ tpl.name }}</span>
               <span class="text-[10px] text-slate-400 line-clamp-1">{{ tpl.text }}</span>
            </div>
            <lucide-icon name="send" class="text-emerald-500 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"></lucide-icon>
         </button>
      </mat-menu>

      <div *ngIf="isLoading" class="flex justify-center py-24">
         <mat-spinner diameter="40" strokeWidth="3"></mat-spinner>
      </div>

      <div *ngIf="!isLoading && order" class="grid grid-cols-1 lg:grid-cols-12 gap-8">
         
         <!-- Left Column -->
         <div class="lg:col-span-8 space-y-6">
            
            <!-- Customer Information -->
            <div class="bg-white border border-slate-200 rounded-2xl p-8 space-y-8 shadow-sm">
               <div class="flex items-center space-x-3">
                  <lucide-icon name="user" class="text-blue-600 w-5 h-5"></lucide-icon>
                  <h2 class="text-base font-black text-slate-900 tracking-tight">Customer Information</h2>
               </div>

               <div class="flex items-center space-x-4">
                   <div class="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[11px] font-bold text-blue-700 shadow-sm mt-0.5">
                      {{ order.fullName.charAt(0) }}{{ order.fullName.split(' ')[1] ? order.fullName.split(' ')[1].charAt(0) : '' }}
                   </div>
                  <div>
                     <h3 class="text-xl font-bold text-slate-900 leading-tight">{{ order.fullName }}</h3>
                     <p class="text-sm text-slate-500 font-medium">Customer since {{ order.date | date:'MMMM yyyy' }} • 12 Orders</p>
                  </div>
               </div>

               <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div class="space-y-1">
                     <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                     <p class="text-sm font-bold text-slate-800">{{ order.fullName.toLowerCase().replace(' ', '.') }}&#64;example.com</p>
                  </div>
                  <div class="space-y-1">
                     <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                     <p class="text-sm font-bold text-slate-800">{{ order.phone }}</p>
                  </div>
                  <div class="md:col-span-2 space-y-1">
                     <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Address</p>
                     <p class="text-sm font-bold text-slate-800">{{ order.address1 }}, {{ order.city }}, {{ order.province }}</p>
                  </div>
               </div>
            </div>

            <!-- Order Items -->
            <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
               <div class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                  <div class="flex items-center space-x-3">
                     <lucide-icon name="shopping-bag" class="text-blue-600 w-5 h-5"></lucide-icon>
                     <h2 class="text-base font-black text-slate-900 tracking-tight">Order Items</h2>
                  </div>
                  <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">{{ order.productQuantity }} Items</span>
               </div>
               
               <div class="p-0">
                  <div class="divide-y divide-slate-100">
                     <div class="p-8 flex items-center space-x-6 hover:bg-slate-50/50 transition-colors">
                        <div class="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center p-2 border border-slate-100">
                           <img [src]="'https://api.dicebear.com/7.x/identicon/svg?seed=' + order.productName" class="w-full h-full object-contain">
                        </div>
                        <div class="flex-1">
                           <h4 class="text-base font-bold text-slate-900">{{ order.productName }}</h4>
                           <p class="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">SKU: {{ 'SKU-' + order['_rowNumber'] }} • Color: Default</p>
                        </div>
                        <div class="text-center w-12">
                           <p class="text-sm font-bold text-slate-900">{{ order.productQuantity }}</p>
                        </div>
                        <div class="text-right w-24">
                           <p class="text-lg font-black text-slate-900">RD$ {{ order.productPrice | number }}</p>
                        </div>
                     </div>
                  </div>

                  <!-- Price Summary -->
                  <div class="bg-slate-50/50 p-8 flex flex-col items-end space-y-4">
                     <div class="w-full md:w-64 space-y-2">
                        <div class="flex justify-between text-sm font-medium text-slate-500">
                           <span>Subtotal</span>
                           <span class="text-slate-900 font-bold italic">RD$ {{ order.productPrice * order.productQuantity | number }}</span>
                        </div>
                        <div class="flex justify-between text-sm font-medium text-slate-500">
                           <span>Shipping</span>
                           <span class="text-emerald-600 font-black uppercase tracking-widest text-[10px]">Free</span>
                        </div>
                        <div class="flex justify-between text-sm font-medium text-slate-500">
                           <span>Tax (8%)</span>
                           <span class="text-slate-900 font-bold italic">RD$ {{ (order.productPrice * order.productQuantity * 0.08) | number }}</span>
                        </div>
                        <div class="pt-4 border-t border-slate-200 flex justify-between items-center mt-4">
                           <span class="text-lg font-black text-slate-900 uppercase tracking-tighter">Total</span>
                           <span class="text-2xl font-black text-blue-600 tracking-tighter italic">RD$ {{ totalAmount | number:'1.2-2' }}</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <!-- Right Column -->
         <div class="lg:col-span-4 space-y-6">
            
            <!-- Delivery Info -->
            <div class="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
               <div class="flex items-center space-x-3 mb-2">
                  <lucide-icon name="truck" class="text-blue-600 w-5 h-5"></lucide-icon>
                  <h2 class="text-base font-black text-slate-900 tracking-tight">Delivery Info</h2>
               </div>

               <div class="space-y-6">
                  <div>
                     <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Carrier</p>
                     <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center p-1">
                           <span class="text-[8px] font-black text-white italic">FedEx</span>
                        </div>
                        <span class="text-sm font-bold text-slate-900">Priority Overnight</span>
                     </div>
                  </div>

                  <div>
                     <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tracking Number</p>
                     <div class="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 group">
                        <span class="text-xs font-bold text-slate-700 font-mono tracking-tighter">FX-9928-1120-002</span>
                        <button (click)="copyTracking()" class="text-slate-300 hover:text-blue-600 transition-colors">
                           <lucide-icon name="copy" class="w-4 h-4"></lucide-icon>
                        </button>
                     </div>
                  </div>

                  <div>
                     <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estimated Delivery</p>
                     <span class="text-sm font-bold text-slate-900 italic underline decoration-blue-200 decoration-4 underline-offset-4">October 26, 2023</span>
                  </div>

                  <div class="w-full h-48 rounded-2xl border border-slate-100 overflow-hidden relative group">
                     <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&auto=format&fit=crop&q=60" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                     <div class="absolute inset-0 bg-blue-900/10 flex items-center justify-center">
                        <div class="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl border-4 border-white animate-bounce">
                           <lucide-icon name="map-pin" class="w-5 h-5"></lucide-icon>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <!-- Order Notes -->
            <div class="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm">
               <div class="flex items-center space-x-3 mb-2">
                  <lucide-icon name="file-text" class="text-blue-600 w-5 h-5"></lucide-icon>
                  <h2 class="text-base font-black text-slate-900 tracking-tight">Order Notes</h2>
               </div>

               <div class="space-y-4">
                  <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-100 relative overflow-hidden">
                     <div class="absolute top-0 right-0 p-2 opacity-10">
                        <lucide-icon name="message-square" class="w-6 h-6"></lucide-icon>
                     </div>
                     <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Customer Note:</p>
                     <p class="text-xs text-slate-600 font-medium leading-relaxed italic">
                        "{{ order.notes || 'No customer notes provided for this order.' }}"
                     </p>
                  </div>
                  
                  <div class="space-y-2">
                     <textarea placeholder="Add a private staff note..." 
                               class="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all min-h-[100px]"></textarea>
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
   public orderService = inject(OrderService);
   public messageService = inject(MessageService);

   orderRowNumber: number | null = null;
   order: Order | null = null;
   isLoading = true;
   selectedTemplateText: string = '';

   statuses = [
      'confirmado completo', 'empacado', 'envio en proceso', 'entregado', 'cancelado'
   ];

   get totalAmount() {
      if (!this.order) return 0;
      const subtotal = (this.order.productPrice * this.order.productQuantity);
      const tax = subtotal * 0.08; // Added 8% tax as seen in design
      return subtotal + tax + (this.order.shippingCost || 0) + (this.order.packaging || 0);
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

      effect(() => {
         const tpls = this.messageService.templates();
         if (tpls.length > 0 && !this.selectedTemplateText) {
            this.selectedTemplateText = tpls[0].text;
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

   updateStatus(newStatus: string) {
      if (this.order && this.order['_rowNumber']) {
         this.order.status = newStatus;
         this.orderService.updateOrder(this.order['_rowNumber'], this.order).subscribe();
      }
   }

   sendWhatsApp(templateText?: string) {
      const text = templateText || this.selectedTemplateText;
      if (this.order && text) {
         const url = this.messageService.generateWhatsAppUrl(this.order, text);
         window.open(url, '_blank');
      }
   }

   copyTracking() {
      const tracking = 'FX-9928-1120-002';
      navigator.clipboard.writeText(tracking).then(() => {
         // Visual feedback can be added later
      });
   }

   goBack() {
      this.location.back();
   }
}
