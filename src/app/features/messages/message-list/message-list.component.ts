import { Component, OnInit, inject, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MessageService } from '../../../core/services/message.service';
import { MessageTemplate } from '../../../core/models/message.model';

@Component({
   selector: 'app-message-list',
   standalone: true,
   imports: [
      CommonModule, ReactiveFormsModule, FormsModule, LucideAngularModule, MatProgressSpinnerModule
   ],
   template: `
    <div class="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      <!-- Header Area (Visible only when not editing) -->
      <div *ngIf="!showForm" class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div class="space-y-1">
          <h1 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Message Templates</h1>
          <p class="text-sm text-slate-500 font-medium">Manage and automate your customer communications.</p>
        </div>
        
        <div class="flex items-center space-x-3 w-full sm:w-auto">
           <div class="relative flex-1 sm:w-64 group">
              <lucide-icon name="search" class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 md:w-5 md:h-5 group-focus-within:text-primary transition-colors"></lucide-icon>
              <input type="text" (keyup)="applyFilter($event)" 
                     placeholder="Search templates..." 
                     class="input-stitch pl-12 md:pl-14 h-11 md:h-12 text-xs md:text-sm">
           </div>
           
           <button (click)="openForm()" class="bg-primary hover:bg-blue-700 text-white px-4 md:px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center space-x-2 text-xs md:text-sm font-bold">
              <lucide-icon name="plus" class="w-4 h-4 md:w-5 h-5"></lucide-icon>
              <span class="hidden xs:inline">Create Template</span>
              <span class="xs:hidden">New</span>
           </button>
        </div>
      </div>

      <!-- Template Grid (Visible only when not editing) -->
      <div *ngIf="!showForm" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div *ngFor="let template of filteredTemplates" class="card-stitch p-6 group hover:border-primary/30 transition-all flex flex-col min-h-[220px]">
            <div class="flex justify-between items-start mb-4">
               <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success-text border border-success/20">
                    <lucide-icon name="message-square" class="w-5 h-5"></lucide-icon>
                  </div>
                  <div class="flex flex-col">
                     <span class="text-sm font-bold text-slate-900 leading-tight">{{ template.name }}</span>
                     <span class="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">WhatsApp / Global</span>
                  </div>
               </div>
               <div class="flex items-center h-6 px-2 rounded-full bg-slate-50 border border-slate-100">
                  <span class="w-1.5 h-1.5 rounded-full bg-success mr-2"></span>
                  <span class="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Active</span>
               </div>
            </div>

            <p class="text-xs text-slate-500 font-medium leading-relaxed flex-1 line-clamp-3 italic mb-6">
               "{{ template.text }}"
            </p>

            <div class="flex items-center justify-between pt-4 border-t border-slate-50">
               <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Modified 2 days ago</span>
               <div class="flex items-center space-x-1">
                  <button (click)="editTemplate(template)" class="p-2 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-all active:scale-90">
                     <lucide-icon name="pencil" class="w-4 h-4"></lucide-icon>
                  </button>
                  <button class="p-2 text-text-muted hover:text-text hover:bg-slate-100 rounded-lg transition-all active:scale-90">
                     <lucide-icon name="copy" class="w-4 h-4"></lucide-icon>
                  </button>
                  <button (click)="deleteTemplate(template)" class="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all active:scale-90">
                     <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
                  </button>
               </div>
            </div>
         </div>

         <!-- Empty State for Search -->
         <div *ngIf="filteredTemplates.length === 0" class="col-span-full py-20 flex flex-col items-center border-2 border-dashed border-slate-200 rounded-3xl">
            <lucide-icon name="search" class="w-12 h-12 text-slate-100 mb-4" [strokeWidth]="1.5"></lucide-icon>
            <h3 class="text-lg font-bold text-slate-900">No matching templates</h3>
            <p class="text-sm text-slate-400 mt-1">Try different keywords or create a new template.</p>
         </div>
      </div>

      <!-- Sophisticated Template Editor -->
      <div *ngIf="showForm" class="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 animate-in slide-in-from-right-4 duration-500">
         <!-- Left Side: Form -->
         <div class="lg:col-span-12 xl:col-span-7 space-y-6 md:space-y-8">
            <div class="flex items-center space-x-4 mb-4">
               <button (click)="closeForm()" class="p-2.5 text-text-muted hover:text-text hover:bg-white border hover:border-border border-transparent rounded-xl transition-all shadow-sm bg-slate-50/50 sm:bg-transparent">
                  <lucide-icon name="arrow-left" class="w-5 h-5"></lucide-icon>
               </button>
               <div>
                  <h2 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase tracking-wider">{{ isEditing ? 'Edit Template' : 'Create Template' }}</h2>
                  <nav class="flex items-center space-x-2 text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">
                     <span>Library</span>
                     <lucide-icon name="chevron-right" class="w-3 h-3"></lucide-icon>
                     <span class="text-primary italic">Workspace</span>
                  </nav>
               </div>
            </div>

            <div class="card-stitch p-5 md:p-8 bg-white space-y-6 md:space-y-8">
               <form [formGroup]="templateForm" class="space-y-6">
                  <div class="space-y-2">
                     <label class="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Template Name</label>
                     <input type="text" formControlName="name" placeholder="e.g. Order Confirmation" 
                            class="input-stitch font-bold text-slate-700 h-11 md:h-12 text-sm">
                  </div>

                  <div class="space-y-2">
                     <div class="flex justify-between items-center mb-1 pr-1">
                        <label class="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Message Content</label>
                        <span class="hidden sm:inline-block text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Dynamic Variables Compatible</span>
                     </div>
                     <textarea formControlName="text" placeholder="Type your message here..." rows="6" md:rows="8"
                               class="input-stitch py-4 px-5 font-medium text-slate-600 h-auto resize-none leading-relaxed custom-scrollbar text-sm md:text-base"></textarea>
                     <div class="flex flex-wrap gap-2 mt-4">
                        <button type="button" *ngFor="let v of variables" 
                                (click)="insertVar(v)"
                                class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[9px] md:text-[10px] font-black text-slate-500 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all shadow-sm active:scale-95">
                           + {{ v }}
                        </button>
                     </div>
                  </div>
               </form>
            </div>

            <div class="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
               <button (click)="closeForm()" class="order-2 sm:order-1 px-8 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 font-bold text-sm bg-white border border-transparent hover:border-slate-200 transition-all">Discard Changes</button>
               <button (click)="saveTemplate()" [disabled]="templateForm.invalid || isSaving" 
                       class="order-1 sm:order-2 bg-primary hover:bg-blue-700 text-white px-10 py-3 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all active:scale-95 text-sm font-black flex items-center justify-center space-x-2">
                  <mat-spinner diameter="18" strokeWidth="3" *ngIf="isSaving" class="mr-2"></mat-spinner>
                  <span>{{ isEditing ? 'Update Template' : 'Publish Template' }}</span>
               </button>
            </div>
         </div>

         <!-- Right Side: Preview (Hidden on smaller mobile, visible on sm+) -->
         <div class="lg:col-span-12 xl:col-span-5 flex flex-col items-center mt-8 xl:mt-0">
            <div class="sticky top-24 w-full flex flex-col items-center">
               <h3 class="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 md:mb-8">Mobile Experience Preview</h3>
               
               <!-- Smartphone Mockup -->
               <div class="relative w-[280px] sm:w-[300px] h-[580px] sm:h-[600px] bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] border-[6px] sm:border-[8px] border-slate-800 shadow-[0_50px_100px_-20px_rgba(30,41,59,0.25)] overflow-hidden ring-4 ring-slate-100/50">
                  <!-- Front Camera Notch -->
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-800 rounded-b-2xl z-20 flex items-center justify-center">
                     <div class="w-2 h-2 rounded-full bg-slate-700 mx-1"></div>
                  </div>

                  <!-- Phone Content -->
                  <div class="w-full h-full bg-[#E5DDD5] flex flex-col relative">
                     <!-- WhatsApp Header -->
                     <div class="h-20 bg-[#075E54] flex items-end px-4 pb-3 space-x-3 shadow-md z-10 relative">
                        <lucide-icon name="arrow-left" class="text-white w-6 h-6 mb-0.5"></lucide-icon>
                        <div class="w-9 h-9 rounded-full bg-white/20 border border-white/10"></div>
                        <div class="flex-1 flex flex-col">
                           <span class="text-sm font-bold text-white leading-none">OrderFlow Admin</span>
                           <span class="text-[10px] text-emerald-100/70 mt-0.5">online</span>
                        </div>
                        <lucide-icon name="more-vertical" class="text-white w-5 h-5 mb-0.5 ml-auto"></lucide-icon>
                     </div>

                     <!-- Chat Area -->
                     <div class="flex-1 p-4 bg-repeat overflow-hidden relative" style="background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); background-size: 400px; filter: grayscale(10%) brightness(0.95); opacity: 0.8;">
                     </div>

                     <div class="absolute inset-0 p-4 pt-24 overflow-y-auto custom-scrollbar flex flex-col space-y-4">
                        <div class="mx-auto bg-white/70 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-4">Today</div>
                        
                        <!-- Message Bubble -->
                        <div class="self-start max-w-[85%] bg-white rounded-2xl rounded-tl-none p-3 shadow-sm border border-slate-200/50 relative group">
                           <div class="text-[13px] text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">{{ previewText || 'Type text to preview...' }}</div>
                           <div class="flex items-center justify-end space-x-1 mt-1 opacity-40">
                              <span class="text-[9px] font-bold">12:30 PM</span>
                              <lucide-icon name="check-check" class="w-3 h-3 flex items-center justify-center text-blue-500"></lucide-icon>
                           </div>
                        </div>
                     </div>

                     <!-- WhatsApp Footer -->
                     <div class="h-16 flex items-center px-2 space-x-2 bg-transparent z-10 relative">
                        <div class="flex-1 bg-white rounded-full h-10 flex items-center px-3 shadow-sm border border-slate-200/50">
                           <lucide-icon name="smile" class="text-slate-400 w-5 h-5"></lucide-icon>
                           <span class="text-xs text-slate-300 ml-3">Message</span>
                           <lucide-icon name="paperclip" class="text-slate-400 w-5 h-5 ml-auto"></lucide-icon>
                           <lucide-icon name="camera" class="text-slate-400 w-5 h-5 ml-2"></lucide-icon>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-[#128C7E] flex items-center justify-center text-white shadow-md">
                           <lucide-icon name="mic" class="w-5 h-5"></lucide-icon>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

    </div>
  `,
   styles: [`
    :host { display: block; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    .line-clamp-3 {
       display: -webkit-box;
       -webkit-line-clamp: 3;
       -webkit-box-orient: vertical;
       overflow: hidden;
    }
  `]
})
export class MessageListComponent implements OnInit {
   public messageService = inject(MessageService);
   private fb = inject(FormBuilder);

   templates: MessageTemplate[] = [];
   filteredTemplates: MessageTemplate[] = [];
   variables = ['FullName', 'ProductName', 'Price', 'Status', 'OrderID', 'City'];

   showForm = false;
   isEditing = false;
   isSaving = false;
   currentRowNumber: number | null = null;
   previewText = '';

   templateForm: FormGroup = this.fb.group({
      name: ['', Validators.required],
      text: ['', Validators.required],
      id: ['']
   });

   constructor() {
      effect(() => {
         this.templates = this.messageService.templates();
         this.applyFilter({ target: { value: '' } } as any);
      });

      this.templateForm.valueChanges.subscribe(val => {
         this.previewText = this.processPreview(val.text || '');
      });
   }

   ngOnInit() {
      this.messageService.loadTemplates();
   }

   applyFilter(event: Event) {
      const filterValue = (event.target as HTMLInputElement).value?.trim().toLowerCase() || '';
      if (!filterValue) {
         this.filteredTemplates = this.templates;
      } else {
         this.filteredTemplates = this.templates.filter(t =>
            t.name.toLowerCase().includes(filterValue) ||
            t.text.toLowerCase().includes(filterValue)
         );
      }
   }

   openForm() {
      this.templateForm.reset();
      this.isEditing = false;
      this.currentRowNumber = null;
      this.showForm = true;
      this.previewText = '';
   }

   closeForm() {
      this.showForm = false;
   }

   editTemplate(template: MessageTemplate) {
      this.templateForm.patchValue(template);
      this.isEditing = true;
      this.currentRowNumber = template._rowNumber || null;
      this.showForm = true;
   }

   saveTemplate() {
      if (this.templateForm.invalid) return;

      this.isSaving = true;
      const value = this.templateForm.value;

      if (this.isEditing && this.currentRowNumber) {
         this.messageService.updateTemplate(this.currentRowNumber, value).subscribe({
            next: () => {
               this.isSaving = false;
               this.closeForm();
            },
            error: () => this.isSaving = false
         });
      } else {
         this.messageService.createTemplate(value).subscribe({
            next: () => {
               this.isSaving = false;
               this.closeForm();
            },
            error: () => this.isSaving = false
         });
      }
   }

   deleteTemplate(template: MessageTemplate) {
      if (!template._rowNumber) return;
      if (confirm(`¿Estás seguro de que quieres eliminar la plantilla "${template.name}"?`)) {
         this.messageService.deleteTemplate(template._rowNumber).subscribe();
      }
   }

   insertVar(v: string) {
      const text = this.templateForm.get('text')?.value || '';
      this.templateForm.get('text')?.setValue(text + ' {{' + v + '}} ');
   }

   private processPreview(text: string): string {
      // Naively replace variables for preview
      return text
         .replace(/{ {FullName} }/img, 'John Doe')
         .replace(/{ {ProductName} }/img, 'Premium Wireless Headphones')
         .replace(/{ {Price} }/img, 'RD$ 7,500')
         .replace(/{ {Status} }/img, 'Delivered')
         .replace(/{ {OrderID} }/img, 'w001234')
         .replace(/{ {City} }/img, 'Santo Domingo');
   }
}
