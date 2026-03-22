"use client";

import { zhCN } from 'date-fns/locale';
import { CalendarRange, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { formatDateRangeLabel } from '@/lib/date-range';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DateRangeFilterProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  title?: string;
  description?: string;
  align?: 'start' | 'center' | 'end';
  className?: string;
  triggerClassName?: string;
}

export function DateRangeFilter({
  value,
  onChange,
  title = '发布日期范围',
  description = '选择从哪天到哪天，列表会按发布时间即时筛选。',
  align = 'end',
  className,
  triggerClassName,
}: DateRangeFilterProps) {
  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-12 min-w-[16rem] justify-between rounded-full border-border/70 bg-background/70 px-4 text-left text-sm hover:bg-accent/60",
              triggerClassName
            )}
          >
            <span className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" />
              <span className={value?.from ? 'text-foreground' : 'text-muted-foreground'}>
                {formatDateRangeLabel(value)}
              </span>
            </span>
            {value?.from ? (
              <span className="rounded-full bg-primary/12 px-2 py-1 text-[11px] text-primary">
                已筛选
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">发布日期</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align={align} className="w-[22rem] overflow-hidden">
          <div className="border-b border-border/70 px-4 py-3">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>

          <Calendar
            mode="range"
            locale={zhCN}
            selected={value}
            onSelect={onChange}
            numberOfMonths={1}
            defaultMonth={value?.from}
            className="bg-card/95"
          />

          <div className="flex items-center justify-between border-t border-border/70 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {value?.from ? '包含起止当天' : '未设置日期筛选'}
            </p>
            {value?.from ? (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => onChange(undefined)}
              >
                <X className="h-4 w-4" />
                清除
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
