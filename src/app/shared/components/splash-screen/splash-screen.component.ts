import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50">
      <!-- Background Decorative Elements -->
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl"></div>

      <div class="relative flex flex-col items-center text-center px-6">
        <!-- Logo / Icon Container -->
        <div class="mb-8 relative">
          <div class="absolute inset-0 bg-primary/20 rounded-2xl blur-xl animate-pulse"></div>
          <div class="relative bg-white p-5 rounded-2xl shadow-xl border border-primary/10">
            <i-lucide name="shield-check" class="w-12 h-12 text-primary"></i-lucide>
          </div>
        </div>

        <!-- Text Content -->
        <h1 class="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
          Portal de Administración
        </h1>
        <p class="text-slate-500 font-medium mb-8">
          Configurando su espacio de trabajo...
        </p>

        <!-- Modern Loader -->
        <div class="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div class="h-full bg-primary animate-progress"></div>
        </div>
        
        <div class="mt-4 flex items-center gap-2 text-xs text-slate-400 font-medium uppercase tracking-widest">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Conexión Segura
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes progress {
      0% { width: 0%; transform: translateX(-100%); }
      50% { width: 100%; transform: translateX(0%); }
      100% { width: 0%; transform: translateX(100%); }
    }
    .animate-progress {
      animation: progress 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    :host {
      --primary: #3b82f6; /* Default primary if tailwind is not loaded yet */
    }
  `]
})
export class SplashScreenComponent {}
