import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { MessageService } from '../../../core/services/message.service';
import { Order } from '../../../core/models/order.model';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatIconModule, MatProgressSpinnerModule, FormsModule
  ],
  template: `
    <div class="max-w-[1100px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      <!-- Top Actions & Breadcrumbs -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div class="space-y-1">
          <nav class="flex items-center space-x-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
             <a routerLink="/orders" class="hover:text-blue-600 transition-colors">Orders</a>
             <mat-icon class="!text-[12px] h-3 w-3 flex items-center justify-center">chevron_right</mat-icon>
             <span class="text-slate-600">ORD-{{ order?.id || order?.['_rowNumber'] }}</span>
          </nav>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-3">
             <span>Order Details</span>
             <span class="text-slate-300 font-medium">#ORD-{{ order?.id || order?.['_rowNumber'] }}</span>
          </h1>
        </div>

        <div class="flex items-center space-x-3">
           <button class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm bg-white hover:bg-slate-50 transition-all flex items-center space-x-2 shadow-sm">
              <mat-icon class="!text-lg">print</mat-icon>
              <span>Print Invoice</span>
           </button>
           <button (click)="updateStatus('envio en proceso')" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 text-sm font-bold flex items-center space-x-2">
              <mat-icon class="!text-lg">local_shipping</mat-icon>
              <span>Mark as Shipped</span>
           </button>
        </div>
      </div>

      <div *ngIf="isLoading" class="flex justify-center py-24">
        <mat-spinner diameter="40" strokeWidth="3"></mat-spinner>
      </div>

      <div *ngIf="!isLoading && order" class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Left Column: Order Flow & Items -->
        <div class="lg:col-span-8 space-y-8">
           
           <!-- Status Timeline -->
           <div class="card-stitch p-8 bg-white overflow-hidden relative">
              <div class="absolute top-0 right-0 w-32 h-32 bg-slate-50 opacity-50 rounded-bl-full -mr-16 -mt-16 border border-slate-100"></div>
              
              <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Order Life-Cycle</h3>
              
              <div class="flex flex-col md:flex-row items-start md:items-center justify-between relative space-y-8 md:space-y-0">
                 <!-- Progress Bar Connector (Desktop) -->
                 <div class="hidden md:block absolute top-5 left-8 right-8 h-1 bg-slate-100 -z-0 rounded-full overflow-hidden">
                    <div class="h-full bg-blue-500 transition-all duration-1000" [style.width]="getProgressWidth()"></div>
                 </div>

                 <div *ngFor="let step of timelineSteps; let i = index" class="flex flex-row md:flex-col items-center md:items-center z-10 group relative">
                    <div [class]="getTimelineIconClass(step)" class="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all group-hover:scale-110 mb-0 md:mb-4 mr-4 md:mr-0">
                       <mat-icon class="!text-sm">{{ step.icon }}</mat-icon>
                    </div>
                    <div class="text-left md:text-center">
                       <p class="text-[12px] font-black text-slate-900 leading-tight uppercase tracking-tight">{{ step.label }}</p>
                       <p class="text-[10px] font-bold text-slate-400 mt-0.5 tracking-tighter">{{ step.date || 'Pending...' }}</p>
                    </div>
                 </div>
              </div>
           </div>

           <!-- Items Summary -->
           <div class="card-stitch bg-white overflow-hidden">
              <div class="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
                 <h3 class="text-sm font-black text-slate-800 uppercase tracking-wider">Ordered Items</h3>
                 <span class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{{ order.productQuantity }} Items Total</span>
              </div>
              
              <div class="p-8">
                 <div class="flex items-center space-x-6 p-4 rounded-3xl bg-slate-50 border border-slate-100 group transition-all hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50">
                    <div class="w-20 h-20 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300">
                       <img [src]="'https://api.dicebear.com/7.x/identicon/svg?seed=' + order.productName" alt="Item" class="w-full h-full object-cover rounded-lg">
                    </div>
                    <div class="flex-1">
                       <p class="text-base font-black text-slate-900 leading-tight">{{ order.productName }}</p>
                       <p class="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">SKU: {{ 'SKU-' + order['_rowNumber'] }}</p>
                       <div class="flex items-center space-x-4 mt-3">
                          <span class="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200/50 shadow-sm italic">RD$ {{ order.productPrice | number }}</span>
                          <span class="text-[11px] font-black text-slate-400">x{{ order.productQuantity }} quantity</span>
                       </div>
                    </div>
                    <div class="text-right">
                       <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Subtotal</p>
                       <p class="text-lg font-black text-blue-700 italic">RD$ {{ order.productPrice * order.productQuantity | number }}</p>
                    </div>
                 </div>

                 <!-- Additional Costs -->
                 <div class="mt-10 space-y-4 max-w-[300px] ml-auto">
                    <div class="flex justify-between items-center text-[13px] font-medium text-slate-500">
                       <span>Shipping Fee</span>
                       <span class="text-slate-800 font-bold italic">RD$ {{ order.shippingCost || 0 | number }}</span>
                    </div>
                    <div class="flex justify-between items-center text-[13px] font-medium text-slate-500">
                       <span>Packaging</span>
                       <span class="text-slate-800 font-bold italic">RD$ {{ order.packaging || 0 | number }}</span>
                    </div>
                    <div class="pt-4 border-t border-slate-100 flex justify-between items-center">
                       <span class="text-sm font-black text-slate-900 uppercase tracking-wider">Grand Total</span>
                       <span class="text-2xl font-black text-blue-600 italic tracking-tighter">RD$ {{ totalAmount | number:'1.2-2' }}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <!-- Right Column: Customer & Communication -->
        <div class="lg:col-span-4 space-y-8">
           
           <!-- Customer Profile Card -->
           <div class="card-stitch p-8 bg-white space-y-6 relative overflow-hidden group">
              <div class="absolute top-0 left-0 w-2 h-full bg-blue-600/10"></div>
              
              <div class="flex flex-col items-center text-center pb-6 border-b border-slate-50">
                 <div class="relative mb-4">
                    <div class="w-20 h-20 rounded-[2rem] bg-indigo-50 flex items-center justify-center border-4 border-white shadow-xl shadow-indigo-100 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                       <img [src]="'https://api.dicebear.com/7.x/avataaars/svg?seed=' + order.fullName" alt="Avatar" class="w-full h-full object-cover">
                    </div>
                    <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white"></div>
                 </div>
                 <h3 class="text-lg font-black text-slate-900 leading-tight">{{ order.fullName }}</h3>
                 <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verified Customer</p>
              </div>

              <div class="space-y-6 pt-4">
                 <div class="flex items-start space-x-4">
                    <div class="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                       <mat-icon class="!text-lg">phone</mat-icon>
                    </div>
                    <div>
                       <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Contact Number</p>
                       <p class="text-sm font-bold text-slate-700">{{ order.phone }}</p>
                    </div>
                 </div>

                 <div class="flex items-start space-x-4">
                    <div class="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                       <mat-icon class="!text-lg">location_on</mat-icon>
                    </div>
                    <div>
                       <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5">Shipping Address</p>
                       <p class="text-[13px] font-bold text-slate-700 leading-snug">{{ order.address1 }}</p>
                       <p class="text-[12px] font-medium text-slate-500 mt-1 uppercase">{{ order.city }}, {{ order.province }}</p>
                    </div>
                 </div>

                 <div class="mt-4 p-4 rounded-2xl bg-slate-900 text-slate-400 text-[11px] italic">
                    <mat-icon class="!text-xs h-3 w-3 inline text-blue-400 mr-2 mb-0.5">notes</mat-icon>
                    "{{ order.notes || 'User provided no additional instructions.' }}"
                 </div>
              </div>
           </div>

           <!-- WhatsApp Messenger Card -->
           <div class="card-stitch p-8 bg-emerald-600 relative overflow-hidden group">
              <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
              
              <div class="relative z-10 space-y-6">
                 <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                       <mat-icon class="!text-xl">chat</mat-icon>
                    </div>
                    <h3 class="text-sm font-black text-white uppercase tracking-wider">WhatsApp Direct</h3>
                 </div>

                 <p class="text-emerald-50/80 text-[12px] font-medium leading-relaxed italic">
                    Push a real-time notification to the customer using a predefined template.
                 </p>

                 <div class="space-y-4">
                    <div class="relative">
                       <select [(ngModel)]="selectedTemplateText" 
                               class="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-xs font-bold text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-all cursor-pointer">
                          <option value="" disabled class="text-slate-900">Choose template...</option>
                          <option *ngFor="let tpl of messageService.templates()" [value]="tpl.text" class="text-slate-900">{{ tpl.name }}</option>
                       </select>
                       <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none">expand_more</mat-icon>
                    </div>

                    <button (click)="sendWhatsApp()" 
                            [disabled]="!selectedTemplateText"
                            class="w-full bg-white text-emerald-700 font-black text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2">
                       <mat-icon class="!text-sm">send</mat-icon>
                       <span>Initiate Chat</span>
                    </button>
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

  timelineSteps = [
    { key: 'confirmado completo', label: 'Confirmed', icon: 'check_circle', date: 'Mar 10, 2024' },
    { key: 'empacado', label: 'Packed', icon: 'inventory_2', date: 'Mar 11, 2024' },
    { key: 'envio en proceso', label: 'Shipped', icon: 'local_shipping', date: null },
    { key: 'entregado', label: 'Delivered', icon: 'stars', date: null }
  ];

  get totalAmount() {
    if (!this.order) return 0;
    return (this.order.productPrice * this.order.productQuantity) +
      (this.order.shippingCost || 0) +
      (this.order.packaging || 0);
  }

  constructor() {
    effect(() => {
      const orders = this.orderService.orders();
      if (orders.length > 0 && this.orderRowNumber) {
        const found = orders.find(o => o['_rowNumber'] === this.orderRowNumber);
        this.order = found ? { ...found } : null;
        this.isLoading = false;
        this.updateTimelineDates();
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

  getProgressWidth(): string {
    if (!this.order) return '0%';
    const s = this.order.status?.toLowerCase() || '';
    if (s.includes('entregado')) return '100%';
    if (s.includes('envio')) return '66%';
    if (s.includes('empacado')) return '33%';
    if (s.includes('confirmado')) return '5%';
    return '0%';
  }

  getTimelineIconClass(step: any): string {
    const currentStatus = this.order?.status?.toLowerCase() || '';
    const isCompleted = this.isStatusCompleted(step.key, currentStatus);

    if (isCompleted) return 'bg-blue-600 text-white shadow-blue-200';
    return 'bg-slate-50 text-slate-300 border border-slate-100 shadow-none';
  }

  isStatusCompleted(stepKey: string, currentStatus: string): boolean {
    const statusHierarchy = ['confirmado completo', 'empacado', 'envio en proceso', 'entregado'];
    const currentIndex = statusHierarchy.findIndex(s => currentStatus.includes(s));
    const stepIndex = statusHierarchy.indexOf(stepKey);
    return stepIndex <= currentIndex;
  }

  updateTimelineDates() {
    // Mocking dates based on order date for the timeline
    if (this.order && this.order.date) {
      const baseDate = new Date(this.order.date);
      this.timelineSteps[0].date = baseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (this.isStatusCompleted('empacado', this.order.status)) {
        const d = new Date(baseDate); d.setDate(d.getDate() + 1);
        this.timelineSteps[1].date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      if (this.isStatusCompleted('envio en proceso', this.order.status)) {
        const d = new Date(baseDate); d.setDate(d.getDate() + 1);
        this.timelineSteps[2].date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      if (this.isStatusCompleted('entregado', this.order.status)) {
        const d = new Date(baseDate); d.setDate(d.getDate() + 2);
        this.timelineSteps[3].date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
  }

  sendWhatsApp() {
    if (this.order && this.selectedTemplateText) {
      const url = this.messageService.generateWhatsAppUrl(this.order, this.selectedTemplateText);
      window.open(url, '_blank');
    }
  }

  goBack() {
    this.location.back();
  }
}
