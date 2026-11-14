'use client';
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// react-day-picker v10 — classNames keys come from its own UI enum
// (`getDefaultClassNames()`), merged with this project's token-based styling
// instead of the library's bundled CSS (no `react-day-picker/style.css`
// import anywhere — matches hard rule 7, semantic Tailwind classes only).
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const defaults = getDefaultClassNames();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        // `Nav` renders as a direct child of `Months` (sibling of `Month`).
        // `relative` must go on `months`, not `root` — `root` carries the
        // `p-3` padding, and an absolutely-positioned child's containing
        // block is its ancestor's *padding box*, so `inset-x-0` on nav would
        // ignore that padding and flush the arrows to root's outer corners.
        // `months` has no padding, so `inset-x-0` insets correctly, right at
        // the month caption row.
        root: cn(defaults.root, 'w-fit'),
        months: cn(defaults.months, 'relative flex flex-col gap-4 sm:flex-row'),
        month: cn(defaults.month, 'flex flex-col gap-4'),
        month_caption: cn(defaults.month_caption, 'flex h-7 items-center justify-center'),
        caption_label: cn(defaults.caption_label, 'text-sm font-medium'),
        nav: cn(defaults.nav, 'absolute inset-x-0 top-0 flex h-7 items-center justify-between'),
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 text-muted-foreground opacity-70 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 text-muted-foreground opacity-70 hover:opacity-100',
        ),
        month_grid: cn(defaults.month_grid, 'w-full border-collapse'),
        weekdays: cn(defaults.weekdays, 'flex'),
        weekday: cn(defaults.weekday, 'w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground'),
        week: cn(defaults.week, 'mt-2 flex w-full'),
        day: cn(defaults.day, 'relative h-9 w-9 p-0 text-center text-sm'),
        day_button: cn(
          defaults.day_button,
          'h-9 w-9 rounded-md p-0 font-normal transition-colors hover:bg-accent hover:text-accent-foreground',
        ),
        range_start: cn(defaults.range_start, 'rounded-l-md'),
        range_end: cn(defaults.range_end, 'rounded-r-md'),
        selected: cn(
          defaults.selected,
          '[&>button]:bg-primary [&>button]:text-primary-foreground hover:[&>button]:bg-primary hover:[&>button]:text-primary-foreground',
        ),
        today: cn(defaults.today, '[&>button]:bg-accent [&>button]:text-accent-foreground'),
        outside: cn(defaults.outside, 'text-muted-foreground opacity-50'),
        disabled: cn(defaults.disabled, 'text-muted-foreground opacity-50'),
        hidden: cn(defaults.hidden, 'invisible'),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" {...chevronProps} />
          ) : (
            <ChevronRight className="h-4 w-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
