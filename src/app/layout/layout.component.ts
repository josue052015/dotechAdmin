import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { GoogleAuthService } from '../core/services/google-auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <mat-sidenav-container class="h-screen bg-gray-100">
      
      <!-- Sidebar -->
      <mat-sidenav #sidenav mode="side" opened class="w-64 border-r border-gray-200 bg-white shadow-sm">
        <div class="h-16 flex items-center justify-center border-b border-gray-100 px-4">
          <mat-icon class="text-blue-600 mr-2">shopping_bag</mat-icon>
          <span class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">AdminPanel</span>
        </div>
        
        <mat-nav-list class="pt-4 px-2">
          <a mat-list-item routerLink="/dashboard" routerLinkActive="bg-blue-50 text-blue-600 rounded-lg">
            <mat-icon matListItemIcon [class.text-blue-600]="true">dashboard</mat-icon>
            <span class="font-medium">Dashboard</span>
          </a>
          
          <a mat-list-item routerLink="/orders" routerLinkActive="bg-blue-50 text-blue-600 rounded-lg" class="mt-1">
            <mat-icon matListItemIcon>list_alt</mat-icon>
            <span class="font-medium">Orders</span>
          </a>
          
          <a mat-list-item routerLink="/products" routerLinkActive="bg-blue-50 text-blue-600 rounded-lg" class="mt-1">
            <mat-icon matListItemIcon>inventory_2</mat-icon>
            <span class="font-medium">Products</span>
          </a>
          
          <a mat-list-item routerLink="/messages" routerLinkActive="bg-blue-50 text-blue-600 rounded-lg" class="mt-1">
            <mat-icon matListItemIcon>message</mat-icon>
            <span class="font-medium">Messages</span>
          </a>
        </mat-nav-list>

        <div class="absolute bottom-0 w-full p-4 border-t border-gray-100">
          <button mat-stroked-button color="warn" class="w-full" (click)="logout()">
            <mat-icon>logout</mat-icon>
            Logout
          </button>
        </div>
      </mat-sidenav>

      <!-- Main Content -->
      <mat-sidenav-content class="flex flex-col bg-slate-50">
        
        <!-- Header -->
        <mat-toolbar class="bg-white border-b border-gray-200 shadow-sm h-16 sticky top-0 z-50 px-6">
          <button mat-icon-button (click)="sidenav.toggle()" class="mr-4 text-gray-500 hover:text-gray-800">
            <mat-icon>menu</mat-icon>
          </button>
          
          <span class="spacer flex-1"></span>
          
          <div class="flex items-center space-x-4">
            <button mat-icon-button class="text-gray-500 hover:text-gray-800">
              <mat-icon>notifications</mat-icon>
            </button>
            <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200">
              A
            </div>
          </div>
        </mat-toolbar>

        <!-- Page Content -->
        <div class="p-6 flex-1 overflow-auto">
          <router-outlet></router-outlet>
        </div>
        
      </mat-sidenav-content>
      
    </mat-sidenav-container>
  `,
  styles: [`
    /* Ensure the list items look modern */
    ::ng-deep .mat-mdc-list-item.mdc-list-item--activated {
      background-color: #eff6ff !important;
      color: #2563eb !important;
      border-radius: 0.5rem;
    }
    ::ng-deep .mat-mdc-list-item {
      border-radius: 0.5rem;
      margin-bottom: 0.25rem;
    }
  `]
})
export class LayoutComponent {
  private auth = inject(GoogleAuthService);

  logout() {
    this.auth.logout();
  }
}
