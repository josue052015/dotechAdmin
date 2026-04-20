import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { interval, fromEvent, merge, of, forkJoin, Observable } from 'rxjs';
import { switchMap, filter, map, startWith, distinctUntilChanged, take, tap } from 'rxjs/operators';
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
  
  // Track if the first data load reached a "completed" state across all services
  public isInitialSyncDone = signal<boolean>(false);

  constructor() {
    this.initSyncLoop();
    this.setupInitialSyncTrigger();
  }

  private setupInitialSyncTrigger() {
    // Automatically trigger initial sync when authorized
    effect(() => {
      if (this.auth.isAuthorized() && !this.isInitialSyncDone()) {
        untracked(() => {
          this.performSync().pipe(take(1)).subscribe(() => {
            console.log('[Sync] Initial data load complete.');
            this.isInitialSyncDone.set(true);
          });
        });
      }
    });
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
        this.performSync().pipe(take(1)).subscribe();
        return true;
      })
    ).subscribe();
  }

  public performSync(): Observable<any> {
    if (!this.auth.isAuthorized()) return of(null);

    // Parallelly reload all core data services and wait for all to complete
    return forkJoin({
        orders: this.orderService.loadOrders(true),
        products: this.productService.loadProducts(true),
        abandoned: this.abandonedOrderService.loadAbandonedOrders(true),
        messages: this.messageService.loadTemplates(true),
        exports: this.exportTemplateService.loadTemplates(true)
    });
  }
}
