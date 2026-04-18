import { Injectable, inject } from '@angular/core';
import { interval, fromEvent, merge, of } from 'rxjs';
import { switchMap, filter, map, startWith, distinctUntilChanged } from 'rxjs/operators';
import { OrderService } from './order.service';
import { ProductService } from './product.service';
import { AbandonedOrderService } from './abandoned-order.service';
import { MessageService } from './message.service';
import { ExportTemplateService } from './export-template.service';
import { GoogleAuthService } from './google-auth.service';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  private abandonedOrderService = inject(AbandonedOrderService);
  private messageService = inject(MessageService);
  private exportTemplateService = inject(ExportTemplateService);
  private auth = inject(GoogleAuthService);

  private readonly REFRESH_INTERVAL = 10000; // 10 seconds

  constructor() {
    this.initSyncLoop();
  }

  private initSyncLoop() {
    // Create an observable that tracks if the window is visible
    const visibility$ = merge(
      fromEvent(document, 'visibilitychange').pipe(map(() => document.visibilityState)),
      of(document.visibilityState)
    ).pipe(
      map(state => state === 'visible'),
      startWith(true),
      distinctUntilChanged()
    );

    // Main sync interval
    interval(this.REFRESH_INTERVAL).pipe(
      // Only proceed if tab is visible AND user is authorized
      switchMap(() => visibility$),
      filter(isVisible => isVisible && this.auth.isAuthorized()),
      // Trigger all service reloads quietly
      map(() => {
        console.log('Syncing data from Google Sheets...');
        this.performSync();
        return true;
      })
    ).subscribe();
  }

  public performSync() {
    if (!this.auth.isAuthorized()) return;

    // Quietly reload all core data services
    this.orderService.loadOrders(true);
    this.productService.loadProducts(true);
    this.abandonedOrderService.loadAbandonedOrders(true);
    this.messageService.loadTemplates(true);
    this.exportTemplateService.loadTemplates(true);
  }
}
