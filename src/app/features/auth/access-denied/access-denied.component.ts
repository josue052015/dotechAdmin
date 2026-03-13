import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleAuthService } from '../../../core/services/google-auth.service';
import { LucideAngularModule } from 'lucide-angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div class="w-full max-w-[480px] text-center animate-in fade-in zoom-in duration-500">
        
        <div class="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_32px_64px_-24px_rgba(15,23,42,0.12)] border border-slate-100 relative overflow-hidden">
          
          <!-- Alert Icon -->
          <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-red-50/50">
            <lucide-icon name="shield-alert" class="w-10 h-10 text-red-500" [strokeWidth]="2"></lucide-icon>
          </div>

          <h2 class="text-2xl font-black text-slate-900 tracking-tight mb-4">Access Denied</h2>
          
          <div class="space-y-4 mb-10">
            <p class="text-slate-500 font-medium leading-relaxed">
              We've authenticated your account, but it doesn't appear to be the authorized owner of the linked spreadsheet.
            </p>
            
            <div class="bg-slate-50 rounded-2xl p-4 inline-flex items-center space-x-3 border border-slate-100">
              <img [src]="auth.userProfile()?.picture" class="w-8 h-8 rounded-full border border-slate-200" [alt]="auth.userProfile()?.name">
              <div class="text-left">
                <p class="text-[11px] font-bold text-slate-900 leading-none">{{ auth.userProfile()?.name }}</p>
                <p class="text-[10px] text-slate-400 font-medium mt-1">{{ auth.userProfile()?.email }}</p>
              </div>
            </div>
          </div>

          <div class="bg-amber-50 rounded-2xl p-6 text-left mb-10">
            <h3 class="text-xs font-black text-amber-800 uppercase tracking-widest mb-2 flex items-center">
              <lucide-icon name="info" size="14" class="mr-2"></lucide-icon>
              Why am I seeing this?
            </h3>
            <p class="text-xs text-amber-700/80 font-medium leading-relaxed">
              To ensure maximum security, this admin portal is restricted exclusively to the Google account that owns or created the target Google Spreadsheet.
            </p>
          </div>

          <div class="flex flex-col space-y-3">
            <button
              (click)="auth.logout()"
              class="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <lucide-icon name="log-out" size="18"></lucide-icon>
              <span>Switch Account</span>
            </button>
            
            <a
              routerLink="/login"
              class="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors py-2"
            >
              Back to Login
            </a>
          </div>

        </div>

        <p class="text-[11px] text-slate-300 font-bold uppercase tracking-[0.2em] mt-10">
          OrderFlow Security Engine v2.0
        </p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class AccessDeniedComponent {
  public auth = inject(GoogleAuthService);
}
