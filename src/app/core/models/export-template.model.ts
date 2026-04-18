export interface ExportTemplateFlat {
  template_id: string;
  template_name: string;
  source_list: string;
  template_description?: string;
  is_active: string; // "TRUE" or "FALSE" as stored in Google Sheets
  column_order: number;
  source_column_key: string;
  source_column_label: string;
  excel_column_title: string;
  created_at: string;
  updated_at: string;
}

export interface ExportColumn {
  order: number;
  sourceColumnKey: string;
  sourceColumnLabel: string;
  excelColumnTitle: string;
}

export interface ExportTemplate {
  id: string;
  name: string;
  sourceList: string;
  description?: string;
  isActive: boolean;
  columns: ExportColumn[];
  createdAt: string;
  updatedAt: string;
}

export interface ExportSource {
  key: string;
  label: string;
  service: any; // Associated service instance (e.g. OrderService)
  columns: { key: string; label: string }[];
  defaultFileName: string;
}
