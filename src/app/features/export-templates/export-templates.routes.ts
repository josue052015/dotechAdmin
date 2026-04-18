import { Routes } from '@angular/router';

export const EXPORT_TEMPLATES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./export-template-list/export-template-list.component').then(m => m.ExportTemplateListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./export-template-form/export-template-form.component').then(m => m.ExportTemplateFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./export-template-form/export-template-form.component').then(m => m.ExportTemplateFormComponent)
  }
];
