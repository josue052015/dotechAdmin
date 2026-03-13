import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { MessageTemplate } from '../../../core/models/message.model';

@Component({
  selector: 'app-whatsapp-selector-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, LucideAngularModule],
  template: `
    <div class="p-6 max-w-md bg-white rounded-3xl overflow-hidden animate-in zoom-in duration-300">
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            <lucide-icon name="message-square" class="w-5 h-5"></lucide-icon>
          </div>
          <div>
            <h2 class="text-lg font-black text-slate-900 leading-none">WhatsApp Template</h2>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select your message format</p>
          </div>
        </div>
        <button (click)="dialogRef.close()" class="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
          <lucide-icon name="x" class="w-5 h-5"></lucide-icon>
        </button>
      </div>

      <div class="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
        <div *ngFor="let tpl of data.templates" 
             (click)="select(tpl)"
             class="p-4 rounded-2xl border border-slate-100 hover:border-green-200 hover:bg-green-50/30 cursor-pointer transition-all group active:scale-[0.98]">
          <div class="flex justify-between items-start mb-1">
            <span class="text-sm font-bold text-slate-800 group-hover:text-green-700 transition-colors">{{ tpl.name }}</span>
            <lucide-icon name="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-green-500 transition-colors group-hover:translate-x-0.5 transform"></lucide-icon>
          </div>
          <p class="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{{ tpl.text }}</p>
        </div>
        
        <div *ngIf="data.templates.length === 0" class="py-12 text-center space-y-3">
          <lucide-icon name="info" class="w-12 h-12 text-slate-200 mx-auto"></lucide-icon>
          <p class="text-xs font-bold text-slate-400">No templates found in your configuration.</p>
        </div>
      </div>

      <div class="mt-8">
        <button (click)="dialogRef.close()" class="w-full py-3 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
          Cancel Selection
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
export class WhatsappSelectorDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<WhatsappSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { templates: MessageTemplate[] }
  ) {}

  select(template: MessageTemplate) {
    this.dialogRef.close(template);
  }
}
