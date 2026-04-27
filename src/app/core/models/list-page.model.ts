export interface ListChunk<T> {
  rows: T[];
  startRow: number;
  endRow: number;
  hasMore: boolean;
  totalLoaded: number;
  estimatedTotal?: number;
}

export interface ListPage<T> {
  data: T[];
  total: number;
  pageIndex: number;
  pageSize: number;
}
