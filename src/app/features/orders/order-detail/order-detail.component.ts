import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { MessageService } from '../../../core/services/message.service';
import { Order } from '../../../core/models/order.model';
import { StatusBadgeComponent } from '../../../shared/ui/status-badge.component';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, StatusBadgeComponent, MatSelectModule, MatFormFieldModule, FormsModule
  ],
  template: `
    <div class="h-full flex flex-col max-w-4xl mx-auto pb-8">
      
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center">
          <button mat-icon-button (click)="goBack()" class="mr-2 text-gray-500 hover:text-gray-800">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1 class="text-3xl font-bold text-gray-800">Order Details</h1>
        </div>
        
        <div *ngIf="order" class="flex gap-4 items-center">
          <mat-form-field appearance="outline" class="w-48 !mb-[-1.25em]">
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="order.status" (selectionChange)="updateStatus()">
              <mat-option *ngFor="let s of statuses" [value]="s">{{ s }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <div *ngIf="isLoading" class="flex justify-center py-12">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!isLoading && order" class="flex flex-col gap-6">
        
        <!-- Header Info -->
        <mat-card class="bg-white rounded-xl shadow-sm border border-gray-100">
          <mat-card-content class="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p class="text-sm text-gray-500 mb-1">Order Date: {{ order.date | date:'mediumDate' }}</p>
              <h2 class="text-2xl font-bold text-gray-900">{{ order.fullName }}</h2>
            </div>
            <div class="flex items-center gap-4 flex-wrap">
              <div class="text-right">
                <p class="text-sm text-gray-500 mb-1">Total Amount</p>
                <p class="text-2xl font-bold text-blue-600">RD$ {{ totalAmount | number:'1.2-2' }}</p>
              </div>
              <app-status-badge [status]="order.status"></app-status-badge>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Main Details Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <!-- Customer & Shipping -->
          <mat-card class="bg-white rounded-xl shadow-sm border border-gray-100">
            <mat-card-header class="border-b border-gray-100 py-4 px-6">
              <mat-card-title class="!text-lg font-semibold flex items-center">
                <mat-icon class="mr-2 text-gray-400">local_shipping</mat-icon> Shipping Details
              </mat-card-title>
            </mat-card-header>
            <mat-card-content class="p-6">
              
              <div class="mb-4">
                <p class="text-sm text-gray-500 mb-1">Phone Number</p>
                <p class="font-medium text-gray-900">{{ order.phone }}</p>
              </div>

              <div class="mb-4">
                <p class="text-sm text-gray-500 mb-1">Address</p>
                <p class="font-medium text-gray-900">{{ order.address1 }}</p>
                <p class="font-medium text-gray-900">{{ order.city }}, {{ order.province }}</p>
              </div>

              <div>
                <p class="text-sm text-gray-500 mb-1">Notes</p>
                <p class="text-gray-900 bg-gray-50 p-3 rounded-lg">{{ order.notes || 'No specific notes.' }}</p>
              </div>

            </mat-card-content>
          </mat-card>

          <!-- Product Details & Costs -->
          <mat-card class="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <mat-card-header class="border-b border-gray-100 py-4 px-6">
              <mat-card-title class="!text-lg font-semibold flex items-center">
                <mat-icon class="mr-2 text-gray-400">inventory_2</mat-icon> Product Summaries
              </mat-card-title>
            </mat-card-header>
            <mat-card-content class="p-6 flex-1 flex flex-col">
              
              <div class="flex justify-between items-center mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                <div>
                  <p class="font-medium text-gray-900">{{ order.productName }}</p>
                  <p class="text-sm text-gray-500">RD$ {{ order.productPrice }} x {{ order.productQuantity }}</p>
                </div>
                <p class="font-semibold text-gray-900">RD$ {{ order.productPrice * order.productQuantity | number:'1.2-2' }}</p>
              </div>

              <div class="flex justify-between items-center py-2 text-sm">
                <span class="text-gray-500">Shipping</span>
                <span class="font-medium text-gray-900">RD$ {{ order.shippingCost || 0 | number:'1.2-2' }}</span>
              </div>
              
              <div class="flex justify-between items-center py-2 text-sm">
                <span class="text-gray-500">Packaging</span>
                <span class="font-medium text-gray-900">RD$ {{ order.packaging || 0 | number:'1.2-2' }}</span>
              </div>

              <div class="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center mt-4">
                <span class="font-medium text-gray-700">Total</span>
                <span class="text-xl font-bold text-gray-900">RD$ {{ totalAmount | number:'1.2-2' }}</span>
              </div>

            </mat-card-content>
          </mat-card>

        </div>

        <!-- WhatsApp Action -->
        <mat-card class="bg-green-50 border border-green-200 rounded-xl shadow-sm mt-4">
          <mat-card-content class="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="flex items-center gap-4">
              <div class="bg-green-100 p-3 rounded-full text-green-600">
                <mat-icon class="!text-3xl !w-8 !h-8 leading-none">chat</mat-icon>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-green-900">Customer Communication</h3>
                <p class="text-green-700 text-sm">Send a WhatsApp message directly to the customer based on a template.</p>
              </div>
            </div>

            <div class="flex items-center gap-4 w-full md:w-auto">
              <mat-form-field appearance="outline" class="w-full md:w-64 !mb-[-1.25em] bg-white rounded-md">
                <mat-label>Select Template</mat-label>
                <mat-select [(ngModel)]="selectedTemplateText">
                  <mat-option *ngFor="let tpl of messageService.templates()" [value]="tpl.text">{{ tpl.name }}</mat-option>
                </mat-select>
              </mat-form-field>

              <button mat-flat-button class="!bg-green-600 !text-white hover:!bg-green-700 !py-6 px-6 shadow-sm" [disabled]="!selectedTemplateText" (click)="sendWhatsApp()">
                <mat-icon>send</mat-icon>
                SEND WHATSAPP 
              </button>
            </div>
          </mat-card-content>
        </mat-card>

      </div>

      <!-- No Order Found -->
      <div *ngIf="!isLoading && !order" class="bg-white p-12 text-center rounded-xl shadow-sm">
        <mat-icon class="!w-16 !h-16 !text-6xl text-gray-300 mx-auto mb-4">error_outline</mat-icon>
        <h2 class="text-2xl font-bold text-gray-700">Order Not Found</h2>
        <p class="text-gray-500 mt-2 mb-6">The order you are looking for does not exist or has been deleted.</p>
        <button mat-flat-button color="primary" routerLink="/orders">Return to Orders</button>
      </div>

    </div>
  `,
  styles: []
})
export class OrderDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  public orderService = inject(OrderService);
  public messageService = inject(MessageService);

  orderRowNumber: number | null = null;
  order: Order | null = null;
  isLoading = true;

  selectedTemplateText: string = '';

  statuses = [
    'cancelado', 'desaparecido', 'no confirmation', 'no confirmado',
    'pendiente de ubicacion', 'confirmado completo',
    'empacado', 'envio en proceso', 'entregado', 'dinero recibido'
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
        this.order = found ? { ...found } : null; // Copy so we can mutate status safely before DB sync
        this.isLoading = false;
      } else if (orders.length > 0 && !this.orderRowNumber) {
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
        if (this.orderService.orders().length === 0) {
          this.orderService.loadOrders();
        } else {
          // Trigger the effect immediately if we already have orders
          const found = this.orderService.orders().find(o => o['_rowNumber'] === this.orderRowNumber);
          this.order = found ? { ...found } : null;
          this.isLoading = false;
        }
      }
    });
  }

  updateStatus() {
    if (this.order && this.order['_rowNumber']) {
      this.orderService.updateOrder(this.order['_rowNumber'], this.order).subscribe({
        next: () => console.log('Status updated successfully'),
        error: (err) => alert('Failed to update status')
      });
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
