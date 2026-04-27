import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ExportTemplateService } from '../../../core/services/export-template.service';
import { ExportTemplate } from '../../../core/models/export-template.model';
import { EXPORT_SOURCES } from '../../../core/config/export-source.config';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-export-template-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule,
    MatTableModule,
    MatSnackBarModule
  ],
  template: `
    <div class="h-full flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <!-- Top Actions Row -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Export Templates</h1>
          <p class="text-slate-400 text-[10px] md:text-xs font-semibold uppercase tracking-widest mt-0.5">Manage your Excel export configurations</p>
        </div>
        
        <button routerLink="new" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95 flex items-center space-x-2 font-bold text-sm">
           <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
           <span>New Template</span>
        </button>
      </div>

      <!-- Main Table Container -->
      <div class="card-stitch flex flex-col bg-white overflow-hidden min-h-[400px]">
        <div class="relative flex-1 overflow-auto custom-scrollbar">
          
          <div *ngIf="templateService.isLoading() && dataSource.data.length === 0" class="p-8 space-y-4">
            <div *ngFor="let i of [1,2,3,4]" class="h-12 rounded-xl skeleton"></div>
          </div>

          <div *ngIf="dataSource.data.length > 0 || !templateService.isLoading()" class="animate-in fade-in duration-500 flex-1 flex flex-col">
            

            <table mat-table [dataSource]="dataSource" class="table-stitch">
              
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>NAME</th>
                <td mat-cell *matCellDef="let row">
                  <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-900">{{row.name}}</span>
                    <span class="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{{row.description || 'No description'}}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Source Column -->
              <ng-container matColumnDef="source">
                <th mat-header-cell *matHeaderCellDef>SOURCE LIST</th>
                <td mat-cell *matCellDef="let row">
                  <span class="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {{ getSourceLabel(row.sourceList) }}
                  </span>
                </td>
              </ng-container>

              <!-- Columns Count Column -->
              <ng-container matColumnDef="columns">
                <th mat-header-cell *matHeaderCellDef class="text-left">COLS</th>
                <td mat-cell *matCellDef="let row" class="text-left">
                  <span class="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                    {{row.columns.length}}
                  </span>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef class="text-left">STATUS</th>
                <td mat-cell *matCellDef="let row" class="text-left">
                  <span [class]="row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'" 
                        class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                    {{row.isActive ? 'Active' : 'Inactive'}}
                  </span>
                </td>
              </ng-container>

              <!-- Date Column -->
              <ng-container matColumnDef="updatedAt">
                <th mat-header-cell *matHeaderCellDef>UPDATED AT</th>
                <td mat-cell *matCellDef="let row">
                  <span class="text-xs font-medium text-slate-500">{{ row.updatedAt | date:'dd/MM/yy HH:mm' }}</span>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="text-right"> </th>
                <td mat-cell *matCellDef="let row" class="text-right">
                  <div class="flex items-center justify-end space-x-1">
                    <button [routerLink]="[row.id, 'edit']" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-90" title="Edit">
                      <lucide-icon name="pencil" class="w-4 h-4"></lucide-icon>
                    </button>
                    <button (click)="confirmDelete(row)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90" title="Delete">
                      <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
                    </button>
                    <button [routerLink]="[row.id, 'edit']" class="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-90 group">
                      <lucide-icon name="chevron-right" class="w-5 h-5 group-hover:translate-x-0.5 transition-transform"></lucide-icon>
                    </button>
                  </div>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-slate-50/80 transition-all border-transparent"></tr>

              <tr class="mat-row bg-white" *matNoDataRow>
                <td class="px-6 py-24 text-center" colspan="6">
                  <div class="flex flex-col items-center">
                     <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                        <lucide-icon name="file-spreadsheet" class="w-10 h-10 text-slate-200" [strokeWidth]="1.5"></lucide-icon>
                     </div>
                     <h3 class="text-lg font-bold">No templates found</h3>
                     <p class="text-sm text-text-muted font-medium max-w-xs mx-auto mt-2">Create your first export template to start exporting data to Excel.</p>
                     <button routerLink="new" class="mt-8 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold active:scale-95 transition-all shadow-md">
                         Create Template
                     </button>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
  `]
})
export class ExportTemplateListComponent implements OnInit {
  public templateService = inject(ExportTemplateService);
  private snackBar = inject(MatSnackBar);
  private confirmService = inject(ConfirmService);

  displayedColumns: string[] = ['name', 'source', 'columns', 'status', 'updatedAt', 'actions'];
  dataSource = new MatTableDataSource<ExportTemplate>();

  ngOnInit() {
    this.templateService.loadTemplates().subscribe();
  }

  constructor() {
    effect(() => {
      this.dataSource.data = this.templateService.templates();
    });
  }

  getSourceLabel(key: string): string {
    return EXPORT_SOURCES.find(s => s.key === key)?.label || key;
  }

  confirmDelete(template: ExportTemplate) {
    this.confirmService.ask({
      title: 'Delete Template',
      message: `Are you sure you want to delete the template "${template.name}"? This action cannot be undone.`,
      confirmText: 'Delete Template',
      isDanger: true
    }).subscribe(confirmed => {
      if (confirmed) {
        this.templateService.deleteTemplate(template.id).subscribe({
          next: () => this.snackBar.open('Template deleted successfully', 'Close', { duration: 3000 }),
          error: () => this.snackBar.open('Error deleting template', 'Close', { duration: 3000 })
        });
      }
    });
  }
}
