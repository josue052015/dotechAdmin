import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GoogleAuthService } from '../../../core/services/google-auth.service';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, MatProgressSpinnerModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-primary/10">
      
      <!-- Decorative Background elements -->
      <div class="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
        <div class="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-blue-400/5 rounded-full blur-[100px]"></div>
      </div>

      <div class="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        <!-- Logo Area -->
        <div class="flex flex-col items-center mb-10">
          <div class="w-16 h-16 bg-white rounded-2xl shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6 border border-slate-100">
            <lucide-icon name="layout-dashboard" class="w-8 h-8 text-primary" [strokeWidth]="2.5"></lucide-icon>
          </div>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight">OrderFlow Admin</h1>
          <p class="text-slate-500 font-medium mt-2">Precision Commerce Management</p>
        </div>

        <!-- Login Card -->
        <div class="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.1)] border border-white/40 ring-1 ring-slate-200/50">
          
          <div class="space-y-8 text-center">
            <div>
              <h2 class="text-xl font-bold text-slate-800">Welcome Back</h2>
              <p class="text-sm text-slate-500 mt-2 font-medium">Please sign in with your Google account to access your dashboard.</p>
            </div>

            <div class="bg-amber-50/50 border border-amber-100/50 rounded-2xl p-4 flex gap-3 text-left">
              <lucide-icon name="shield-check" class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"></lucide-icon>
              <div>
                <p class="text-[11px] font-black text-amber-700 uppercase tracking-wider">Restricted Access</p>
                <p class="text-[11px] text-amber-600/80 font-medium leading-relaxed mt-1">
                  Only the owner/creator of the linked Google Spreadsheet can access this application.
                </p>
              </div>
            </div>

            <button
              (click)="auth.loginInteractive()"
              [disabled]="!auth.isScriptLoaded() || auth.isVerifying()"
              class="w-full h-14 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-4 group"
            >
              <ng-container *ngIf="!auth.isVerifying(); else verifying">
                <ng-container *ngIf="auth.isScriptLoaded(); else loading">
                  <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" class="w-6 h-6" alt="Google">
                  <span class="text-slate-700 font-bold text-sm tracking-tight">
                    {{ auth.isAuthenticated() ? 'Authorize Google Sheets' : 'Continue with Google' }}
                  </span>
                </ng-container>
              </ng-container>
              
              <ng-template #verifying>
                <mat-spinner diameter="20" strokeWidth="3" class="mr-3"></mat-spinner>
                <span class="text-slate-700 font-bold text-sm tracking-tight">Verifying access...</span>
              </ng-template>

              <ng-template #loading>
                <mat-spinner diameter="20" strokeWidth="3"></mat-spinner>
              </ng-template>
            </button>
            
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Secure single sign-on experience
            </p>
          </div>
        </div>

        <!-- Footer Footer -->
        <div class="text-center mt-12 space-y-4">
          <div class="flex items-center justify-center space-x-6">
            <a href="#" class="text-[11px] text-slate-400 hover:text-primary font-bold uppercase tracking-widest transition-colors">Privacy Policy</a>
            <span class="w-1 h-1 bg-slate-300 rounded-full"></span>
            <a href="#" class="text-[11px] text-slate-400 hover:text-primary font-bold uppercase tracking-widest transition-colors">Support</a>
          </div>
          <p class="text-[10px] text-slate-300 font-medium">&copy; 2026 OrderFlow Enterprise. All rights reserved.</p>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class LoginComponent {
  public auth = inject(GoogleAuthService);
  private router = inject(Router);

  constructor() {
    // Only handle the success case here.
    // Access denial is handled by the OwnerGuard on protected routes.
    effect(() => {
      if (this.auth.isAuthorized() && this.auth.accessToken()) {
        this.router.navigate(['/dashboard']);
      }
    });
  }
}
