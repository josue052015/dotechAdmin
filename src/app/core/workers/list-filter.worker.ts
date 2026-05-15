/// <reference lib="webworker" />

/// <reference lib="webworker" />

let internalRecords: any[] = [];
let recordsMap = new Map<string, any>();

addEventListener('message', ({ data }) => {
  const { type, records, query, sheetName, queryVersion } = data;
  
  switch (type) {
    case 'SET_RECORDS':
      if (!sheetName) break;
      recordsMap.set(sheetName, [...records]);
      self.postMessage({ sheetName, totalCount: records.length });
      break;

    case 'ADD_RECORDS':
      if (!sheetName) break;
      const existing = (recordsMap.get(sheetName) || []);
      const updated = [...existing, ...records];
      recordsMap.set(sheetName, updated);
      self.postMessage({ sheetName, totalCount: updated.length });
      break;

    case 'APPLY_QUERY':
      if (!sheetName) break;
      processQuery(query, sheetName, queryVersion);
      break;
  }
});

function processQuery(query: any, sheetName: string, queryVersion: number) {
  const records = recordsMap.get(sheetName) || [];
  let filtered = records.filter(r => r.isDeleted !== true);

  // 1. Search Filter
  if (query.search) {
    const term = query.search.toLowerCase();
    filtered = filtered.filter(r => {
      const content = r._searchText || Object.values(r).join(' ').toLowerCase();
      return content.includes(term);
    });
  }

  // 2. Simple Filters
  if (query.filters) {
    Object.entries(query.filters).forEach(([col, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        const filterVal = val.toString().toLowerCase();
        filtered = filtered.filter(r => {
          const rowVal = (r[col] !== undefined && r[col] !== null) ? r[col].toString().toLowerCase() : '';
          return rowVal === filterVal;
        });
      }
    });
  }

  // 3. Column Filters
  if (query.columnFilters) {
    Object.entries(query.columnFilters).forEach(([col, filter]: [string, any]) => {
      if (filter.values && filter.values.length > 0) {
        filtered = filtered.filter(r => {
          const val = (r[col] !== undefined && r[col] !== null) ? r[col].toString() : '';
          const match = filter.values.includes(val);
          return filter.operator === 'eq' ? match : !match;
        });
      }
    });
  }

  // 4. Date Range
  if (query.dateRange && (query.dateRange.start || query.dateRange.end)) {
    filtered = filtered.filter(r => {
      const time = r._dateTime || (r.date ? new Date(r.date).getTime() : 0);
      if (query.dateRange.start && time < query.dateRange.start) return false;
      if (query.dateRange.end && time > query.dateRange.end) return false;
      return true;
    });
  }

  const totalCount = filtered.length;

  // 5. Sorting
  const active = query.sort?.active || '_rowNumber';
  const direction = query.sort?.direction || 'desc';

  filtered.sort((a, b) => {
    let valA = a[active];
    let valB = b[active];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return direction === 'asc' ? valA - valB : valB - valA;
    }
    valA = (valA || '').toString().toLowerCase();
    valB = (valB || '').toString().toLowerCase();
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Return only a manageable chunk to the main thread
  // For 1 million records, we only need the first few hundred for the initial view
  postMessage({ 
    filtered: filtered.slice(0, 500), 
    totalCount, 
    sheetName, 
    queryVersion 
  });
}
