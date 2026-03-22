import { endOfDay, format, startOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

export function matchesDateRange(value: string, range: DateRange | undefined) {
  if (!range?.from) {
    return true;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }

  const start = startOfDay(range.from).getTime();
  const end = endOfDay(range.to ?? range.from).getTime();

  return timestamp >= start && timestamp <= end;
}

export function formatDateRangeLabel(range: DateRange | undefined) {
  if (!range?.from) {
    return '选择日期范围';
  }

  const from = format(range.from, 'MM/dd', { locale: zhCN });

  if (!range.to) {
    return `${from} - 至今`;
  }

  return `${from} - ${format(range.to, 'MM/dd', { locale: zhCN })}`;
}

export function toDateRangeQuery(range: DateRange | undefined) {
  if (!range?.from) {
    return {};
  }

  return {
    startDate: startOfDay(range.from).toISOString(),
    endDate: endOfDay(range.to ?? range.from).toISOString(),
  };
}
