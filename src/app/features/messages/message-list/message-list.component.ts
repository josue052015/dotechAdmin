import { Component, OnInit, inject, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MessageService } from '../../../core/services/message.service';
import { MessageTemplate } from '../../../core/models/message.model';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatTableModule,
    MatPaginatorModule, MatSortModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule
  ],
  template: `
    <div class="h-full flex flex-col">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">WhatsApp Templates</h1>
        <button mat-flat-button color="primary" (click)="openForm()">
          <mat-icon>add</mat-icon> New Template
        </button>
      </div>

      <!-- Add/Edit Form -->
      <div *ngIf="showForm" class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 transition-all">
        <h2 class="text-xl font-semibold mb-2">{{ isEditing ? 'Edit Template' : 'New Template' }}</h2>
        <p class="text-sm text-gray-500 mb-4">You can use variables: <code>{{'{{FullName}}'}}</code>, <code>{{'{{ProductName}}'}}</code>, <code>{{'{{Price}}'}}</code>, <code>{{'{{Status}}'}}</code>, <code>{{'{{City}}'}}</code></p>
        
        <form [formGroup]="templateForm" (ngSubmit)="saveTemplate()" class="flex flex-col gap-4">
          
          <mat-form-field appearance="outline" class="w-full md:w-1/2">
            <mat-label>Template Name</mat-label>
            <input matInput formControlName="name" placeholder="e.g. Order Confirmation">
            <mat-error *ngIf="templateForm.get('name')?.hasError('required')">Name is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Message Text</mat-label>
            <textarea matInput rows="4" formControlName="text" placeholder="Hello {{'{{FullName}}'}}..."></textarea>
            <mat-error *ngIf="templateForm.get('text')?.hasError('required')">Message text is required</mat-error>
          </mat-form-field>

          <div class="flex gap-2 justify-end">
            <button mat-button type="button" (click)="closeForm()">Cancel</button>
            <button mat-flat-button color="primary" type="submit" [disabled]="templateForm.invalid || isSaving">
              <mat-spinner diameter="20" *ngIf="isSaving" class="mr-2 inline"></mat-spinner>
              {{ isEditing ? 'Update Template' : 'Save Template' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Search and Table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col overflow-hidden">
        
        <div class="p-4 border-b border-gray-100 flex gap-4">
          <mat-form-field appearance="outline" class="w-full md:w-1/3 !mb-[-1.25em]">
            <mat-label>Search Templates</mat-label>
            <mat-icon matPrefix class="text-gray-400">search</mat-icon>
            <input matInput (keyup)="applyFilter($event)" placeholder="Search by name or content..." #input>
          </mat-form-field>
        </div>

        <div class="relative flex-1 overflow-auto">
          <div *ngIf="messageService.isLoading()" class="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <mat-spinner diameter="40"></mat-spinner>
          </div>

          <table mat-table [dataSource]="dataSource" matSort class="w-full">
            
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="!font-bold !text-gray-700 w-1/4"> Name </th>
              <td mat-cell *matCellDef="let row" class="font-medium text-gray-900"> {{row.name}} </td>
            </ng-container>

            <ng-container matColumnDef="text">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="!font-bold !text-gray-700"> Content </th>
              <td mat-cell *matCellDef="let row" class="text-gray-600 truncate max-w-xs" [matTooltip]="row.text"> 
                {{row.text.length > 80 ? (row.text | slice:0:80) + '...' : row.text}} 
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="!font-bold !text-gray-700 w-24 text-right"> Actions </th>
              <td mat-cell *matCellDef="let row" class="text-right">
                <button mat-icon-button color="primary" (click)="editTemplate(row)" matTooltip="Edit">
                  <mat-icon>edit</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns" class="bg-gray-50 border-b border-gray-200"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-blue-50/30 transition-colors"></tr>

            <!-- Row shown when there is no matching data. -->
            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell p-8 text-center text-gray-500" colspan="3">
                <mat-icon class="!w-12 !h-12 !text-5xl mx-auto mb-4 text-gray-300">chat</mat-icon>
                <p>No templates found matching "{{input.value}}"</p>
              </td>
            </tr>
          </table>
        </div>

        <mat-paginator [pageSizeOptions]="[10, 25, 100]" aria-label="Select page of templates" class="border-t border-gray-100"></mat-paginator>
      </div>

    </div>
  `,
  styles: [`
    .mat-mdc-table {
      background: transparent !important;
    }
  `]
})
export class MessageListComponent implements OnInit {
  public messageService = inject(MessageService);
  private fb = inject(FormBuilder);

  displayedColumns: string[] = ['name', 'text', 'actions'];
  dataSource: MatTableDataSource<MessageTemplate> = new MatTableDataSource();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  showForm = false;
  isEditing = false;
  isSaving = false;
  currentRowNumber: number | null = null;

  templateForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    text: ['', Validators.required],
    id: ['']
  });

  constructor() {
    effect(() => {
      const data = this.messageService.templates();
      this.dataSource.data = data;
    });
  }

  ngOnInit() {
    this.messageService.loadTemplates();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openForm() {
    this.templateForm.reset();
    this.isEditing = false;
    this.currentRowNumber = null;
    this.showForm = true;
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
}
