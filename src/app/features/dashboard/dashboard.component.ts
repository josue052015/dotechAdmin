import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrderService } from '../../core/services/order.service';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, BaseChartDirective],
  template: `
    <div class="h-full flex flex-col">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">Overview Dashboard</h1>

      <div *ngIf="orderService.isLoading()" class="flex justify-center items-center flex-1">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!orderService.isLoading()" class="flex-1 flex flex-col gap-6">
        
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <mat-card class="!bg-white !shadow-sm border border-gray-100 !rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <mat-card-content class="!p-6 flex items-center">
              <div class="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
                <mat-icon>today</mat-icon>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500">Orders Today</p>
                <p class="text-2xl font-bold text-gray-900">{{ ordersToday }}</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="!bg-white !shadow-sm border border-gray-100 !rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <mat-card-content class="!p-6 flex items-center">
              <div class="p-3 rounded-full bg-orange-50 text-orange-600 mr-4">
                <mat-icon>schedule</mat-icon>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500">Pending</p>
                <p class="text-2xl font-bold text-gray-900">{{ ordersPending }}</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="!bg-white !shadow-sm border border-gray-100 !rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <mat-card-content class="!p-6 flex items-center">
              <div class="p-3 rounded-full bg-green-50 text-green-600 mr-4">
                <mat-icon>check_circle</mat-icon>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500">Delivered</p>
                <p class="text-2xl font-bold text-gray-900">{{ ordersDelivered }}</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="!bg-white !shadow-sm border border-gray-100 !rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <mat-card-content class="!p-6 flex items-center">
              <div class="p-3 rounded-full bg-purple-50 text-purple-600 mr-4">
                <mat-icon>payments</mat-icon>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500">Money Received</p>
                <p class="text-2xl font-bold text-gray-900">RD$ {{ moneyReceived | number:'1.2-2' }}</p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Charts Area -->
        <mat-card class="!bg-white !shadow-sm border border-gray-100 !rounded-xl flex-1 mt-2 mb-4 p-4">
            <h2 class="text-lg font-semibold text-gray-700 mb-4 px-2">Recent Order Trends</h2>
            <div class="w-full h-80">
              <canvas baseChart
                  [data]="chartData"
                  [options]="chartOptions"
                  [type]="'bar'">
              </canvas>
            </div>
        </mat-card>

      </div>
    </div>
  `,
  styles: []
})
export class DashboardComponent implements OnInit {
  public orderService = inject(OrderService);

  // Stats Data
  public ordersToday = 0;
  public ordersPending = 0;
  public ordersDelivered = 0;
  public moneyReceived = 0;

  // Chart Data
  public chartData: any = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      { data: [0, 0, 0, 0, 0, 0, 0], label: 'Orders Per Day' }
    ]
  };

  public chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    }
  };

  ngOnInit() {
    this.orderService.loadOrders();

    // Simple state reaction simulation
    // Since properties are computed initially and on future loads
  }

  // Use a computed-like mechanism for easy stats whenever data comes in
  // Angular signals makes this easy
  constructor() {
    // When order signals update, we recalculate
    effect(() => {
      const orders = this.orderService.orders();
      if (!orders || orders.length === 0) return;

      const todayStr = new Date().toISOString().split('T')[0];

      this.ordersToday = orders.filter(o => o.date === todayStr).length;
      this.ordersPending = orders.filter(o => o.status?.toLowerCase().includes('pendiente') || o.status?.toLowerCase() === 'no confirmado').length;
      this.ordersDelivered = orders.filter(o => o.status?.toLowerCase() === 'entregado' || o.status?.toLowerCase().includes('recibido')).length;

      // Sum money received where status is "dinero recibido"
      this.moneyReceived = orders
        .filter(o => o.status && o.status.toLowerCase() === 'dinero recibido')
        .reduce((sum, o) => sum + (o.productPrice * o.productQuantity) + (o.shippingCost || 0) + (o.packaging || 0), 0);

      // Map dates for a naive 7 day chart
      this.generateChartData(orders);
    });
  }

  private generateChartData(orders: any[]) {
    // Basic implementation that groups by last 7 dates available
    const dateCounts: { [key: string]: number } = {};
    orders.forEach(o => {
      if (o.date) {
        dateCounts[o.date] = (dateCounts[o.date] || 0) + 1;
      }
    });

    // sorted dates
    const dates = Object.keys(dateCounts).sort().reverse().slice(0, 7).reverse();
    const data = dates.map(d => dateCounts[d]);

    if (dates.length > 0) {
      this.chartData = {
        labels: dates,
        datasets: [{
          data: data,
          label: 'Orders',
          backgroundColor: '#3b82f6',
          borderRadius: 4
        }]
      };
    }
  }
}
