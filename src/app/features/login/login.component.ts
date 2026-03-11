import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { GoogleAuthService } from '../../core/services/google-auth.service';
import { Router } from '@angular/router';
import { effect } from '@angular/core';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    template: `
    <div class="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-in fade-in duration-700">
      <div class="sm:mx-auto sm:w-full sm:max-w-md space-y-2">
        <h2 class="text-center text-3xl font-black text-slate-900 tracking-tight">
          Admin Dashboard
        </h2>
        <p class="text-center text-sm font-medium text-slate-500">
          Sign in to manage ecommerce orders
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="card-stitch bg-white py-10 px-8">
            <div class="text-center mb-8 flex flex-col items-center">
              <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-sm">
                 <lucide-icon name="shield-check" class="w-8 h-8"></lucide-icon>
              </div>
              <h3 class="text-xl font-black text-slate-900">Google Authentication</h3>
              <p class="text-slate-500 mt-2 text-sm font-medium leading-relaxed">Please sign in with the Google Account that has access to the Database Sheet.</p>
            </div>

            <button class="w-full bg-primary hover:bg-blue-700 text-white py-4 rounded-ui shadow-lg shadow-blue-200 hover:shadow-blue-300 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center space-x-3 text-base font-black" 
                    (click)="login()" [disabled]="!auth.isScriptLoaded()">
              <lucide-icon name="log-in" class="w-5 h-5"></lucide-icon>
              <span>Sign in with Google</span>
            </button>
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
