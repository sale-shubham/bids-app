'use client';
import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Parsed/formatted as a plain calendar date (no time-of-day, no UTC shift) —
// "YYYY-MM-DD" in, "YYYY-MM-DD" out, so a date picked in any timezone stays
// the same calendar day. `new Date(y, m-1, d)` / date-fns `format(..., 'yyyy-MM-dd')`
// both operate on local Date fields, so this round-trips exactly.
function parseDateOnly(value?: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

export interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// react-day-picker `<Calendar>` inside a `<Popover>`, trigger button shows the
// formatted date — the shadcn "Date Picker" pattern. Emits/accepts a plain
// "YYYY-MM-DD" string (see parseDateOnly above) so callers (react-hook-form
// `Controller`s especially) can treat it exactly like a native
// `<input type="date">` value, just with a friendlier picker UI.
export function DatePicker({ value, onChange, label, required, error, placeholder = 'Pick a date', disabled, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseDateOnly(value);
  const id = React.useId();

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={id}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={!!error}
            className={cn(
              'w-full justify-start text-left font-normal',
              !selected && 'text-muted-foreground',
              error && 'border-destructive',
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            {selected ? format(selected, 'PPP') : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) onChange(format(date, 'yyyy-MM-dd'));
              setOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
