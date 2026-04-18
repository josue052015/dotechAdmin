import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { ConfirmOptions } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, LucideAngularModule],
  template: `
    <div class="p-6 md:p-8 bg-white rounded-3xl animate-in zoom-in duration-300 relative overflow-hidden">
      <!-- Decoration -->
      <div [class]="data.isDanger ? 'bg-danger/5 border-danger/10' : 'bg-primary/5 border-primary/10'" 
           class="absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-12 -mt-12 border transition-colors"></div>
      
      <div class="flex flex-col items-center text-center space-y-6 relative z-10">
        <!-- Icon -->
        <div [class]="data.isDanger ? 'bg-danger/10 text-danger-text' : 'bg-primary/10 text-primary'" 
             class="w-16 h-16 rounded-2xl flex items-center justify-center transition-colors">
          <lucide-icon [name]="data.isDanger ? 'alert-triangle' : 'help-circle'" class="w-8 h-8"></lucide-icon>
        </div>

        <!-- Content -->
        <div class="space-y-2">
          <h3 class="text-xl font-black text-slate-900 tracking-tight">
            {{ data.title || (data.isDanger ? 'Confirm Deletion' : 'Are you sure?') }}
          </h3>
          <p class="text-sm text-slate-500 font-medium leading-relaxed max-w-[280px] mx-auto">
            {{ data.message }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row items-center gap-3 w-full pt-4">
          <button (click)="close(false)" 
                   class="w-full sm:flex-1 px-6 py-3.5 rounded-2xl text-sm font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all active:scale-[0.98]">
            {{ data.cancelText || 'Cancel' }}
          </button>
          <button (click)="close(true)" 
                   [class]="data.isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-primary hover:bg-blue-700 shadow-primary/20'"
                   class="w-full sm:flex-1 px-6 py-3.5 rounded-2xl text-sm font-black text-white shadow-lg transition-all active:scale-[0.98]">
            {{ data.confirmText || 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class ConfirmDialogComponent {
  private dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  
  constructor(@Inject(MAT_DIALOG_DATA) public data: ConfirmOptions) {}

  close(result: boolean) {
    this.dialogRef.close(result);
  }
}
