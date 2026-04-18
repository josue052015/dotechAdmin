import { InjectionToken } from '@angular/core';
import { ExportSource } from '../models/export-template.model';

export const EXPORT_SOURCES: ExportSource[] = [
  {
    key: 'orders',
    label: 'Orders',
    service: 'OrderService',
    defaultFileName: 'orders_export',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'date', label: 'Fecha' },
      { key: 'fullName', label: 'Nombre Cliente' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'address1', label: 'Dirección' },
      { key: 'province', label: 'Provincia' },
      { key: 'city', label: 'Ciudad' },
      { key: 'productName', label: 'Producto' },
      { key: 'productQuantity', label: 'Cantidad' },
      { key: 'productPrice', label: 'Precio' },
      { key: 'shippingCost', label: 'Costo Envío' },
      { key: 'packaging', label: 'Empacado' },
      { key: 'carrier', label: 'Transporte' },
      { key: 'status', label: 'Estado' },
      { key: 'notes', label: 'Notas' }
    ]
  },
  {
    key: 'abandoned_orders',
    label: 'Pedidos Abandonados',
    service: 'AbandonedOrderService',
    defaultFileName: 'abandoned_orders_export',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'date', label: 'Fecha' },
      { key: 'fullName', label: 'Nombre Cliente' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'address1', label: 'Dirección' },
      { key: 'province', label: 'Provincia' },
      { key: 'city', label: 'Ciudad' },
      { key: 'productName', label: 'Producto' },
      { key: 'productQuantity', label: 'Cantidad' },
      { key: 'productPrice', label: 'Precio' },
      { key: 'shippingCost', label: 'Costo Envío' },
      { key: 'packaging', label: 'Empacado' },
      { key: 'carrier', label: 'Transporte' },
      { key: 'status', label: 'Estado' },
      { key: 'notes', label: 'Notas' }
    ]
  },
  {
    key: 'products',
    label: 'Products',
    service: 'ProductService',
    defaultFileName: 'products_export',
    columns: [
      { key: 'id', label: 'ID/Código' },
      { key: 'name', label: 'Nombre' },
      { key: 'price', label: 'Precio' },
      { key: 'sku', label: 'SKU' },
      { key: 'category', label: 'Categoría' },
      { key: 'stock', label: 'Stock/Existencia' }
    ]
  },
  {
    key: 'messages',
    label: 'Messages',
    service: 'MessageService',
    defaultFileName: 'messages_export',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nombre' },
      { key: 'text', label: 'Texto' }
    ]
  }
];

export const EXPORT_SOURCES_TOKEN = new InjectionToken<ExportSource[]>('EXPORT_SOURCES');
