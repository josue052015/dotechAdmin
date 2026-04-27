import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { interval, fromEvent, merge, of, forkJoin, Observable } from 'rxjs';
import { switchMap, filter, map, startWith, distinctUntilChanged, take, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
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
  private router = inject(Router);

  private readonly REFRESH_INTERVAL = 30000; // 30 seconds
  private isSyncing = false;
  
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
        // Debounce initial sync to ensure services are fully initialized
        setTimeout(() => {
          untracked(() => {
            if (this.isSyncing) return;
            this.performSync().pipe(take(1)).subscribe(() => {
              console.log('[Sync] Initial data load complete.');
              this.isInitialSyncDone.set(true);
            });
          });
        }, 3000);
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
      filter(isVisible => isVisible && this.auth.isAuthorized() && !this.isSyncing),
      // Trigger all service reloads quietly
      map(() => {
        this.performSync().pipe(take(1)).subscribe();
        return true;
      })
    ).subscribe();
  }

  public performSync(): Observable<any> {
    if (!this.auth.isAuthorized() || this.isSyncing) return of(null);
    this.isSyncing = true;

    const url = this.router.url;
    const loads: { [key: string]: Observable<any> } = {};

    // Route-based priority loading
    if (url.includes('/dashboard') || url === '/') {
        loads['orders'] = this.orderService.refreshVisibleChunk();
    } else if (url.includes('/orders')) {
        loads['orders'] = this.orderService.refreshVisibleChunk();
    } else if (url.includes('/abandoned-orders')) {
        loads['abandoned'] = this.abandonedOrderService.refreshVisibleChunk();
    } else if (url.includes('/products')) {
        loads['products'] = this.productService.refreshVisibleChunk();
    } else {
        loads['orders'] = this.orderService.refreshVisibleChunk();
    }

    if (Object.keys(loads).length === 0) {
        this.isSyncing = false;
        return of(null);
    }

    console.log(`[Sync] Syncing active sheets for route: ${url}`);
    return forkJoin(loads).pipe(
        finalize(() => {
            this.isSyncing = false;
            console.log(`[Sync] Completed sync for ${Object.keys(loads).join(', ')}`);
        })
    );
  }
}
import { finalize } from 'rxjs/operators';

