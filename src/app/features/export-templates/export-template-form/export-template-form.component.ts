import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExportTemplateService } from '../../../core/services/export-template.service';
import { EXPORT_SOURCES } from '../../../core/config/export-source.config';
import { ExportTemplate, ExportColumn } from '../../../core/models/export-template.model';

@Component({
  selector: 'app-export-template-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    LucideAngularModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <!-- Header Area -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="flex items-center space-x-4">
           <button routerLink="/export-templates" class="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all active:scale-95 shadow-sm">
              <lucide-icon name="arrow-left" class="w-5 h-5"></lucide-icon>
           </button>
           <div>
              <h1 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{{ isEdit ? 'Edit Template' : 'Create Template' }}</h1>
              <p class="text-slate-400 text-[10px] md:text-xs font-semibold uppercase tracking-widest mt-0.5">Design your custom data export structure</p>
           </div>
        </div>
        
        <div class="flex items-center space-x-3 w-full sm:w-auto">
           <button (click)="save()" [disabled]="form.invalid || isSaving()" 
                   class="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 flex items-center justify-center space-x-2 font-bold text-sm">
              <lucide-icon *ngIf="!isSaving()" name="save" class="w-4 h-4"></lucide-icon>
              <div *ngIf="isSaving()" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>{{ isSaving() ? 'Saving...' : 'Save Configuration' }}</span>
           </button>
        </div>
      </div>

      <form [formGroup]="form" class="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
         
         <!-- Left Sidebar: General Info -->
         <div class="lg:col-span-4 space-y-6">
            <div class="card-stitch p-6 bg-white space-y-6">
               <div class="flex items-center space-x-3 pb-2 border-b border-slate-50">
                  <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                     <lucide-icon name="info" class="w-4 h-4"></lucide-icon>
                  </div>
                  <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">General Information</h3>
               </div>

               <div class="space-y-4">
                  <div class="space-y-1.5">
                     <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Template Name</label>
                     <input type="text" formControlName="name" placeholder="E.g. Monthly Sales Report" 
                            class="input-stitch h-11 text-sm font-bold">
                     <p *ngIf="form.get('name')?.touched && form.get('name')?.errors?.['required']" class="text-[10px] text-red-500 font-bold ml-1">Name is required</p>
                  </div>

                  <div class="space-y-1.5">
                     <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Source List</label>
                     <div class="relative group">
                        <select formControlName="sourceList" (change)="onSourceChange()"
                                class="select-stitch h-11 pl-4 pr-10 font-bold text-sm"
                                [attr.disabled]="isEdit ? true : null">
                           <option value="" disabled>Select a source...</option>
                           <option *ngFor="let source of sources" [value]="source.key">{{ source.label }}</option>
                        </select>
                        <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none"></lucide-icon>
                     </div>
                  </div>

                  <div class="space-y-1.5">
                     <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description (Optional)</label>
                     <textarea formControlName="description" rows="3" placeholder="Briefly describe what this template is for..." 
                               class="input-stitch py-3 px-4 text-sm font-medium resize-none"></textarea>
                  </div>

                  <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-100 transition-colors cursor-pointer" (click)="toggleActive()">
                     <div class="flex flex-col">
                        <span class="text-xs font-bold text-slate-700">Active Status</span>
                        <span class="text-[10px] text-slate-400 font-medium">Visible in the export menu</span>
                     </div>
                     <div class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" formControlName="isActive" class="sr-only peer">
                        <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <!-- Right Content: Column Designer -->
         <div class="lg:col-span-8 space-y-6">
            <div class="card-stitch p-6 bg-white flex flex-col min-h-[500px]">
               <div class="flex items-center justify-between pb-4 border-b border-slate-50 mb-6">
                  <div class="flex items-center space-x-3">
                     <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <lucide-icon name="layout-list" class="w-4 h-4"></lucide-icon>
                     </div>
                     <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">Column Designer</h3>
                  </div>
                  
                  <button *ngIf="selectedSource()" (click)="addColumn()" class="text-primary hover:bg-blue-50 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2">
                     <lucide-icon name="plus" class="w-3.5 h-3.5"></lucide-icon>
                     <span>Add Column Mapping</span>
                  </button>
               </div>

               <!-- Empty State: No Source Selected -->
               <div *ngIf="!selectedSource()" class="flex-1 flex flex-col items-center justify-center text-center p-12">
                  <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
                     <lucide-icon name="mouse-pointer-2" class="w-10 h-10" [strokeWidth]="1.5"></lucide-icon>
                  </div>
                  <h4 class="text-lg font-bold text-slate-900">Choose a data source</h4>
                  <p class="text-sm text-slate-400 max-w-sm mt-2">Select a source from the left sidebar to start defining your Excel columns.</p>
               </div>

               <!-- Column List -->
               <div *ngIf="selectedSource()" class="space-y-4" formArrayName="columns">
                  
                  <!-- Empty State: No Columns Added -->
                  <div *ngIf="columns.length === 0" class="flex-1 flex flex-col items-center justify-center text-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                     <p class="text-sm font-bold text-slate-400">No columns defined yet.</p>
                     <button (click)="addColumn()" class="mt-4 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95">
                        Add First Column
                     </button>
                  </div>

                  <div *ngFor="let col of columns.controls; let i = index" [formGroupName]="i" 
                       class="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group animate-in slide-in-from-right-2 duration-300">
                     
                     <div class="md:col-span-1 flex items-center justify-center">
                        <div class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 font-black text-xs flex items-center justify-center">
                           {{ i + 1 }}
                        </div>
                     </div>

                     <div class="md:col-span-5 space-y-1.5">
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Source Field</label>
                        <div class="relative">
                           <select formControlName="sourceColumnKey" 
                                   class="select-stitch h-10 pl-4 pr-10 font-bold text-xs"
                                   (change)="onColumnKeyChange(i)">
                              <option value="" disabled>Select field...</option>
                              <option *ngFor="let field of availableFields" [value]="field.key">{{ field.label }}</option>
                           </select>
                           <lucide-icon name="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3 pointer-events-none"></lucide-icon>
                        </div>
                     </div>

                     <div class="md:col-span-1 flex items-center justify-center">
                        <lucide-icon name="arrow-right" class="text-slate-200 w-4 h-4"></lucide-icon>
                     </div>

                     <div class="md:col-span-4 space-y-1.5">
                        <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Excel Header Title</label>
                        <input type="text" formControlName="excelColumnTitle" placeholder="Column title in Excel" 
                               class="input-stitch h-10 px-4 text-xs font-bold">
                     </div>

                     <div class="md:col-span-1 flex items-center justify-end">
                        <button (click)="removeColumn(i)" class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90">
                           <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
                        </button>
                     </div>
                  </div>

                  <div *ngIf="columns.length > 0" class="pt-4 flex justify-center">
                     <button (click)="addColumn()" class="bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-primary border border-slate-100 px-8 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center space-x-2">
                        <lucide-icon name="plus" class="w-3.5 h-3.5"></lucide-icon>
                        <span>Add Another Column</span>
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </form>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
  `]
})
export class ExportTemplateFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  public templateService = inject(ExportTemplateService);

  isEdit = false;
  isSaving = signal(false);
  sources = EXPORT_SOURCES;
  availableFields: { key: string; label: string }[] = [];
  selectedSource = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    id: [''],
    name: ['', [Validators.required]],
    sourceList: ['', [Validators.required]],
    description: [''],
    isActive: [true],
    columns: this.fb.array([], [Validators.required])
  });

  get columns(): FormArray {
    return this.form.get('columns') as FormArray;
  }

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEdit = true;
      const template = this.templateService.templates().find(t => t.id === id);
      if (template) {
        this.fillForm(template);
      } else {
        // If not loaded yet, wait for templates signal to update
        effect(() => {
          const t = this.templateService.templates().find(tmp => tmp.id === id);
          if (t) this.fillForm(t);
        });
      }
    }
  }

  fillForm(template: ExportTemplate) {
    this.selectedSource.set(template.sourceList);
    this.updateAvailableFields(template.sourceList);
    
    this.form.patchValue({
      id: template.id,
      name: template.name,
      sourceList: template.sourceList,
      description: template.description || '',
      isActive: template.isActive
    });

    this.columns.clear();
    template.columns.forEach(col => {
      this.columns.push(this.fb.group({
        order: [col.order],
        sourceColumnKey: [col.sourceColumnKey, Validators.required],
        sourceColumnLabel: [col.sourceColumnLabel],
        excelColumnTitle: [col.excelColumnTitle, Validators.required]
      }));
    });
  }

  onSourceChange() {
    const sourceKey = this.form.get('sourceList')?.value;
    this.selectedSource.set(sourceKey);
    this.updateAvailableFields(sourceKey);
    this.columns.clear();
    // Pre-populate with a few columns or the first one
    this.addColumn();
  }

  updateAvailableFields(sourceKey: string) {
    const source = EXPORT_SOURCES.find(s => s.key === sourceKey);
    this.availableFields = source ? source.columns : [];
  }

  addColumn() {
    this.columns.push(this.fb.group({
      order: [this.columns.length + 1],
      sourceColumnKey: ['', Validators.required],
      sourceColumnLabel: [''],
      excelColumnTitle: ['', Validators.required]
    }));
  }

  removeColumn(index: number) {
    this.columns.removeAt(index);
    // Update orders
    this.columns.controls.forEach((ctrl, i) => {
      ctrl.patchValue({ order: i + 1 });
    });
  }

  onColumnKeyChange(index: number) {
    const colGroup = this.columns.at(index);
    const key = colGroup.get('sourceColumnKey')?.value;
    const field = this.availableFields.find(f => f.key === key);
    if (field) {
      colGroup.patchValue({ 
        sourceColumnLabel: field.label,
        // Default excel title to the label if it's empty
        excelColumnTitle: colGroup.get('excelColumnTitle')?.value || field.label
      });
    }
  }

  toggleActive() {
    this.form.patchValue({ isActive: !this.form.get('isActive')?.value });
  }

  save() {
    if (this.form.invalid) return;

    this.isSaving.set(true);
    const formValue = this.form.value;
    
    const template: ExportTemplate = {
      id: formValue.id,
      name: formValue.name,
      sourceList: formValue.sourceList,
      description: formValue.description,
      isActive: formValue.isActive,
      columns: formValue.columns,
      createdAt: '', // Handled by service if new
      updatedAt: new Date().toISOString()
    };

    this.templateService.saveTemplate(template).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.snackBar.open('Template saved successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/export-templates']);
      },
      error: () => {
        this.isSaving.set(false);
        this.snackBar.open('Error saving template', 'Close', { duration: 3000 });
      }
    });
  }
}
