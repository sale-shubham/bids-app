'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormInputProps extends InputProps {
  label?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  /** Leading icon rendered inside the field (e.g. a phone icon on a mobile-number input). */
  icon?: React.ReactNode;
  /** Leading display-only text next to `icon` (e.g. "+91"). Not part of the field value. */
  prefix?: string;
}

// RHF-friendly labelled input with error + hint. Pass register() spread as props.
// type="password" renders a show/hide eye toggle.
export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, required, hint, className, id, type, icon, prefix, ...props }, ref) => {
    // Generated fallback so the <Label> is always tied to the field, even for
    // controlled inputs that pass neither `id` nor `name` (e.g. the listing
    // form's Quantity) — otherwise screen readers announce an unnamed field.
    const generatedId = React.useId();
    const inputId = id ?? props.name ?? generatedId;
    const isPassword = type === 'password';
    const [show, setShow] = React.useState(false);
    const inputType = isPassword ? (show ? 'text' : 'password') : type;
    return (
      <div className="space-y-1.5">
        {label && (
          <Label htmlFor={inputId}>
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
        )}
        <div className="relative">
          {(icon || prefix) && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center gap-1.5 text-muted-foreground">
              {icon}
              {prefix && <span className="text-sm font-medium text-foreground">{prefix}</span>}
            </span>
          )}
          <Input
            id={inputId}
            ref={ref}
            type={inputType}
            aria-invalid={!!error}
            className={cn(icon && prefix ? 'pl-16' : icon || prefix ? 'pl-10' : undefined, isPassword && 'pr-10', className)}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    );
  },
);
FormInput.displayName = 'FormInput';
