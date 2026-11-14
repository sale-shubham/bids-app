'use client';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Icon-only action button (View/Edit/Delete/...) with a styled hover tooltip —
// replaces the native `title` attribute, which the browser renders unstyled.
// `label` is also the button's aria-label: the tooltip only exists on hover,
// so without it screen readers (and getByRole lookups) see an unnamed button.
export function TooltipIconButton({ label, ...props }: ButtonProps & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button aria-label={label} {...props} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
