import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { GoogleAuthService } from '../core/services/google-auth.service';

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
            <!-- Search Bar (Fake) -->
            <div class="hidden lg:flex items-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:bg-white transition-all w-64 group">
               <lucide-icon name="search" class="text-slate-400 w-4 h-4 mr-2 group-focus-within:text-blue-500"></lucide-icon>
               <input type="text" placeholder="Search data..." class="bg-transparent border-none text-sm focus:outline-none w-full text-slate-700 placeholder:text-slate-400">
            </div>

            <div class="hidden sm:flex items-center bg-white rounded-xl px-3 py-2 border border-slate-200 shadow-sm shadow-slate-50 hover:border-slate-300 transition-all cursor-pointer group">
              <lucide-icon name="calendar" class="text-slate-400 w-4 h-4 group-hover:text-blue-600 mr-2 transition-colors"></lucide-icon>
              <span class="text-[12px] font-semibold text-slate-600">Mar 9 - Mar 15</span>
              <lucide-icon name="chevron-down" class="text-slate-300 w-4 h-4 ml-1"></lucide-icon>
            </div>

            <div class="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            <button class="relative p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 active:scale-95">
              <lucide-icon name="bell" class="w-5 h-5"></lucide-icon>
              <span class="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white ring-2 ring-red-100 animate-bounce"></span>
            </button>
            
            <button class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 active:scale-95 transition-all text-[13px] font-bold flex items-center space-x-2">
               <lucide-icon name="arrow-up-right" class="w-4 h-4"></lucide-icon>
               <span>Export</span>
            </button>
          </div>
        </header>

        <!-- Content Area -->
        <div class="flex-1 overflow-y-auto p-8 lg:p-10 scroll-smooth pb-20 custom-scrollbar bg-background">
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

  logout() {
    this.auth.logout();
  }
}
