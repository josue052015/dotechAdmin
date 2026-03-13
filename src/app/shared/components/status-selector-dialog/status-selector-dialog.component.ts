import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-status-selector-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, LucideAngularModule],
  template: `
    <div class="p-6 max-w-md bg-white rounded-3xl overflow-hidden animate-in zoom-in duration-300">
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
            <lucide-icon name="activity" class="w-5 h-5"></lucide-icon>
          </div>
          <div>
            <h2 class="text-lg font-black text-slate-900 leading-none">Actualizar Estado</h2>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Selecciona el nuevo estado del pedido</p>
          </div>
        </div>
        <button (click)="dialogRef.close()" class="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
          <lucide-icon name="x" class="w-5 h-5"></lucide-icon>
        </button>
      </div>

      <div class="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
        <div *ngFor="let s of data.statuses" 
             (click)="select(s)"
             class="p-4 rounded-2xl border border-slate-100 hover:border-primary/20 hover:bg-primary/5 cursor-pointer transition-all group active:scale-[0.98] flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div [class]="getStatusDotClass(s)" class="w-2 h-2 rounded-full shadow-sm"></div>
            <span class="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors capitalize">{{ s }}</span>
          </div>
          <div *ngIf="data.currentStatus === s" class="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
            <lucide-icon name="check" class="w-3 h-3"></lucide-icon>
          </div>
        </div>
      </div>

      <div class="mt-8">
        <button (click)="dialogRef.close()" class="w-full py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
          Cancelar selección
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `]
})
export class StatusSelectorDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<StatusSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { statuses: string[], currentStatus: string }
  ) {}

  select(status: string) {
    this.dialogRef.close(status);
  }

  getStatusDotClass(status: string): string {
    const s = (status || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    
    if (s.includes('entregado') || s.includes('dinero recibido') || s.includes('confirmado completo')) {
      return 'bg-green-500';
    }
    if (s.includes('pendiente') || s.includes('proceso') || s.includes('empacado') || s.includes('no confirmado')) {
      return 'bg-orange-500';
    }
    if (s.includes('cancelado') || s.includes('desaparecido')) {
      return 'bg-red-500';
    }
    return 'bg-slate-400';
  }
}
