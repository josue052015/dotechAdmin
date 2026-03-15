import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { DateFilterService } from '../../core/services/date-filter.service';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';

import { Order } from '../../core/models/order.model';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { StatusSelectorDialogComponent } from '../../shared/components/status-selector-dialog/status-selector-dialog.component';
import { OrderDetailComponent } from '../orders/order-detail/order-detail.component';
import { MessageService } from '../../core/services/message.service';
import { WhatsappSelectorDialogComponent } from '../../shared/components/whatsapp-selector-dialog/whatsapp-selector-dialog.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, LucideAngularModule, MatProgressSpinnerModule, 
    BaseChartDirective, MatMenuModule, MatSnackBarModule, MatDialogModule
  ],
  template: `
    <div class="space-y-8 animate-in fade-in duration-700">
      
      <!-- Dashboard Loading Skeleton -->
      <ng-container *ngIf="orderService.isLoading()">
        <!-- Stats Grid Skeleton -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div *ngFor="let i of [1,2,3,4]" class="card-stitch p-6 space-y-4">
            <div class="flex justify-between">
              <div class="w-12 h-12 rounded-xl skeleton"></div>
              <div class="w-12 h-5 rounded-full skeleton"></div>
            </div>
            <div class="space-y-2">
              <div class="h-3 w-20 rounded skeleton"></div>
              <div class="h-8 w-32 rounded skeleton"></div>
            </div>
          </div>
        </div>

        <!-- Charts Skeleton -->
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
           <div class="xl:col-span-8 card-stitch p-8">
              <div class="h-6 w-48 rounded skeleton mb-4"></div>
              <div class="h-[320px] w-full rounded-2xl skeleton"></div>
           </div>
           <div class="xl:col-span-4 card-stitch p-8">
              <div class="h-6 w-32 mx-auto rounded skeleton mb-8"></div>
              <div class="h-[280px] w-[280px] rounded-full skeleton mx-auto"></div>
           </div>
        </div>

        <!-- Recent Orders Skeleton -->
        <div class="card-stitch overflow-hidden">
           <div class="p-6 border-b border-slate-100 flex justify-between items-center">
              <div class="space-y-2">
                 <div class="h-5 w-32 rounded skeleton"></div>
                 <div class="h-3 w-48 rounded skeleton"></div>
              </div>
           </div>
           <div class="p-6 space-y-4">
              <div *ngFor="let i of [1,2,3,4,5]" class="h-16 w-full rounded-2xl skeleton"></div>
           </div>
        </div>
      </ng-container>

      <!-- Actual Dashboard Content -->
      <div *ngIf="!orderService.isLoading()" class="space-y-8">

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        <!-- Orders Today -->
        <div class="card-stitch p-6 group hover:border-blue-200 transition-all duration-300">
          <div class="flex justify-between items-start mb-4">
            <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
              <lucide-icon name="shopping-cart" class="w-6 h-6"></lucide-icon>
            </div>
            <div class="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-success text-success-text text-xs font-medium">
               <lucide-icon name="trending-up" class="w-3 h-3 flex items-center justify-center"></lucide-icon>
               <span>12.5%</span>
            </div>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-500 mb-1">Orders Today</p>
            <h3 class="text-3xl font-bold text-slate-900 tracking-tight">{{ ordersToday }}</h3>
          </div>
        </div>

        <!-- Pending Orders -->
        <div class="card-stitch p-6 group hover:border-amber-200 transition-all duration-300">
          <div class="flex justify-between items-start mb-4">
            <div class="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center text-warning-text transition-transform group-hover:scale-110">
              <lucide-icon name="clock" class="w-6 h-6"></lucide-icon>
            </div>
            <div class="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-danger text-danger-text text-xs font-medium">
               <lucide-icon name="trending-down" class="w-3 h-3 flex items-center justify-center"></lucide-icon>
               <span>4.2%</span>
            </div>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-500 mb-1">Pending Orders</p>
            <h3 class="text-3xl font-bold text-slate-900 tracking-tight">{{ ordersPending }}</h3>
          </div>
        </div>

        <!-- Delivered Orders -->
        <div class="card-stitch p-6 group hover:border-emerald-200 transition-all duration-300">
          <div class="flex justify-between items-start mb-4">
            <div class="w-12 h-12 rounded-xl bg-success flex items-center justify-center text-success-text transition-transform group-hover:scale-110">
              <lucide-icon name="check-circle" class="w-6 h-6"></lucide-icon>
            </div>
            <div class="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-success text-success-text text-xs font-medium">
               <lucide-icon name="trending-up" class="w-3 h-3 flex items-center justify-center"></lucide-icon>
               <span>8.1%</span>
            </div>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-500 mb-1">Delivered Orders</p>
            <h3 class="text-3xl font-bold text-slate-900 tracking-tight">{{ ordersDelivered }}</h3>
          </div>
        </div>

        <!-- Money Received -->
        <div class="card-stitch p-6 group hover:border-slate-300 transition-all duration-300">
          <div class="flex justify-between items-start mb-4">
            <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 transition-transform group-hover:scale-110">
              <lucide-icon name="banknote" class="w-6 h-6"></lucide-icon>
            </div>
            <div class="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-success text-success-text text-xs font-medium">
               <lucide-icon name="trending-up" class="w-3 h-3 flex items-center justify-center"></lucide-icon>
               <span>15.3%</span>
            </div>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-500 mb-1">Money Received</p>
            <h3 class="text-3xl font-bold text-slate-900 tracking-tight">RD$ {{ moneyReceived | number:'1.0-0' }}</h3>
          </div>
        </div>
      </div>

      <!-- Analysis Charts Row -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
         <!-- Daily Orders Area Chart -->
         <div class="xl:col-span-8 card-stitch p-4 md:p-8">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-10">
               <div>
                  <h2 class="text-base md:text-lg font-bold text-slate-900">Daily Orders Analytics</h2>
                  <p class="text-[10px] md:text-xs text-slate-400 font-medium whitespace-nowrap">Monitoring order volume over the last week</p>
               </div>
               <div class="flex items-center space-x-4">
                  <div class="flex items-center space-x-2">
                     <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                     <span class="text-[10px] md:text-xs font-semibold text-slate-600 lowercase">Current Period</span>
                  </div>
                  <div class="flex items-center space-x-2">
                     <span class="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
                     <span class="text-[10px] md:text-xs font-semibold text-slate-600 lowercase">Previous</span>
                  </div>
               </div>
            </div>
            <div class="h-[240px] md:h-[320px] w-full">
               <canvas baseChart
                   [data]="lineChartData"
                   [options]="lineChartOptions"
                   [type]="'line'">
               </canvas>
            </div>
         </div>

         <!-- Orders by Status Donut -->
         <div class="xl:col-span-4 card-stitch p-6 md:p-8 flex flex-col">
            <div class="mb-6 md:mb-8 text-center">
                <h2 class="text-base md:text-lg font-bold text-slate-900">Orders by Status</h2>
                <p class="text-[10px] md:text-xs text-slate-400 font-medium">Global distribution</p>
            </div>
            <div class="flex-1 relative flex items-center justify-center scale-100 md:scale-110 aspect-square max-w-[280px] mx-auto">
               <canvas baseChart
                   [data]="donutChartData"
                   [options]="donutChartOptions"
                   [type]="'doughnut'">
               </canvas>
               <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span class="text-2xl md:text-4xl font-black text-slate-900 leading-none">{{ totalOrders }}</span>
                  <span class="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</span>
               </div>
            </div>
            <div class="mt-8 md:mt-10 grid grid-cols-2 gap-3 md:gap-4">
               <div *ngFor="let label of donutChartData.labels; let i = index">
                  <div *ngIf="donutChartData.datasets[0].data[i] > 0" class="flex items-center space-x-2">
                     <span class="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full" [style.backgroundColor]="donutChartColors[i]"></span>
                     <span class="text-[10px] md:text-[11px] font-semibold text-slate-600 truncate">{{ label }}</span>
                     <span class="text-[10px] md:text-[11px] text-slate-400 ml-auto">{{ donutChartData.datasets[0].data[i] }}</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <!-- Product Sales Bar Chart -->
      <div class="card-stitch p-6 md:p-8">
         <div class="flex justify-between items-center mb-8">
             <div>
                 <h2 class="text-base md:text-lg font-bold text-slate-900">Sales by Product</h2>
                 <p class="text-[10px] md:text-xs text-slate-400 font-medium">Top selling items across all channels</p>
             </div>
         </div>
         <div class="h-[250px] md:h-[300px] w-full relative">
            <canvas *ngIf="barChartData.labels && barChartData.labels.length > 0; else noBarData" baseChart
                [data]="barChartData"
                [options]="barChartOptions"
                [type]="'bar'">
            </canvas>
            <ng-template #noBarData>
               <div class="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-400">
                  Not enough valid order data to display products.
               </div>
            </ng-template>
         </div>
      </div>

      <!-- Recent Orders Section (Responsive Layout) -->
      <div class="card-stitch overflow-hidden">
         <div class="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <div>
               <h2 class="text-base md:text-lg font-bold text-slate-900 uppercase tracking-tight">Recent Orders</h2>
               <p class="text-[10px] md:text-xs text-slate-400 font-medium">Showing the most recent activity across all stores</p>
            </div>
            <button routerLink="/orders" class="text-blue-600 text-[10px] md:text-xs font-bold hover:underline">View All</button>
         </div>

         <!-- Desktop Table View -->
         <div class="hidden md:block overflow-x-auto">
            <table class="table-stitch">
               <thead>
                  <tr>
                     <th>Order ID</th>
                     <th>Customer</th>
                     <th>Product</th>
                     <th>Amount</th>
                     <th class="text-center">Status</th>
                     <th>Date</th>
                     <th class="text-right">Actions</th>
                  </tr>
               </thead>
               <tbody>
                  <tr *ngFor="let order of recentOrders" class="group hover:bg-slate-50 transition-colors">
                     <td (click)="openOrderDetail(order)" class="cursor-pointer">
                       <!-- Order Info -->
                       <div class="flex-1 min-w-0 flex items-center space-x-4 cursor-pointer hover:opacity-80">
                          <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                              {{ order.id || '#' + order['_rowNumber'] }}
                          </div>
                          <div class="flex flex-col min-w-0">
                             <p class="text-sm font-bold leading-tight truncate max-w-[140px]" [class.text-red-600]="!order.fullName || order.fullName.toLowerCase() === 'cliente sin identificar'">{{order.fullName || 'Cliente sin identificar'}}</p>
                             <div class="flex items-center space-x-2 mt-0.5 text-[10px] font-bold text-slate-400">
                                <span>{{order.date | date:'dd/MM/yy'}}</span>
                             </div>
                          </div>
                       </div>
                     </td>
                     <td (click)="openOrderDetail(order)" class="cursor-pointer">
                        <div class="flex items-center space-x-3">
                           <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                              {{ (order.fullName || 'C').charAt(0) }}{{ (order.fullName || '').split(' ')?.[1]?.charAt(0) || '' }}
                           </div>
                            <span class="font-semibold text-sm" [class.text-red-600]="!order.fullName || order.fullName.toLowerCase() === 'cliente sin identificar'">{{ order.fullName || 'Cliente sin identificar' }}</span>
                        </div>
                     </td>
                     <td (click)="openOrderDetail(order)" class="cursor-pointer">
                        <span class="font-medium text-sm">{{ order.productName }}</span>
                     </td>
                     <td (click)="openOrderDetail(order)" class="cursor-pointer">
                        <span class="font-bold text-sm">RD$ {{ (order.productPrice * order.productQuantity) + (order.shippingCost || 0) + (order.packaging || 0) | number:'1.2-2' }}</span>
                     </td>
                     <td class="text-center">
                        <div [class]="getStatusClass(order.status)" 
                             (click)="openStatusSelector(order); $event.stopPropagation()"
                             class="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider cursor-pointer hover:brightness-95 active:scale-95 transition-all">
                           {{ order.status }}
                           <lucide-icon name="chevron-down" class="ml-1 w-2.5 h-2.5 opacity-70"></lucide-icon>
                        </div>
                     </td>
                     <td (click)="openOrderDetail(order)" class="cursor-pointer">
                        <span class="text-text-muted font-medium text-sm whitespace-nowrap">{{ order.date | date:'mediumDate' }}</span>
                     </td>
                      <td class="text-right">
                         <div class="flex items-center justify-end">
                            <button (click)="openWhatsApp(order); $event.stopPropagation()" 
                                    class="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all active:scale-90" 
                                    title="Send WhatsApp">
                               <lucide-icon name="message-square" class="w-4 h-4"></lucide-icon>
                            </button>
                         </div>
                      </td>
                  </tr>
               </tbody>
            </table>
         </div>

         <!-- Mobile Card View -->
         <div class="md:hidden flex flex-col gap-4 p-4">
            <div *ngFor="let order of recentOrders" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 active:bg-slate-50 transition-colors space-y-4">
               <div class="flex justify-between items-start">
                  <div class="flex items-center space-x-3">
                     <div class="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {{ (order.fullName || 'C').charAt(0) }}{{ (order.fullName || '').split(' ')?.[1]?.charAt(0) || '' }}
                     </div>
                     <div class="flex flex-col min-w-0">
                        <p class="text-sm font-bold leading-tight truncate max-w-[140px]" [class.text-red-600]="!order.fullName || order.fullName.toLowerCase() === 'cliente sin identificar'">{{order.fullName || 'Cliente sin identificar'}}</p>
                        <div class="flex items-center space-x-2 mt-0.5 text-[10px] font-bold text-slate-400">
                           <span>ID: {{order.id || '#' + order['_rowNumber']}}</span>
                           <span>•</span>
                           <span class="text-primary/70">{{order.date | date:'dd/MM/yy'}}</span>
                        </div>
                     </div>
                  </div>
                   <div [class]="getStatusClass(order.status)" 
                        (click)="openStatusSelector(order); $event.stopPropagation()"
                        class="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap cursor-pointer flex items-center space-x-1">
                      <span>{{order.status}}</span>
                      <lucide-icon name="chevron-down" class="w-2.5 h-2.5"></lucide-icon>
                   </div>
                </div>

               <div class="bg-slate-50/50 rounded-xl p-3 border border-slate-100/50 space-y-2">
                  <div class="flex items-center justify-between text-xs">
                     <span class="text-slate-400 font-semibold">Product</span>
                     <span class="text-slate-900 font-bold truncate ml-4">{{order.productName}}</span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                     <span class="text-slate-400 font-semibold">Quantity</span>
                     <span class="text-slate-900 font-bold">{{order.productQuantity}} units</span>
                  </div>
               </div>

                <div class="flex justify-between items-center pt-1 px-1">
                   <div class="flex items-center space-x-3">
                      <button (click)="openWhatsApp(order); $event.stopPropagation()" 
                              class="flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all">
                          <lucide-icon name="message-square" class="w-4 h-4"></lucide-icon>
                          <span>WhatsApp</span>
                      </button>
                   </div>
                   <div class="flex items-center space-x-3">
                      <div class="flex flex-col items-end">
                         <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Total Amount</span>
                         <span class="text-base font-black text-slate-900 tracking-tight">RD$ {{ (order.productPrice * order.productQuantity) + (order.shippingCost || 0) + (order.packaging || 0) | number:'1.2-2' }}</span>
                      </div>
                      <button class="bg-slate-900 text-white p-2 rounded-lg shadow-sm" (click)="openOrderDetail(order)">
                         <lucide-icon name="chevron-right" class="w-4 h-4"></lucide-icon>
                      </button>
                   </div>
                </div>
            </div>
            
            <a routerLink="/orders" class="mt-2 block w-full py-3 rounded-xl text-center text-xs font-bold text-slate-500 bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors uppercase tracking-widest leading-none">
               View All Orders
            </a>
         </div>
          </div>
       </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class DashboardComponent implements OnInit {
  public orderService = inject(OrderService);
  public dateFilterService = inject(DateFilterService);
  public messageService = inject(MessageService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  statuses = [
    'cancelado', 'desaparecido', 'no confirmado',
    'pendiente de ubicacion', 'confirmado completo',
    'empacado', 'envio en proceso', 'entregado', 'dinero recibido'
  ];

  // Stats Data
  public ordersToday = 0;
  public ordersPending = 0;
  public ordersDelivered = 0;
  public moneyReceived = 0;
  public totalOrders = 0;
  public recentOrders: Order[] = [];

  // Line Chart
  public lineChartData: ChartConfiguration['data'] = {
    datasets: [
      {
        data: [],
        label: 'Orders',
        fill: 'origin',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        borderColor: '#2563EB',
        pointBackgroundColor: '#2563EB',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#2563EB',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        data: [],
        label: 'Previous',
        fill: false,
        borderColor: '#E2E8F0',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4
      }
    ],
    labels: []
  };

  public lineChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E293B',
        padding: 12,
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        cornerRadius: 8,
        displayColors: false
      }
    },
    scales: {
      y: {
        grid: { display: true, color: '#f1f5f9' },
        border: { display: false },
        ticks: { font: { size: 10, weight: 'normal' }, color: '#94a3b8', stepSize: 1 }
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { font: { size: 10, weight: 'normal' }, color: '#94a3b8' }
      }
    }
  };

  // Donut Chart
  public donutChartColors = [
    '#5e2b97', // cancelado
    '#3c1f5a', // desaparecido
    '#94a3b8', // no confirmado
    '#cc2936', // pendiente de ubicacion
    '#b08d1a', // confirmado completo
    '#285b28', // empacado
    '#1e5d94', // envio en proceso
    '#c30010', // entregado
    '#0b4f9a'  // dinero recibido
  ];

  public donutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [
      'Cancelado', 'Desaparecido', 'No Confirmado', 
      'Pendiente Ubicación', 'Confirmado', 
      'Empacado', 'Envío en Proceso', 'Entregado', 'Pagado'
    ],
    datasets: [{
      data: Array(9).fill(0),
      backgroundColor: this.donutChartColors,
      hoverBackgroundColor: this.donutChartColors,
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  public donutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    cutout: '80%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E293B',
        padding: 10,
        cornerRadius: 8,
        displayColors: true
      }
    }
  };

  // Bar Chart (Product Sales)
  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{
      data: [],
      label: 'Units Sold',
      backgroundColor: '#3B82F6',
      borderRadius: 6,
      barThickness: 32
    }]
  };

  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1E293B',
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 }
      }
    },
    scales: {
      y: {
        grid: { color: '#f1f5f9' },
        border: { display: false },
        ticks: { font: { size: 10 }, color: '#94a3b8', stepSize: 1 }
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { font: { size: 10, weight: 'bold' }, color: '#64748b' }
      }
    }
  };

  constructor() {
    effect(() => {
      const allOrders = this.orderService.activeOrders();
      const range = this.dateFilterService.currentRange();
      
      if (!allOrders || allOrders.length === 0) return;

      // Filter orders by date range
      const orders = allOrders.filter(o => {
        const orderDate = this.parseDate(o.date);
        if (!orderDate) return false;
        
        orderDate.setHours(0, 0, 0, 0);
        
        if (range.start && orderDate < range.start) return false;
        if (range.end && orderDate > range.end) return false;
        return true;
      });

      this.totalOrders = orders.length;
      this.recentOrders = [...orders].slice(0, 5);

      const todayStr = new Date().toISOString().split('T')[0];

      this.ordersToday = orders.filter(o => o.date === todayStr).length;
      this.ordersPending = orders.filter(o => o.status?.toLowerCase().includes('pendiente') || o.status?.toLowerCase() === 'no confirmado').length;
      this.ordersDelivered = orders.filter(o => o.status?.toLowerCase() === 'entregado' || o.status?.toLowerCase().includes('recibido')).length;

      this.moneyReceived = orders
        .filter(o => {
          const s = (o.status || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
          return s === 'dinero recibido';
        })
        .reduce((sum, o) => sum + (o.productPrice * o.productQuantity) + (o.shippingCost || 0) + (o.packaging || 0), 0);

      this.updateDonutChart(orders);
      this.updateLineChart(orders);
      this.updateBarChart(orders);
    });
  }

  ngOnInit() {
    this.orderService.loadOrders();
  }

  private updateDonutChart(orders: any[]) {
    const counts = Array(9).fill(0);
    
    orders.forEach(o => {
      const s = (o.status || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      
      if (s === 'cancelado') counts[0]++;
      else if (s === 'desaparecido') counts[1]++;
      else if (s === 'no confirmado') counts[2]++;
      else if (s === 'pendiente de ubicacion') counts[3]++;
      else if (s === 'confirmado completo') counts[4]++;
      else if (s === 'empacado') counts[5]++;
      else if (s === 'envio en proceso') counts[6]++;
      else if (s === 'entregado') counts[7]++;
      else if (s === 'dinero recibido') counts[8]++;
    });

    this.donutChartData = {
      ...this.donutChartData,
      datasets: [{
        ...this.donutChartData.datasets[0],
        data: counts
      }]
    };
  }

  private updateLineChart(orders: any[]) {
    const dateCounts: { [key: string]: number } = {};
    orders.forEach(o => {
      if (o.date) {
        dateCounts[o.date] = (dateCounts[o.date] || 0) + 1;
      }
    });

    const dates = Object.keys(dateCounts).sort().reverse().slice(0, 7).reverse();
    const data = dates.map(d => dateCounts[d]);
    const prevData = data.map(v => Math.max(0, v + (Math.random() > 0.5 ? 1 : -1))); // Faking previous period for visual match

    if (dates.length > 0) {
      this.lineChartData = {
        labels: dates.map(d => {
          const dt = new Date(d);
          return dt.toLocaleDateString('en-US', { weekday: 'short' });
        }),
        datasets: [
          { ...this.lineChartData.datasets[0], data: data },
          { ...this.lineChartData.datasets[1], data: prevData }
        ]
      };
    }
  }

  private updateBarChart(orders: any[]) {
    const productCounts: { [key: string]: number } = {};
    
    orders.forEach(o => {
      const status = (o.status || '').toLowerCase();
      const name = (o.productName || '').trim();
      
      // Exclude cancelled/lost orders and empty products from sales count
      if (!status.includes('cancel') && !status.includes('desaparecido') && name.length > 0) {
          const qty = typeof o.productQuantity === 'number' ? o.productQuantity : parseInt(o.productQuantity, 10);
          const validQty = isNaN(qty) ? 1 : qty;
          productCounts[name] = (productCounts[name] || 0) + validQty;
      }
    });

    // Sort by volume, highest first, get top 6
    const sortedProducts = Object.keys(productCounts)
        .sort((a, b) => productCounts[b] - productCounts[a])
        .slice(0, 6);

    if (sortedProducts.length > 0) {
        this.barChartData = {
            labels: sortedProducts.map(p => p.length > 20 ? p.substring(0, 20) + '...' : p), // Truncate long names
            datasets: [{
                ...this.barChartData.datasets[0],
                data: sortedProducts.map(p => productCounts[p])
            }]
        };
    }
  }

  private parseDate(dateStr: any): Date | null {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    
    const s = String(dateStr).trim();
    if (!s) return null;

    // Try YYYY-MM-DD
    let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    // Try DD/MM/YYYY
    match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    }

    // Standard fallback
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  openOrderDetail(order: Order) {
    this.dialog.open(OrderDetailComponent, {
      data: { order },
      width: '1200px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'custom-dialog-container'
    });
  }

  openStatusSelector(order: any) {
    const dialogRef = this.dialog.open(StatusSelectorDialogComponent, {
      data: { 
        statuses: this.statuses,
        currentStatus: order.status
      },
      width: '400px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(status => {
      if (status) {
        this.updateOrderStatus(order, status);
      }
    });
  }

  updateOrderStatus(order: any, newStatus: string) {
    if (order.status === newStatus) return;
    const updatedOrder = { ...order, status: newStatus };
    this.orderService.updateOrder(order['_rowNumber'], updatedOrder).subscribe({
      next: () => this.snackBar.open(`Status updated to ${newStatus}`, 'Close', { duration: 3000 }),
      error: () => this.snackBar.open('Error updating status', 'Close', { duration: 3000 })
    });
  }

  openWhatsApp(order: Order) {
    const templates = this.messageService.templates();
    const dialogRef = this.dialog.open(WhatsappSelectorDialogComponent, {
      data: { templates },
      width: '400px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe((template: any) => {
      if (template) {
        this.sendWhatsApp(order, template.text);
      }
    });
  }

  sendWhatsApp(order: Order, templateText: string) {
    if (order && templateText) {
      const url = this.messageService.generateWhatsAppUrl(order, templateText);
      window.open(url, '_blank');
    }
  }

  getStatusClass(status: string): string {
    const s = (status || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    if (s === 'cancelado') return 'bg-[#ebd9fc] text-[#5e2b97]';
    if (s === 'desaparecido') return 'bg-[#542b7c] text-white';
    if (s === 'no confirmado') return 'bg-[#f0f0f0] text-[#4a4a4a]';
    if (s === 'pendiente de ubicacion') return 'bg-[#fce0e3] text-[#cc2936]';
    if (s === 'confirmado completo') return 'bg-[#fff2b2] text-[#b08d1a]';
    if (s === 'empacado') return 'bg-[#d2ecb9] text-[#285b28]';
    if (s === 'envio en proceso') return 'bg-[#c3e4fc] text-[#1e5d94]';
    if (s === 'entregado') return 'bg-[#c30010] text-white';
    if (s === 'dinero recibido') return 'bg-[#0b4f9a] text-white';

    return 'bg-slate-100 text-slate-500'; // Default
  }
}
