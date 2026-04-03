import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { AbandonedOrderService } from '../../../core/services/abandoned-order.service';
import { OrderService } from '../../../core/services/order.service';
import { MessageService } from '../../../core/services/message.service';
import { AbandonedOrder } from '../../../core/models/abandoned-order.model';
import { Order } from '../../../core/models/order.model';

import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { WhatsappSelectorDialogComponent } from '../../../shared/components/whatsapp-selector-dialog/whatsapp-selector-dialog.component';
import { Router } from '@angular/router';

@Component({
   selector: 'app-abandoned-order-detail',
   standalone: true,
   imports: [
      CommonModule, RouterModule, LucideAngularModule, MatProgressSpinnerModule,
      FormsModule, MatButtonModule, MatSnackBarModule, MatDialogModule
   ],
   template: `
    <div [class.max-w-[1200px]]="!isDialog" [class.mx-auto]="!isDialog" 
         class="p-8 md:p-12 space-y-10 animate-in fade-in duration-500 pb-20 relative">
      
      <!-- Close Button -->
      <button (click)="goBack()" 
              class="absolute right-6 top-6 md:right-8 md:top-8 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all z-50">
        <lucide-icon name="x" class="w-6 h-6"></lucide-icon>
      </button>

      <!-- Top Bar: Breadcrumbs & Actions -->
      <div *ngIf="!isDialog" class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
         <div class="flex items-center space-x-2 text-[10px] md:text-sm text-slate-400 font-medium">
            <a routerLink="/abandoned-orders" class="hover:text-blue-600 transition-colors uppercase tracking-widest font-bold">Abandoned Orders</a>
            <lucide-icon name="chevron-right" class="w-3 h-3 flex items-center justify-center"></lucide-icon>
            <span class="text-slate-600 font-bold font-mono">{{ order?.id || order?.['_rowNumber'] }}</span>
         </div>
      </div>

      <!-- Header: Title & Status -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Abandoned Order {{ order?.id || '#' + order?.['_rowNumber'] }}</h1>
            <span class="px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-600">
               ABANDONADO
            </span>
         </div>
         <div class="flex items-center space-x-2 w-full sm:w-auto">
             <button *ngIf="order" (click)="convertToOrder()" 
                     [disabled]="isConverting"
                     class="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">
                <lucide-icon *ngIf="!isConverting" name="shopping-cart" class="w-4 h-4"></lucide-icon>
                <mat-spinner *ngIf="isConverting" diameter="16" color="accent" class="mr-2"></mat-spinner>
                <span>Convertir a Orden</span>
             </button>
         </div>
      </div>

      <!-- WhatsApp Main Action -->
      <button (click)="openWhatsAppSelector()" 
              [disabled]="isConverting"
              [class.opacity-50]="isConverting"
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
                    <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                       {{ order?.fullName?.charAt(0) || 'C' }}{{ order?.fullName?.split(' ')?.[1]?.charAt(0) || '' }}
                    </div>
                  <div class="min-w-0">
                     <h3 class="text-lg md:text-xl font-bold text-slate-900 leading-tight truncate">{{ order?.fullName || 'Cliente sin identificar' }}</h3>
                     <p class="text-[11px] md:text-sm text-slate-500 font-medium truncate">Abandoned Date: {{ order?.date | date:'MMMM yyyy' }}</p>
                  </div>
               </div>

               <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 pt-2">
                  <div class="space-y-1">
                     <p class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                     <div class="flex items-center space-x-2">
                        <lucide-icon name="phone" class="w-3 h-3 text-slate-400"></lucide-icon>
                        <p class="text-sm font-bold text-slate-800">{{ order?.phone }}</p>
                     </div>
                  </div>
                  <div class="sm:col-span-2 space-y-1">
                     <p class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Address</p>
                     <div class="flex items-start space-x-2">
                        <lucide-icon name="map-pin" class="w-3 h-3 text-slate-400 mt-0.5"></lucide-icon>
                        <p class="text-sm font-bold text-slate-800 leading-snug">
                           {{ order?.address1 || 'Dirección pendiente' }}
                           <ng-container *ngIf="order?.city || order?.province">, {{ order?.city }}, {{ order?.province }}</ng-container>
                        </p>
                     </div>
                  </div>
               </div>
            </div>
            <!-- Order Items -->
            <div class="card-stitch overflow-hidden">
               <div class="px-5 md:px-8 py-4 md:py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                  <div class="flex items-center space-x-3">
                     <lucide-icon name="shopping-bag" class="text-primary w-4 h-4 md:w-5 md:h-5"></lucide-icon>
                     <h2 class="text-sm md:text-base font-black text-slate-900 tracking-tight uppercase tracking-wider">Abandoned Items</h2>
                  </div>
                  <span class="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">{{ order?.productQuantity }} Units</span>
               </div>
               
               <div class="p-4">
                  <div class="flex flex-col gap-4">
                     <div class="p-5 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 hover:bg-slate-50/50 transition-colors relative bg-white border border-slate-100 rounded-2xl shadow-sm sm:border-none sm:shadow-none sm:bg-transparent">
                        <div class="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center p-2 border border-slate-100 flex-shrink-0">
                           <img [src]="'https://api.dicebear.com/7.x/identicon/svg?seed=' + order?.productName" class="w-full h-full object-contain">
                        </div>
                        <div class="flex-1 min-w-0 overflow-hidden w-full">
                           <h4 class="text-sm md:text-base font-bold text-slate-900 overflow-hidden text-ellipsis whitespace-nowrap" style="max-width: calc(100vw - 6rem);">{{ order?.productName }}</h4>
                           <div class="sm:hidden mt-2 flex items-center justify-between">
                              <span class="text-xs font-bold text-slate-900">{{ order?.productQuantity }} units</span>
                              <span class="text-sm font-black text-slate-900">RD$ {{ order?.productPrice | number }}</span>
                           </div>
                        </div>
                        <div class="hidden sm:block text-center w-12 flex-shrink-0">
                           <p class="text-sm font-bold text-slate-900">{{ order?.productQuantity }}</p>
                        </div>
                        <div class="hidden sm:block text-right w-32 flex-shrink-0">
                           <p class="text-[15px] md:text-lg font-black text-slate-900">RD$ {{ order?.productPrice | number }}</p>
                        </div>
                     </div>
                   </div>
                  <!-- Price Summary -->
                  <div class="bg-slate-50/50 p-5 md:p-8 flex flex-col items-end space-y-4">
                     <div class="w-full md:w-72 space-y-3">
                        <div class="flex justify-between text-xs md:text-sm font-medium text-slate-500">
                           <span>Subtotal</span>
                           <span class="text-slate-900 font-bold italic">RD$ {{ (order?.productPrice || 0) * (order?.productQuantity || 0) | number }}</span>
                        </div>
                        <div class="pt-4 border-t border-slate-200 flex justify-between items-center mt-4">
                           <span class="text-base md:text-lg font-black text-slate-900 uppercase tracking-tighter">Total Amount</span>
                           <div class="flex flex-col items-end">
                              <span class="text-xl md:text-2xl font-black text-primary tracking-tighter italic">RD$ {{ totalAmount | number:'1.2-2' }}</span>
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
                        <div class="bg-slate-200 w-8 h-8 rounded-lg flex items-center justify-center p-1 shadow-sm">
                           <lucide-icon name="truck" class="w-4 h-4 text-slate-500"></lucide-icon>
                        </div>
                        <span class="text-sm font-bold text-slate-900 capitalize">{{ order?.carrier || 'No especificado' }}</span>
                     </div>
                  </div>

                  <div>
                     <p class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Identifier</p>
                     <div class="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                        <span class="text-[10px] md:text-xs font-bold text-slate-700 font-mono tracking-tighter">{{ order?.id || order?.['_rowNumber'] }}</span>
                     </div>
                  </div>
               </div>
            </div>

            <!-- Order Notes -->
            <div class="card-stitch p-5 md:p-8 space-y-6" *ngIf="order?.notes">
               <div class="flex items-center space-x-3 mb-2">
                  <lucide-icon name="file-text" class="text-primary w-4 h-4 md:w-5 md:h-5"></lucide-icon>
                  <h2 class="text-sm md:text-base font-black text-slate-900 tracking-tight uppercase tracking-wider">Notes</h2>
               </div>

               <div class="space-y-4">
                  <div class="bg-primary/5 p-4 rounded-xl border border-primary/20 relative overflow-hidden">
                     <p class="text-xs text-slate-600 font-medium leading-relaxed italic">
                        "{{ order?.notes }}"
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
  `]
})
export class AbandonedOrderDetailComponent implements OnInit {
   private route = inject(ActivatedRoute);
   private location = inject(Location);
   private snackBar = inject(MatSnackBar);
   private dialog = inject(MatDialog);
   public abandonedOrderService = inject(AbandonedOrderService);
   public orderService = inject(OrderService);
   public messageService = inject(MessageService);
   private router = inject(Router);
   private dialogRef = inject(MatDialogRef<AbandonedOrderDetailComponent>, { optional: true });
   private dialogData = inject(MAT_DIALOG_DATA, { optional: true });

   isDialog = false;

   orderRowNumber: number | null = null;
   order: AbandonedOrder | null = null;
   isLoading = true;
   isConverting = false;

   get totalAmount() {
      if (!this.order) return 0;
      const subtotal = (this.order.productPrice * this.order.productQuantity);
      return subtotal + (this.order.shippingCost || 0) + (this.order.packaging || 0);
   }

   constructor() {
      effect(() => {
         const orders = this.abandonedOrderService.abandonedOrders();
         if (orders.length > 0 && this.orderRowNumber) {
            const found = orders.find((o: AbandonedOrder) => o['_rowNumber'] === this.orderRowNumber);
            this.order = found ? { ...found } : null;
            this.isLoading = false;
         }
      });
   }

   ngOnInit() {
      this.messageService.loadTemplates();
      
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
               this.abandonedOrderService.loadAbandonedOrders();
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
         // Cast to any to reuse the variable mapping in MessageService
         const url = this.messageService.generateWhatsAppUrl(this.order as any, templateText);
         window.open(url, '_blank');
      }
   }

   convertToOrder() {
       if (!this.order || this.isConverting) return;
       // Validations if strict mapping is required
       if (!this.order.fullName || !this.order.productName || !this.order.phone) {
           this.snackBar.open('Faltan datos clave para crear la orden (nombre, producto, teléfono).', 'Cerrar', { duration: 4000 });
           return;
       }

       this.isConverting = true;

       const newOrder: Order = {
           date: new Date().toISOString().split('T')[0], // The order service will reformat this to yyyy-mm-dd
           fullName: this.order.fullName,
           phone: this.order.phone,
           address1: this.order.address1 || '',
           province: this.order.province || '',
           city: this.order.city || '',
           productName: this.order.productName,
           productQuantity: this.order.productQuantity,
           productPrice: this.order.productPrice,
           shippingCost: this.order.shippingCost || 0,
           packaging: this.order.packaging || 0,
           carrier: this.order.carrier || '',
           status: 'no confirmado', // Default new order status
           notes: this.order.notes || ''
       };

       this.orderService.createOrder(newOrder).subscribe({
           next: () => {
               // On success creating order, we safely remove the abandoned order entry.
               const rowNumber = this.order!['_rowNumber'];
               if (rowNumber) {
                   this.abandonedOrderService.deleteAbandonedOrder(rowNumber).subscribe({
                       next: () => {
                           this.snackBar.open('¡Orden creada exitosamente!', 'Cerrar', { duration: 4000 });
                           this.isConverting = false;
                           
                           // Redirect to orders List
                           if (this.isDialog) {
                               this.dialogRef?.close();
                           }
                           this.router.navigate(['/orders']);
                       },
                       error: (err: any) => {
                           console.error('Failed to clean up abandoned order', err);
                           this.snackBar.open('Orden creada, pero falló al borrar el registro abandonado.', 'Cerrar', { duration: 5000 });
                           this.isConverting = false;
                       }
                   });
               } else {
                   this.isConverting = false;
                   this.router.navigate(['/orders']);
               }
           },
           error: (err: any) => {
               console.error('Error converting order:', err);
               this.snackBar.open('Error al convertir el pedido.', 'Cerrar', { duration: 4000 });
               this.isConverting = false;
           }
       });
   }

   goBack() {
      if (this.isDialog) {
          this.dialogRef?.close();
      } else {
          this.location.back();
      }
   }
}
