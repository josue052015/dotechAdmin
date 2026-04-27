/// <reference lib="webworker" />

addEventListener('message', ({ data }) => {
  const { records, query, sheetName } = data;
  
  if (!records || !query) {
    postMessage({ filtered: [], sheetName });
    return;
  }

  let filtered = [...records];

  // 1. Search Filter (Global text search)
  if (query.search) {
    const term = query.search.toLowerCase();
    filtered = filtered.filter(r => {
      // Check normalized search text if exists, or join all values
      const content = r._searchText || Object.values(r).join(' ').toLowerCase();
      return content.includes(term);
    });
  }

  // 2. Column Filters
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

  // 3. Date Range Filter
  if (query.dateRange && (query.dateRange.start || query.dateRange.end)) {
    filtered = filtered.filter(r => {
      const time = r._dateTime || (r.date ? new Date(r.date).getTime() : 0);
      if (query.dateRange.start && time < query.dateRange.start) return false;
      if (query.dateRange.end && time > query.dateRange.end) return false;
      return true;
    });
  }

  // 4. Sorting
  const active = query.sort?.active || '_rowNumber';
  const direction = query.sort?.direction || 'desc';

  filtered.sort((a, b) => {
    let valA = a[active];
    let valB = b[active];

    // Handle numbers
    if (typeof valA === 'number' && typeof valB === 'number') {
      return direction === 'asc' ? valA - valB : valB - valA;
    }

    // Handle strings
    valA = (valA || '').toString().toLowerCase();
    valB = (valB || '').toString().toLowerCase();
    
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  postMessage({ filtered, sheetName });
});
