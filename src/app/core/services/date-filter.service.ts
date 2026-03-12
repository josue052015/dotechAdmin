import { Injectable, signal, computed } from '@angular/core';

export type RangeType = 'all' | 'today' | 'week' | '7days' | 'month' | 'custom';

export interface DateRange {
  start: Date | null;
  end: Date | null;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class DateFilterService {
  public readonly activeRangeType = signal<RangeType>('all');
  private readonly customRange = signal<{ start: Date | null, end: Date | null }>({ start: null, end: null });

  public readonly currentRange = computed<DateRange>(() => {
    const type = this.activeRangeType();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    switch (type) {
      case 'all':
        return {
          start: null,
          end: null,
          label: 'All Time'
        };
      case 'today':
        return {
          start: today,
          end: endOfToday,
          label: 'Today'
        };
      case 'week': {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
        const monday = new Date(new Date(today).setDate(diff));
        const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));
        sunday.setHours(23, 59, 59, 999);
        return {
          start: monday,
          end: sunday,
          label: `This Week (${this.formatRange(monday, sunday)})`
        };
      }
      case '7days': {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        return {
          start: sevenDaysAgo,
          end: endOfToday,
          label: `Last 7 Days`
        };
      }
      case 'month': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        lastDay.setHours(23, 59, 59, 999);
        return {
          start: firstDay,
          end: lastDay,
          label: today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        };
      }
      case 'custom': {
        const custom = this.customRange();
        if (custom.start && custom.end) {
          return {
            start: custom.start,
            end: custom.end,
            label: this.formatRange(custom.start, custom.end)
          };
        }
        return { start: null, end: null, label: 'Select Date' };
      }
    }
  });

  setRangeType(type: RangeType) {
    this.activeRangeType.set(type);
  }

  setCustomRange(start: Date | null, end: Date | null) {
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    this.customRange.set({ start, end });
    this.activeRangeType.set('custom');
  }

  private formatRange(start: Date, end: Date): string {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  }
}
