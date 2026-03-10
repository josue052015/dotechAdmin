import { Component, OnInit, inject, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MessageService } from '../../../core/services/message.service';
import { MessageTemplate } from '../../../core/models/message.model';

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      <!-- Header Area (Visible only when not editing) -->
      <div *ngIf="!showForm" class="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div class="space-y-1">
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Message Templates</h1>
          <p class="text-sm text-slate-500 font-medium">Manage and automate your customer communications effectively.</p>
        </div>
        
        <div class="flex items-center space-x-3 w-full xl:w-auto">
           <div class="relative flex-1 xl:w-80 group">
              <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 !text-xl group-focus-within:text-blue-600 transition-colors">search</mat-icon>
              <input type="text" (keyup)="applyFilter($event)" 
                     placeholder="Search templates..." 
                     class="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all shadow-sm font-medium">
           </div>
           
           <button (click)="openForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 flex items-center space-x-2 text-sm font-bold">
              <mat-icon class="!text-xl">add</mat-icon>
              <span>Create Template</span>
           </button>
        </div>
      </div>

      <!-- Template Grid (Visible only when not editing) -->
      <div *ngIf="!showForm" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div *ngFor="let template of filteredTemplates" class="card-stitch p-6 bg-white group hover:border-blue-200 transition-all flex flex-col min-h-[220px]">
            <div class="flex justify-between items-start mb-4">
               <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50">
                    <mat-icon class="!text-xl">chat</mat-icon>
                  </div>
                  <div class="flex flex-col">
                     <span class="text-sm font-bold text-slate-900 leading-tight">{{ template.name }}</span>
                     <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">WhatsApp / Global</span>
                  </div>
               </div>
               <div class="flex items-center h-6 px-2 rounded-full bg-slate-50 border border-slate-100">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                  <span class="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Active</span>
               </div>
            </div>

            <p class="text-xs text-slate-500 font-medium leading-relaxed flex-1 line-clamp-3 italic mb-6">
               "{{ template.text }}"
            </p>

            <div class="flex items-center justify-between pt-4 border-t border-slate-50">
               <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Modified 2 days ago</span>
               <div class="flex items-center space-x-1">
                  <button (click)="editTemplate(template)" class="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-90">
                     <mat-icon class="!text-lg">edit</mat-icon>
                  </button>
                  <button class="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all active:scale-90">
                     <mat-icon class="!text-lg">content_copy</mat-icon>
                  </button>
                  <button class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90">
                     <mat-icon class="!text-lg">delete</mat-icon>
                  </button>
               </div>
            </div>
         </div>

         <!-- Empty State for Search -->
         <div *ngIf="filteredTemplates.length === 0" class="col-span-full py-20 flex flex-col items-center border-2 border-dashed border-slate-200 rounded-3xl">
            <mat-icon class="!text-5xl text-slate-100 mb-4">search_off</mat-icon>
            <h3 class="text-lg font-bold text-slate-900">No matching templates</h3>
            <p class="text-sm text-slate-400 mt-1">Try different keywords or create a new template.</p>
         </div>
      </div>

      <!-- Sophisticated Template Editor -->
      <div *ngIf="showForm" class="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in slide-in-from-right-4 duration-500">
         <!-- Left Side: Form -->
         <div class="lg:col-span-7 space-y-8">
            <div class="flex items-center space-x-4 mb-4">
               <button (click)="closeForm()" class="p-2 text-slate-400 hover:text-slate-900 hover:bg-white border hover:border-slate-200 rounded-xl transition-all shadow-sm">
                  <mat-icon>arrow_back</mat-icon>
               </button>
               <div>
                  <h2 class="text-2xl font-black text-slate-900 tracking-tight">{{ isEditing ? 'Edit Template' : 'Create New Template' }}</h2>
                  <nav class="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     <span>Library</span>
                     <mat-icon class="!text-[12px] h-3 w-3 flex items-center justify-center">chevron_right</mat-icon>
                     <span class="text-blue-600">Editor</span>
                  </nav>
               </div>
            </div>

            <div class="card-stitch p-8 bg-white space-y-8">
               <form [formGroup]="templateForm" class="space-y-6">
                  <div class="space-y-1.5 text-blue-1000">
                     <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Template Name</label>
                     <input type="text" formControlName="name" placeholder="e.g. Order Confirmation" 
                            class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all">
                  </div>

                  <div class="space-y-1.5">
                     <div class="flex justify-between items-center mb-1 pr-1">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Content</label>
                        <span class="text-[10px] font-bold text-slate-300 uppercase">Interactive Variables Enabled</span>
                     </div>
                     <textarea formControlName="text" placeholder="Type your message here..." rows="8"
                               class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-medium text-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none leading-relaxed custom-scrollbar"></textarea>
                     <div class="flex flex-wrap gap-2 mt-4">
                        <button type="button" *ngFor="let v of variables" 
                                (click)="insertVar(v)"
                                class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-black text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm">
                           + {{ v }}
                        </button>
                     </div>
                  </div>
               </form>
            </div>

            <div class="flex justify-end space-x-4 pt-4">
               <button (click)="closeForm()" class="px-8 py-3 rounded-xl text-slate-600 font-bold text-[13px] hover:bg-white border border-transparent hover:border-slate-200 transition-all">Discard Changes</button>
               <button (click)="saveTemplate()" [disabled]="templateForm.invalid || isSaving" 
                       class="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl shadow-xl shadow-blue-200 hover:shadow-blue-300 disabled:opacity-50 transition-all active:scale-95 text-[13px] font-black flex items-center space-x-2">
                  <mat-spinner diameter="18" strokeWidth="3" *ngIf="isSaving" class="invert grayscale"></mat-spinner>
                  <span>{{ isEditing ? 'Update Template' : 'Publish Template' }}</span>
               </button>
            </div>
         </div>

         <!-- Right Side: Preview -->
         <div class="lg:col-span-5 flex flex-col items-center">
            <div class="sticky top-24 w-full flex flex-col items-center">
               <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">WhatsApp Preview</h3>
               
               <!-- Smartphone Mockup -->
               <div class="relative w-[300px] h-[600px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 shadow-[0_50px_100px_-20px_rgba(30,41,59,0.25)] overflow-hidden ring-4 ring-slate-100">
                  <!-- Front Camera Notch -->
                  <div class="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-800 rounded-b-2xl z-20 flex items-center justify-center">
                     <div class="w-2 h-2 rounded-full bg-slate-700 mx-1"></div>
                  </div>

                  <!-- Phone Content -->
                  <div class="w-full h-full bg-[#E5DDD5] flex flex-col relative">
                     <!-- WhatsApp Header -->
                     <div class="h-20 bg-[#075E54] flex items-end px-4 pb-3 space-x-3 shadow-md z-10 relative">
                        <mat-icon class="text-white !text-2xl mb-0.5">arrow_back</mat-icon>
                        <div class="w-9 h-9 rounded-full bg-white/20 border border-white/10"></div>
                        <div class="flex-1 flex flex-col">
                           <span class="text-sm font-bold text-white leading-none">OrderFlow Admin</span>
                           <span class="text-[10px] text-emerald-100/70 mt-0.5">online</span>
                        </div>
                        <mat-icon class="text-white !text-xl mb-0.5 ml-auto">more_vert</mat-icon>
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
                              <mat-icon class="!text-[10px] h-3 w-3 flex items-center justify-center">done_all</mat-icon>
                           </div>
                        </div>
                     </div>

                     <!-- WhatsApp Footer -->
                     <div class="h-16 flex items-center px-2 space-x-2 bg-transparent z-10 relative">
                        <div class="flex-1 bg-white rounded-full h-10 flex items-center px-3 shadow-sm border border-slate-200/50">
                           <mat-icon class="text-slate-400 !text-xl">sentiment_satisfied</mat-icon>
                           <span class="text-xs text-slate-300 ml-3">Message</span>
                           <mat-icon class="text-slate-400 !text-xl ml-auto">attach_file</mat-icon>
                           <mat-icon class="text-slate-400 !text-xl ml-2">photo_camera</mat-icon>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-[#128C7E] flex items-center justify-center text-white shadow-md">
                           <mat-icon class="!text-xl">mic</mat-icon>
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
      .replace(/{ {OrderID} }/img, '#ORD-1234')
      .replace(/{ {City} }/img, 'Santo Domingo');
  }
}
