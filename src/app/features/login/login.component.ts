import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { GoogleAuthService } from '../../core/services/google-auth.service';
import { Router } from '@angular/router';
import { effect } from '@angular/core';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
    template: `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Admin Dashboard
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Sign in to manage ecommerce orders
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <mat-card class="shadow-none flex flex-col items-center">
            
            <div class="text-center mb-6">
              <mat-icon class="text-blue-600 !w-16 !h-16 !text-6xl mb-4">admin_panel_settings</mat-icon>
              <h3 class="text-xl font-medium">Google Authentication</h3>
              <p class="text-gray-500 mt-2 text-sm">Please sign in with the Google Account that has access to the Database Sheet.</p>
            </div>

            <button mat-flat-button color="primary" class="w-full !py-6 !text-lg" (click)="login()" [disabled]="!auth.isScriptLoaded()">
              <mat-icon>login</mat-icon>
              Sign in with Google
            </button>
            
          </mat-card>
        </div>
      </div>
    </div>
  `,
    styles: []
})
export class LoginComponent {
    public auth = inject(GoogleAuthService);
    private router = inject(Router);

    constructor() {
        effect(() => {
            // Redirect if authenticated
            if (this.auth.isAuthenticated()) {
                this.router.navigate(['/']);
            }
        });
    }

    login() {
        this.auth.login();
    }
}
