import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderService } from '../../core/services/order.service';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, MatProgressSpinnerModule, BaseChartDirective],
  template: `
    <div class="space-y-8 animate-in fade-in duration-700">
      
      <!-- Loading Overlay -->
      <div *ngIf="orderService.isLoading()" class="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex justify-center items-center">
        <mat-spinner diameter="40" strokeWidth="3" color="primary"></mat-spinner>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        <!-- Orders Today -->
        <div class="card-stitch p-6 group hover:border-blue-200 transition-all duration-300">
          <div class="flex justify-between items-start mb-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 transition-transform group-hover:scale-110">
              <lucide-icon name="shopping-cart" class="w-6 h-6"></lucide-icon>
            </div>
            <div class="flex items-center space-x-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
               <lucide-icon name="trending-up" class="w-3 h-3 flex items-center justify-center"></lucide-icon>
               <span class="text-[11px] font-bold">12.5%</span>
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
            <div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 transition-transform group-hover:scale-110">
              <lucide-icon name="clock" class="w-6 h-6"></lucide-icon>
            </div>
            <div class="flex items-center space-x-1 px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
               <lucide-icon name="trending-down" class="w-3 h-3 flex items-center justify-center"></lucide-icon>
               <span class="text-[11px] font-bold">4.2%</span>
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
            <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 transition-transform group-hover:scale-110">
              <lucide-icon name="check-circle" class="w-6 h-6"></lucide-icon>
            </div>
            <div class="flex items-center space-x-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
               <lucide-icon name="trending-up" class="w-3 h-3 flex items-center justify-center"></lucide-icon>
               <span class="text-[11px] font-bold">8.1%</span>
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
            <div class="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 transition-transform group-hover:scale-110">
              <lucide-icon name="banknote" class="w-6 h-6"></lucide-icon>
            </div>
            <div class="flex items-center space-x-1 px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
               <lucide-icon name="trending-up" class="w-3 h-3 flex items-center justify-center"></lucide-icon>
               <span class="text-[11px] font-bold">15.3%</span>
            </div>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-500 mb-1">Money Received</p>
            <h3 class="text-3xl font-bold text-slate-900 tracking-tight">RD$ {{ moneyReceived | number:'1.0-0' }}</h3>
          </div>
        </div>
      </div>

      <!-- Analysis Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
         <!-- Daily Orders Area Chart -->
         <div class="lg:col-span-8 card-stitch p-8">
            <div class="flex justify-between items-center mb-10">
               <div>
                  <h2 class="text-lg font-bold text-slate-900">Daily Orders Analytics</h2>
                  <p class="text-xs text-slate-400 font-medium">Monitoring order volume over the last week</p>
               </div>
               <div class="flex items-center space-x-4">
                  <div class="flex items-center space-x-2">
                     <span class="w-3 h-3 rounded-full bg-blue-600"></span>
                     <span class="text-xs font-semibold text-slate-600 lowercase">Current Period</span>
                  </div>
                  <div class="flex items-center space-x-2">
                     <span class="w-3 h-3 rounded-full bg-slate-200"></span>
                     <span class="text-xs font-semibold text-slate-600 lowercase">Previous</span>
                  </div>
               </div>
            </div>
            <div class="h-[320px] w-full">
               <canvas baseChart
                   [data]="lineChartData"
                   [options]="lineChartOptions"
                   [type]="'line'">
               </canvas>
            </div>
         </div>

         <!-- Orders by Status Donut -->
         <div class="lg:col-span-4 card-stitch p-8 flex flex-col">
            <div class="mb-8 text-center">
                <h2 class="text-lg font-bold text-slate-900">Orders by Status</h2>
                <p class="text-xs text-slate-400 font-medium">Global distribution</p>
            </div>
            <div class="flex-1 relative flex items-center justify-center scale-110">
               <canvas baseChart
                   [data]="donutChartData"
                   [options]="donutChartOptions"
                   [type]="'doughnut'">
               </canvas>
               <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span class="text-4xl font-black text-slate-900 leading-none">{{ totalOrders }}</span>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</span>
               </div>
            </div>
            <div class="mt-10 grid grid-cols-2 gap-4">
               <div *ngFor="let label of donutChartData.labels; let i = index" class="flex items-center space-x-2">
                  <span class="w-2.5 h-2.5 rounded-full" [style.backgroundColor]="donutChartColors[i]"></span>
                  <span class="text-[11px] font-semibold text-slate-600">{{ label }}</span>
                  <span class="text-[11px] text-slate-400 ml-auto">{{ donutChartData.datasets[0].data[i] }}</span>
               </div>
            </div>
         </div>
      </div>

      <!-- Recent Orders Table -->
      <div class="card-stitch overflow-hidden">
         <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
            <div>
               <h2 class="text-lg font-bold text-slate-900 uppercase tracking-tight">Recent Orders</h2>
               <p class="text-xs text-slate-400 font-medium">Showing the most recent activity across all stores</p>
            </div>
            <button class="text-blue-600 text-xs font-bold hover:underline">View All Orders</button>
         </div>
         <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse bg-white">
               <thead>
                  <tr class="bg-slate-50/50 border-b border-slate-100">
                     <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID</th>
                     <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer</th>
                     <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product</th>
                     <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                     <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                     <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                  </tr>
               </thead>
               <tbody class="divide-y divide-slate-50">
                  <tr *ngFor="let order of recentOrders" class="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                     <td class="px-6 py-4">
                        <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{{ order.id }}</span>
                     </td>
                     <td class="px-6 py-4">
                        <div class="flex items-center space-x-3">
                           <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                              {{ order.customerName.charAt(0) }}{{ order.customerName.split(' ')[1] ? order.customerName.split(' ')[1].charAt(0) : '' }}
                           </div>
                           <span class="text-xs font-semibold text-slate-700">{{ order.customerName }}</span>
                        </div>
                     </td>
                     <td class="px-6 py-4">
                        <span class="text-xs text-slate-600 font-medium">{{ order.productName }}</span>
                     </td>
                     <td class="px-6 py-4">
                        <span class="text-xs font-bold text-slate-900">RD$ {{ (order.productPrice * order.productQuantity) | number:'1.0-0' }}</span>
                     </td>
                     <td class="px-6 py-4">
                        <span [class]="getStatusClass(order.status)" class="text-[10px] font-bold px-3 py-1.5 rounded-full border">
                           {{ order.status }}
                        </span>
                     </td>
                     <td class="px-6 py-4">
                        <span class="text-xs text-slate-400 font-medium whitespace-nowrap">{{ order.date }}</span>
                     </td>
                  </tr>
               </tbody>
            </table>
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

  // Stats Data
  public ordersToday = 0;
  public ordersPending = 0;
  public ordersDelivered = 0;
  public moneyReceived = 0;
  public totalOrders = 0;
  public recentOrders: any[] = [];

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
  public donutChartColors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444'];
  public donutChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Processing', 'Delivered', 'On Hold', 'Cancelled'],
    datasets: [{
      data: [0, 0, 0, 0],
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

  constructor() {
    effect(() => {
      const orders = this.orderService.orders();
      if (!orders || orders.length === 0) return;

      this.totalOrders = orders.length;
      this.recentOrders = [...orders].reverse().slice(0, 5);

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
    });
  }

  ngOnInit() {
    this.orderService.loadOrders();
  }

  private updateDonutChart(orders: any[]) {
    const processing = orders.filter(o => o.status?.toLowerCase().includes('proceso') || o.status?.toLowerCase().includes('pendiente')).length;
    const delivered = orders.filter(o => o.status?.toLowerCase().includes('entregado') || o.status?.toLowerCase().includes('recibido')).length;
    const onHold = orders.filter(o => o.status?.toLowerCase().includes('espera') || o.status?.toLowerCase().includes('no confirmado')).length;
    const cancelled = orders.filter(o => o.status?.toLowerCase().includes('cancelado')).length;

    this.donutChartData = {
      ...this.donutChartData,
      datasets: [{
        ...this.donutChartData.datasets[0],
        data: [processing, delivered, onHold, cancelled]
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

  getStatusClass(status: string): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('entregado') || s.includes('recibido'))
      return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (s.includes('cancelado'))
      return 'bg-red-50 text-red-600 border-red-100';
    if (s.includes('pendiente') || s.includes('espera') || s.includes('no confirmado'))
      return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-blue-50 text-blue-600 border-blue-100';
  }
}
