import { Injectable, inject, signal, effect, untracked } from '@angular/core';
import { GoogleSheetsService } from './google-sheets.service';
import { ExportTemplate, ExportTemplateFlat, ExportColumn } from '../models/export-template.model';
import { Observable, map, tap, of, forkJoin, switchMap, catchError } from 'rxjs';
import { GoogleAuthService } from './google-auth.service';

@Injectable({
  providedIn: 'root'
})
export class ExportTemplateService {
  private sheetsService = inject(GoogleSheetsService);
  private auth = inject(GoogleAuthService);
  private readonly SHEET_NAME = 'export_templates';

  public templates = signal<ExportTemplate[]>([], { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
  public isLoading = signal<boolean>(false);

  constructor() {
    effect(() => {
      if (this.auth.isAuthorized()) {
        untracked(() => this.loadTemplates());
      } else {
        untracked(() => this.templates.set([]));
      }
    });
  }

  public loadTemplates(quiet: boolean = false): Observable<any> {
    if (!this.auth.isAuthorized()) return of(null);
    if (!quiet) this.isLoading.set(true);

    return this.sheetsService.readRange(`${this.SHEET_NAME}!A2:K`).pipe(
      tap((response) => {
        const rows = response.values || [];
        const flats: ExportTemplateFlat[] = rows.map((row: any[]) => ({
          template_id: row[0],
          template_name: row[1],
          source_list: row[2],
          template_description: row[3],
          is_active: row[4],
          column_order: parseInt(row[5]) || 0,
          source_column_key: row[6],
          source_column_label: row[7],
          excel_column_title: row[8],
          created_at: row[9],
          updated_at: row[10]
        }));

        this.templates.set(this.groupTemplates(flats));
        this.isLoading.set(false);
      }),
      catchError((err: any) => {
        console.error('Error loading export templates', err);
        this.isLoading.set(false);
        return of(null);
      })
    );
  }

  private groupTemplates(flats: ExportTemplateFlat[]): ExportTemplate[] {
    const grouped = new Map<string, ExportTemplate>();

    flats.forEach(flat => {
      if (!flat.template_id) return;

      if (!grouped.has(flat.template_id)) {
        grouped.set(flat.template_id, {
          id: flat.template_id,
          name: flat.template_name,
          sourceList: flat.source_list,
          description: flat.template_description,
          isActive: flat.is_active === 'TRUE',
          createdAt: flat.created_at,
          updatedAt: flat.updated_at,
          columns: []
        });
      }

      const template = grouped.get(flat.template_id)!;
      template.columns.push({
        order: flat.column_order,
        sourceColumnKey: flat.source_column_key,
        sourceColumnLabel: flat.source_column_label,
        excelColumnTitle: flat.excel_column_title
      });
    });

    // Sort columns by order
    grouped.forEach(template => {
      template.columns.sort((a, b) => a.order - b.order);
    });

    return Array.from(grouped.values());
  }

  public saveTemplate(template: ExportTemplate): Observable<any> {
    const isNew = !template.id;
    const templateId = template.id || this.generateId();
    const now = new Date().toISOString();
    const createdAt = template.createdAt || now;

    const flats: any[][] = template.columns.map((col: ExportColumn) => [
      templateId,
      template.name,
      template.sourceList,
      template.description || '',
      template.isActive ? 'TRUE' : 'FALSE',
      col.order,
      col.sourceColumnKey,
      col.sourceColumnLabel,
      col.excelColumnTitle,
      createdAt,
      now
    ]);

    if (isNew) {
      return this.sheetsService.appendRow(`${this.SHEET_NAME}!A:K`, flats).pipe(
        tap(() => this.loadTemplates())
      );
    } else {
      // For updates, we clear existing rows for this template and append new ones
      // This is simpler and more robust than finding and updating specific rows
      return this.deleteRowsByTemplateId(templateId).pipe(
        tap(() => console.log('Deleted old rows for', templateId)),
        switchMap(() => this.sheetsService.appendRow(`${this.SHEET_NAME}!A:K`, flats)),
        tap(() => this.loadTemplates())
      );
    }
  }

  private deleteRowsByTemplateId(templateId: string): Observable<any> {
    // We need to read all rows first to find which ones to clear
    return this.sheetsService.readRange(`${this.SHEET_NAME}!A:A`).pipe(
      map(response => {
        const rows = response.values || [];
        const rowIndices = rows
          .map((row: any[], index: number) => row[0] === templateId ? index + 1 : -1)
          .filter((idx: number) => idx !== -1);
        
        return rowIndices;
      }),
      switchMap(indices => {
        if (indices.length === 0) return of(null);
        
        // We clear each row. Google Sheets API range clear is better than deleting rows for this pattern.
        // Actually, clearing might leave empty rows in the middle. 
        // But since we always append, it might not be an issue if we handle empty rows in read.
        // A better way would be to sort or filter out empty rows during read (which we already do).
        const clearOps = indices.map((idx: number) => this.sheetsService.clearRange(`${this.SHEET_NAME}!A${idx}:K${idx}`));
        return forkJoin(clearOps);
      })
    );
  }

  public deleteTemplate(templateId: string): Observable<any> {
    return this.deleteRowsByTemplateId(templateId).pipe(
      tap(() => this.loadTemplates())
    );
  }

  private generateId(): string {
    return 'tpl_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  public getTemplatesBySource(sourceKey: string): ExportTemplate[] {
    return this.templates().filter((t: ExportTemplate) => t.sourceList === sourceKey && t.isActive);
  }
}
