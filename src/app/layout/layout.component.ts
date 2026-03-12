import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { GoogleAuthService } from '../core/services/google-auth.service';
import { OrderService } from '../core/services/order.service';
import { ProductService } from '../core/services/product.service';
import { DateFilterService } from '../core/services/date-filter.service';

// Declare external libraries to bypass TS errors since they'll be loaded via CDN
declare var pdfMake: any;
declare var XLSX: any;

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule
  ],
  template: `
    <div class="flex h-screen bg-background font-sans text-text overflow-hidden">
      
      <!-- Sidebar Desktop -->
      <aside class="hidden md:flex flex-col w-[260px] bg-sidebar border-r border-sidebar-border h-full fixed left-0 top-0 z-40 transition-all duration-300">
        <!-- Logo Area -->
        <div class="h-16 flex items-center px-6 border-b border-slate-100 flex-shrink-0">
          <div class="flex items-center space-x-3 group">
             <div class="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
               <lucide-icon name="shopping-cart" class="text-white w-5 h-5 flex items-center justify-center"></lucide-icon>
             </div>
             <span class="text-lg font-bold text-slate-900 tracking-tight">OrderFlow</span>
          </div>
        </div>
        
        <!-- Navigation Section -->
        <nav class="flex-1 overflow-y-auto pt-8 px-4 space-y-1.5 custom-scrollbar">
          <div class="pb-2 px-4 italic">
            <span class="text-[11px] uppercase font-bold text-slate-400 tracking-widest leading-none">Core</span>
          </div>

          <a routerLink="/dashboard" routerLinkActive="bg-sidebar-active !text-sidebar-activeText font-semibold shadow-sm ring-1 ring-primary/10" 
             [routerLinkActiveOptions]="{exact: true}"
             class="flex items-center space-x-3 px-4 py-3 rounded-xl text-text-muted hover:bg-slate-50 hover:text-text transition-all duration-200 group">
            <lucide-icon name="layout-grid" class="w-5 h-5 group-hover:text-primary transition-colors"></lucide-icon>
            <span class="text-[14px]">Dashboard</span>
          </a>
          
          <a routerLink="/orders" routerLinkActive="bg-sidebar-active !text-sidebar-activeText font-semibold shadow-sm ring-1 ring-primary/10" 
             class="flex items-center space-x-3 px-4 py-3 rounded-xl text-text-muted hover:bg-slate-50 hover:text-text transition-all duration-200 group">
            <lucide-icon name="shopping-cart" class="w-5 h-5 group-hover:text-primary transition-colors"></lucide-icon>
            <span class="text-[14px]">Orders</span>
          </a>
          
          <a routerLink="/products" routerLinkActive="bg-sidebar-active !text-sidebar-activeText font-semibold shadow-sm ring-1 ring-primary/10" 
             class="flex items-center space-x-3 px-4 py-3 rounded-xl text-text-muted hover:bg-slate-50 hover:text-text transition-all duration-200 group">
            <lucide-icon name="package" class="w-5 h-5 group-hover:text-primary transition-colors"></lucide-icon>
            <span class="text-[14px]">Products</span>
          </a>

          <a routerLink="/messages" routerLinkActive="bg-sidebar-active !text-sidebar-activeText font-semibold shadow-sm ring-1 ring-primary/10" 
             class="flex items-center space-x-3 px-4 py-3 rounded-xl text-text-muted hover:bg-slate-50 hover:text-text transition-all duration-200 group">
            <lucide-icon name="message-square" class="w-5 h-5 group-hover:text-primary transition-colors"></lucide-icon>
            <span class="text-[14px]">Messages</span>
          </a>

          <div class="pt-6 pb-2 px-4">
            <span class="text-[11px] uppercase font-bold text-slate-400 tracking-widest leading-none">Management</span>
          </div>

          <a routerLink="/customers" 
             class="opacity-40 cursor-not-allowed flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 group">
            <lucide-icon name="users" class="w-5 h-5"></lucide-icon>
            <span class="text-[14px]">Customers</span>
          </a>

          <a routerLink="/reports" 
             class="opacity-40 cursor-not-allowed flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 group">
            <lucide-icon name="bar-chart-2" class="w-5 h-5"></lucide-icon>
            <span class="text-[14px]">Reports</span>
          </a>
        </nav>

        <!-- Sidebar Bottom Footer -->
        <div class="p-4 mt-auto space-y-2 border-t border-slate-100 bg-slate-50/50">
          <a routerLink="/settings" routerLinkActive="bg-white text-slate-900 shadow-sm border border-slate-200"
             class="flex items-center space-x-3 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all group">
            <lucide-icon name="settings" class="w-5 h-5 group-hover:text-slate-700"></lucide-icon>
            <span class="text-[14px] font-medium">Settings</span>
          </a>

          <div class="flex items-center space-x-3 px-4 py-3 mt-2 bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100/50">
            <div class="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center border border-blue-200 transition-all hover:ring-4 hover:ring-blue-50 cursor-pointer overflow-hidden">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="Avatar" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 min-w-0">
               <p class="text-[13px] font-bold text-slate-900 truncate leading-tight">Alex Rivera</p>
               <p class="text-[11px] text-slate-500 truncate">Administrator</p>
            </div>
            <button (click)="logout()" class="text-slate-400 hover:text-red-500 transition-all p-1.5 rounded-xl hover:bg-red-50 group">
              <lucide-icon name="log-out" class="w-4 h-4"></lucide-icon>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Layout Area -->
      <main class="flex-1 flex flex-col md:ml-[260px] overflow-hidden min-h-screen">
        
        <!-- Header -->
        <header class="h-16 bg-white border-b border-border flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
          <div class="flex items-center space-x-4">
            <button class="md:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
              <lucide-icon name="menu" class="w-5 h-5"></lucide-icon>
            </button>
            <div class="flex flex-col">
               <h1 class="text-lg font-bold text-slate-900 leading-tight">Dashboard Overview</h1>
               <div class="flex items-center space-x-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span class="text-[11px] font-medium text-slate-400 uppercase tracking-tighter">Live Updates Enabled</span>
               </div>
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <!-- Search Bar (Functional) -->
            <div class="relative hidden lg:flex items-center z-50 w-80">
               <!-- Invisible backdrop to close on outside click -->
               <div *ngIf="searchQuery().length >= 2" class="fixed inset-0 z-40" (click)="clearSearch(searchInput)"></div>
               
               <div class="flex-1 flex items-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all group relative z-50">
                  <lucide-icon name="search" class="text-slate-400 w-4 h-4 mr-2 group-focus-within:text-blue-500"></lucide-icon>
                  <input #searchInput type="text" (input)="onSearch($event)" (keydown.escape)="clearSearch(searchInput)" placeholder="Search orders, products..." class="bg-transparent border-none text-sm focus:outline-none w-full text-slate-700 placeholder:text-slate-400">
               </div>
               
               <!-- Search Results Dropdown -->
               <div *ngIf="searchQuery().length >= 2" class="absolute top-[120%] left-0 w-full bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden slide-in-from-top-2 animate-in fade-in duration-200 z-50">
                  <div class="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                     
                     <div *ngIf="searchResults().orders.length === 0 && searchResults().products.length === 0" class="p-4 text-center text-slate-500 text-sm">
                        No results found for "<span class="font-bold text-slate-900">{{searchQuery()}}</span>"
                     </div>

                     <!-- Orders -->
                     <div *ngIf="searchResults().orders.length > 0">
                        <div class="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Orders</div>
                        <a *ngFor="let order of searchResults().orders" [routerLink]="['/orders', order['_rowNumber']]" (click)="clearSearch(searchInput)" class="flex items-center px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                           <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-3 font-bold text-xs">{{ order.id || '#' }}</div>
                           <div class="flex-1 min-w-0">
                              <p class="text-sm font-semibold text-slate-900 truncate">{{ order.fullName }}</p>
                              <p class="text-xs text-slate-500 truncate">{{ order.productName }}</p>
                           </div>
                           <lucide-icon name="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"></lucide-icon>
                        </a>
                     </div>

                     <div *ngIf="searchResults().orders.length > 0 && searchResults().products.length > 0" class="h-px bg-slate-100 my-2 mx-3"></div>

                     <!-- Products -->
                     <div *ngIf="searchResults().products.length > 0">
                        <div class="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Products</div>
                        <a *ngFor="let product of searchResults().products" routerLink="/products" (click)="clearSearch(searchInput)" class="flex items-center px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                           <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mr-3">
                              <lucide-icon name="package" class="w-4 h-4"></lucide-icon>
                           </div>
                           <div class="flex-1 min-w-0">
                              <p class="text-sm font-semibold text-slate-900 truncate">{{ product.name }}</p>
                              <p class="text-xs text-slate-500 truncate">{{ product.sku || 'No SKU' }} - RD$ {{ product.price | number:'1.2-2' }}</p>
                           </div>
                           <lucide-icon name="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all"></lucide-icon>
                        </a>
                     </div>

                  </div>
               </div>
            </div>

            <ng-container *ngIf="isDashboardRoute">
               <div class="relative">
                  <div *ngIf="isDateMenuOpen()" class="fixed inset-0 z-40" (click)="isDateMenuOpen.set(false)"></div>
                  <div (click)="isDateMenuOpen.set(!isDateMenuOpen())" class="hidden sm:flex items-center bg-white rounded-xl px-3 py-2 border border-slate-200 shadow-sm shadow-slate-50 hover:border-slate-300 transition-all cursor-pointer group relative z-50">
                    <lucide-icon name="calendar" class="text-slate-400 w-4 h-4 group-hover:text-blue-600 mr-2 transition-colors"></lucide-icon>
                    <span class="text-[12px] font-semibold text-slate-600">{{ dateFilterService.currentRange().label }}</span>
                    <lucide-icon name="chevron-down" class="text-slate-300 w-4 h-4 ml-1"></lucide-icon>
                  </div>

                  <div *ngIf="isDateMenuOpen()" class="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden slide-in-from-top-2 animate-in fade-in duration-200 z-50">
                     <div class="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Range</span>
                        <lucide-icon name="history" class="w-3 h-3 text-slate-300"></lucide-icon>
                     </div>
                     <div class="p-1.5">
                        <button (click)="dateFilterService.setRangeType('all'); isDateMenuOpen.set(false)" 
                             [class.bg-blue-50]="dateFilterService.activeRangeType() === 'all'"
                             [class.text-blue-700]="dateFilterService.activeRangeType() === 'all'"
                             class="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all flex items-center justify-between group/item">
                           <div class="flex items-center">
                              <div class="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center mr-3 group-hover/item:bg-orange-100 transition-colors">
                                 <lucide-icon name="filter-x" class="w-3 h-3 text-orange-600"></lucide-icon>
                              </div>
                              <span>All Time</span>
                           </div>
                           <lucide-icon *ngIf="dateFilterService.activeRangeType() === 'all'" name="check" class="w-3 h-3 text-blue-600"></lucide-icon>
                        </button>

                        <div class="h-px bg-slate-50 my-1 mx-2"></div>

                        <button (click)="dateFilterService.setRangeType('today'); isDateMenuOpen.set(false)" 
                             [class.bg-blue-50]="dateFilterService.activeRangeType() === 'today'"
                             [class.text-blue-700]="dateFilterService.activeRangeType() === 'today'"
                             class="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all flex items-center justify-between group/item">
                           <div class="flex items-center">
                              <div class="w-6 h-6 rounded-lg bg-blue-100/50 flex items-center justify-center mr-3 group-hover/item:bg-blue-100 transition-colors">
                                 <lucide-icon name="calendar-days" class="w-3 h-3 text-blue-600"></lucide-icon>
                              </div>
                              <span>Today</span>
                           </div>
                           <lucide-icon *ngIf="dateFilterService.activeRangeType() === 'today'" name="check" class="w-3 h-3 text-blue-600"></lucide-icon>
                        </button>
                        <button (click)="dateFilterService.setRangeType('week'); isDateMenuOpen.set(false)" 
                                [class.bg-blue-50]="dateFilterService.activeRangeType() === 'week'"
                                [class.text-blue-700]="dateFilterService.activeRangeType() === 'week'"
                                class="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all flex items-center justify-between group/item">
                           <div class="flex items-center">
                              <div class="w-6 h-6 rounded-lg bg-indigo-100/50 flex items-center justify-center mr-3 group-hover/item:bg-indigo-100 transition-colors">
                                 <lucide-icon name="calendar-range" class="w-3 h-3 text-indigo-600"></lucide-icon>
                              </div>
                              <span>This Week</span>
                           </div>
                           <lucide-icon *ngIf="dateFilterService.activeRangeType() === 'week'" name="check" class="w-3 h-3 text-blue-600"></lucide-icon>
                        </button>
                        <button (click)="dateFilterService.setRangeType('7days'); isDateMenuOpen.set(false)" 
                                [class.bg-blue-50]="dateFilterService.activeRangeType() === '7days'"
                                [class.text-blue-700]="dateFilterService.activeRangeType() === '7days'"
                                class="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all flex items-center justify-between group/item">
                           <div class="flex items-center">
                              <div class="w-6 h-6 rounded-lg bg-emerald-100/50 flex items-center justify-center mr-3 group-hover/item:bg-emerald-100 transition-colors">
                                 <lucide-icon name="clock-3" class="w-3 h-3 text-emerald-600"></lucide-icon>
                              </div>
                              <span>Last 7 Days</span>
                           </div>
                           <lucide-icon *ngIf="dateFilterService.activeRangeType() === '7days'" name="check" class="w-3 h-3 text-blue-600"></lucide-icon>
                        </button>
                        <button (click)="dateFilterService.setRangeType('month'); isDateMenuOpen.set(false)" 
                                [class.bg-blue-50]="dateFilterService.activeRangeType() === 'month'"
                                [class.text-blue-700]="dateFilterService.activeRangeType() === 'month'"
                                class="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all flex items-center justify-between group/item">
                           <div class="flex items-center">
                              <div class="w-6 h-6 rounded-lg bg-amber-100/50 flex items-center justify-center mr-3 group-hover/item:bg-amber-100 transition-colors">
                                 <lucide-icon name="calendar-days" class="w-3 h-3 text-amber-600"></lucide-icon>
                              </div>
                              <span>This Month</span>
                           </div>
                           <lucide-icon *ngIf="dateFilterService.activeRangeType() === 'month'" name="check" class="w-3 h-3 text-blue-600"></lucide-icon>
                        </button>
                     </div>
                     
                     <div class="h-px bg-slate-50 my-1 mx-4"></div>
                     
                     <div class="px-5 py-4 bg-slate-50/50">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-3">Custom Range</span>
                        <div class="space-y-2.5">
                           <div class="relative">
                              <input type="date" #startDate 
                                     [value]="dateFilterService.formatDateForInput(dateFilterService.customRange().start)"
                                     class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white font-medium text-slate-700">
                           </div>
                           <div class="relative">
                              <input type="date" #endDate 
                                     [value]="dateFilterService.formatDateForInput(dateFilterService.customRange().end)"
                                     class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white font-medium text-slate-700">
                           </div>
                           <div class="flex space-x-2">
                              <button (click)="dateFilterService.setRangeType('all'); isDateMenuOpen.set(false)" 
                                      class="flex-1 py-2.5 bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider rounded-xl hover:bg-slate-200 active:scale-[0.98] transition-all">
                                 Limpiar
                              </button>
                              <button (click)="dateFilterService.setCustomRange(startDate.valueAsDate, endDate.valueAsDate); isDateMenuOpen.set(false)" 
                                      class="flex-2 px-6 py-2.5 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg shadow-slate-200">
                                 Apply
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div class="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

               <button (click)="clearNotifications()" class="relative p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 active:scale-95">
                 <lucide-icon name="bell" class="w-5 h-5"></lucide-icon>
                 <span *ngIf="hasNotifications()" class="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white ring-2 ring-red-100 animate-bounce"></span>
               </button>
               
               <!-- Export Dropdown -->
               <div class="relative z-50">
                 <div *ngIf="isExportMenuOpen()" class="fixed inset-0 z-40" (click)="isExportMenuOpen.set(false)"></div>
                 
                 <button (click)="isExportMenuOpen.set(!isExportMenuOpen())" class="relative z-50 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-95 transition-all text-[13px] font-bold flex items-center space-x-2">
                    <lucide-icon name="arrow-up-right" class="w-4 h-4"></lucide-icon>
                    <span>Export</span>
                    <lucide-icon name="chevron-down" class="w-4 h-4"></lucide-icon>
                 </button>
                 
                 <div *ngIf="isExportMenuOpen()" class="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden slide-in-from-top-2 animate-in fade-in duration-200 z-50">
                    <button (click)="exportToExcel(); isExportMenuOpen.set(false)" class="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors flex items-center space-x-2">
                       <lucide-icon name="file-spreadsheet" class="w-4 h-4 text-emerald-600"></lucide-icon>
                       <span>Export as Excel</span>
                    </button>
                    <button (click)="exportToPDF(); isExportMenuOpen.set(false)" class="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors flex items-center space-x-2">
                       <lucide-icon name="file-text" class="w-4 h-4 text-red-600"></lucide-icon>
                       <span>Export as PDF</span>
                    </button>
                 </div>
               </div>
            </ng-container>
          </div>
        </header>

        <!-- Content Area -->
        <div class="flex-1 overflow-y-auto p-4 lg:p-6 scroll-smooth pb-20 custom-scrollbar bg-background">
           <router-outlet></router-outlet>
        </div>
        
      </main>
      
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 5px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #e2e8f0;
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #cbd5e1;
    }
  `]
})
export class LayoutComponent {
  private auth = inject(GoogleAuthService);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  public dateFilterService = inject(DateFilterService);

  searchQuery = signal('');
  hasNotifications = signal(true);
  isExportMenuOpen = signal(false);
  isDateMenuOpen = signal(false);

  get isDashboardRoute(): boolean {
    return this.router.url === '/dashboard' || this.router.url === '/';
  }


  searchResults = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query || query.length < 2) return { orders: [], products: [] };

    const matchingOrders = this.orderService.orders().filter(o => 
      o.fullName?.toLowerCase().includes(query) || 
      o.phone?.includes(query) || 
      o.id?.toLowerCase().includes(query)
    ).slice(0, 5);

    const matchingProducts = this.productService.products().filter(p => 
      p.name?.toLowerCase().includes(query) || 
      p.sku?.toLowerCase().includes(query)
    ).slice(0, 4);

    return { orders: matchingOrders, products: matchingProducts };
  });

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  clearSearch(inputElement: HTMLInputElement) {
    this.searchQuery.set('');
    inputElement.value = '';
  }

  clearNotifications() {
    this.hasNotifications.set(false);
  }

  exportToExcel() {
    const orders = this.orderService.orders();
    if (!orders || orders.length === 0) return;
    
    const rows = orders.map(o => ({
      'Order ID': o.id || '',
      'Date': o.date || '',
      'Customer Name': o.fullName || '',
      'Phone': o.phone || '',
      'Product Name': o.productName || '',
      'Quantity': o.productQuantity || '',
      'Price': o.productPrice || '',
      'Total': (o.productQuantity || 0) * (o.productPrice || 0),
      'Status': o.status || '',
      'Carrier': o.carrier || ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    
    XLSX.writeFile(workbook, `orders_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportToPDF() {
    const orders = this.orderService.orders();
    if (!orders || orders.length === 0) return;

    const body = orders.map(o => [
      o.id || '',
      o.date || '',
      o.fullName || '',
      o.productName?.length > 20 ? o.productName.substring(0, 20) + '...' : (o.productName || ''),
      (o.productQuantity || '').toString(),
      `RD$ ${(o.productQuantity || 0) * (o.productPrice || 0)}`,
      o.status || ''
    ]);

    const docDefinition: any = {
      content: [
        { text: 'Orders Export', style: 'header' },
        { text: `Generated on: ${new Date().toLocaleDateString()}`, style: 'subheader' },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', '*', '*', 'auto', 'auto', 'auto'],
            body: [
              ['ID', 'Date', 'Customer', 'Product', 'Qty', 'Total', 'Status'],
              ...body
            ]
          },
          layout: {
            fillColor: (rowIndex: number) => {
              return (rowIndex === 0) ? '#2563eb' : null;
            },
            hLineColor: '#e2e8f0',
            vLineColor: '#e2e8f0'
          }
        }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10]
        },
        subheader: {
          fontSize: 11,
          color: '#64748b',
          margin: [0, 0, 0, 20]
        },
        tableHeader: {
          bold: true,
          fontSize: 9,
          color: 'white'
        }
      },
      defaultStyle: {
        fontSize: 8
      }
    };

    pdfMake.createPdf(docDefinition).download(`orders_export_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
