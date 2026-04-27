export interface ListQuery {
  search?: string;
  filters?: Record<string, any>;
  columnFilters?: Record<string, {
    operator: 'eq' | 'neq';
    values: string[];
  }>;
  dateRange?: {
    start?: number | null;
    end?: number | null;
  };
  sort?: {
    active: string;
    direction: 'asc' | 'desc' | '';
  };
}
