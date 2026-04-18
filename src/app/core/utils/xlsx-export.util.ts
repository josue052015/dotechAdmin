import { ExportTemplate } from '../models/export-template.model';

declare var XLSX: any;

/**
 * Utility to export data to Excel based on a specific template configuration.
 */
export function exportToExcel(template: ExportTemplate, data: any[], fileName?: string) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Map data to rows using the template column definitions
  const rows = data.map(item => {
    const row: any = {};
    template.columns.forEach(col => {
      // Get value from item using the sourceColumnKey
      // Supports nested keys if needed: item[key] or item.key
      const value = item[col.sourceColumnKey] !== undefined ? item[col.sourceColumnKey] : '';
      row[col.excelColumnTitle] = value;
    });
    return row;
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Export');

  // Generate file name
  const date = new Date().toISOString().split('T')[0];
  const finalFileName = fileName || `${template.sourceList.replace(/_/g, '-')}-${template.name.replace(/\s+/g, '-')}-${date}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, finalFileName);
}
