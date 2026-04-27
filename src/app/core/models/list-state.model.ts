import { ListQuery } from './list-query.model';

export type { ListQuery };

export interface LargeListState<T> {
  visibleRows: T[];
  totalLoaded: number;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  isFiltering: boolean;
  hasMore: boolean;
  query: ListQuery;
}
