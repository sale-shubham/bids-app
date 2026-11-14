'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
  /** Below `sm`, cells stretch to fill the container (shrinking/growing with
   * it) instead of a fixed width — for hosts with no narrow max-w wrapper of
   * their own (e.g. a wide form card). At `sm`+ this has no effect either way
   * — cells are always the fixed original size there. Default false keeps
   * login/signup's fixed-width-at-every-size look unchanged. */
  fill?: boolean;
}

// Boxed digit-per-cell OTP entry. Keeps a single string value (RHF-friendly via
// Controller) but renders `length` individual cells with auto-advance on type,
// auto-retreat on backspace (clearing a middle cell leaves the rest in place),
// and paste-splits-across-cells support.
export function OtpInput({ length = 6, value, onChange, disabled, error, autoFocus, fill }: OtpInputProps) {
  const cells = React.useRef<Array<HTMLInputElement | null>>([]);
  const toDigits = (code: string) => {
    const arr = code.split('').slice(0, length);
    while (arr.length < length) arr.push('');
    return arr;
  };

  // Per-cell digits live here, not only in `value`, so clearing a middle cell
  // leaves a gap instead of sliding the later digits left. `value` carries just
  // the digits before the first gap, so a code with a gap never reaches
  // `length` — parents treat `length` digits as a complete code.
  const [state, setState] = React.useState(() => ({ value, digits: toDigits(value) }));
  let digits = state.digits;
  if (value !== state.value) {
    // The parent changed the code itself (e.g. cleared it on resend): follow it.
    digits = toDigits(value);
    setState({ value, digits });
  }

  const update = (next: string[]) => {
    const gap = next.indexOf('');
    const code = (gap === -1 ? next : next.slice(0, gap)).join('');
    setState({ value: code, digits: next });
    onChange(code);
  };

  const setDigit = (index: number, digit: string) => {
    const next = [...digits];
    next[index] = digit;
    update(next);
  };

  // Replaces the whole code from the first cell, then focuses the next empty one.
  const fillCode = (text: string) => {
    const code = text.slice(0, length);
    update(toDigits(code));
    cells.current[Math.min(code.length, length - 1)]?.focus();
  };

  const handleChange = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, '');
    // Several digits in one input event is a paste that never fired onPaste —
    // mobile keyboards' clipboard suggestion and SMS one-time-code autofill
    // insert text this way. (A filled cell typed over can hold its old digit
    // beside the new one, so 2 digits there is still one keystroke.)
    if (typed.length > (digits[index] ? 2 : 1)) {
      fillCode(typed);
      return;
    }
    const digit = typed.slice(-1);
    setDigit(index, digit);
    if (digit && index < length - 1) cells.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      cells.current[index - 1]?.focus();
      setDigit(index - 1, '');
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (pasted) fillCode(pasted);
  };

  return (
    <div>
      <div className="flex justify-between gap-1.5 sm:gap-2">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              cells.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            // No maxLength={1}: it cut a multi-digit insert (see handleChange)
            // to its first digit before onChange ever saw the rest.
            value={digit}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            aria-invalid={!!error}
            aria-label={`Digit ${i + 1}`}
            // Selected on focus, so typing into a filled cell replaces its digit.
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={cn(
              // Smaller on narrow viewports so length:6 fits without overflow/scroll
              // inside a padded card (e.g. the GST OTP card on /businesses/new) —
              // widens back to the original fixed size at sm+ either way.
              'h-11 rounded-md border-2 border-input bg-background text-center text-lg font-semibold text-foreground shadow-soft outline-hidden transition-colors focus:border-primary sm:h-14 sm:w-12 sm:flex-none sm:text-xl',
              fill ? 'min-w-0 flex-1' : 'w-9',
              error && 'border-destructive',
            )}
          />
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
