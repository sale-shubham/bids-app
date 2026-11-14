'use client';
import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Searchable select. Same composition as the shadcn/Radix Select it replaced
// (Select > SelectTrigger > SelectValue, SelectContent > SelectItem), so call
// sites didn't change — but the dropdown is a Radix Popover with a search box
// on top that filters the options as you type (like MUI's Autocomplete).
//
// The option list is read from the SelectItem elements under SelectContent
// (through arrays, fragments and SelectGroup), not from mounted DOM, so the
// trigger can show the selected label while the dropdown is closed and on the
// very first render. That means a SelectItem must be written out under
// SelectContent — one hidden inside another component isn't seen.

type ItemInfo = { value: string; label: React.ReactNode; text: string; disabled: boolean };

type SelectContextValue = {
  value: string;
  disabled?: boolean;
  items: ItemInfo[];
  query: string;
  activeValue: string | null;
  listboxId: string;
  // Last way the trigger was used ('mouse' / 'touch' / 'pen' / 'keyboard').
  // On touch the search box isn't focused on open, so the phone keyboard
  // doesn't pop up over a short list nobody needs to search.
  setPointerType: (type: string) => void;
  getPointerType: () => string;
  openWith: (query: string) => void;
  search: (query: string) => void;
  select: (value: string) => void;
  setActiveValue: (value: string | null) => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext(component: string) {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error(`<${component}> must be used inside <Select>`);
  return ctx;
}

function textOf(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (React.isValidElement(node)) return textOf((node.props as { children?: React.ReactNode }).children);
  return '';
}

function matches(text: string, query: string) {
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

function firstMatch(items: ItemInfo[], query: string) {
  return items.find((i) => !i.disabled && matches(i.text, query))?.value ?? null;
}

// Values can hold any character; encodeURIComponent keeps the id free of
// whitespace so it stays a valid aria-activedescendant reference.
export function optionId(listboxId: string, value: string) {
  return `${listboxId}-${encodeURIComponent(value)}`;
}

// Scrolls only the listbox, never the page — scrollIntoView() would also
// scroll the window, and right after mount the popover may not be positioned.
export function revealOption(id: string) {
  const el = document.getElementById(id);
  const list = el?.closest<HTMLElement>('[role="listbox"]');
  if (!el || !list) return;
  if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
  else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) {
    list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
  }
}

// line-clamp is scoped to the first child (the value text) so it doesn't also
// squash the icon row appended after it. Shared with RemoteSelect.
export const selectTriggerClass =
  'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring disabled:opacity-50 [&>span:first-child]:line-clamp-1';

// The popover panel and option row classes, shared with RemoteSelect.
export const selectContentClass =
  'z-50 min-w-[max(var(--radix-popover-trigger-width),10rem)] max-w-(--radix-popover-content-available-width) overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md outline-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0';
export const selectItemClass =
  'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-hidden data-active:bg-accent data-active:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50';

// The × inside a trigger. Shared with RemoteSelect.
export function SelectClearControl({ onClear }: { onClear: () => void }) {
  // A real <button> can't go here: the trigger is itself a <button>, and
  // nesting one is invalid HTML that React flags on hydration. role + tabIndex
  // + a key handler give the same behaviour to pointer and keyboard users.
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="Clear selection"
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      // stopPropagation keeps the trigger's own click from opening the dropdown.
      onClick={(e) => {
        e.stopPropagation();
        onClear();
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        e.stopPropagation();
        onClear();
      }}
      className="rounded-sm p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-accent hover:opacity-100 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
    >
      <X className="h-3.5 w-3.5" />
    </span>
  );
}

export interface SelectTriggerProps extends React.ComponentPropsWithoutRef<'button'> {
  // Pass a handler to show a clear (×) control inside the trigger, pass
  // undefined to hide it. The call site gates on its own state:
  //   onClear={value ? () => setValue('') : undefined}
  //
  // Clearing means setting the Select's value to '', which falls back to the
  // placeholder.
  onClear?: () => void;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, onClear, onPointerDown, onKeyDown, ...props }, ref) => {
    const ctx = useSelectContext('SelectTrigger');
    const disabled = ctx.disabled || props.disabled;
    return (
      <PopoverPrimitive.Trigger
        ref={ref}
        role="combobox"
        aria-haspopup="listbox"
        className={cn(
          selectTriggerClass,
          className,
        )}
        {...props}
        disabled={disabled}
        onPointerDown={(e) => {
          onPointerDown?.(e);
          ctx.setPointerType(e.pointerType);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          ctx.setPointerType('keyboard');
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            ctx.openWith('');
          } else if (e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            // Typing on the closed trigger opens it and starts the search.
            e.preventDefault();
            ctx.openWith(e.key);
          }
        }}
      >
        {children}
        <span className="flex shrink-0 items-center gap-0.5 pl-1">
          {onClear && !disabled && <SelectClearControl onClear={onClear} />}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </span>
      </PopoverPrimitive.Trigger>
    );
  },
);
SelectTrigger.displayName = 'SelectTrigger';

interface SelectValueProps extends React.ComponentPropsWithoutRef<'span'> {
  placeholder?: React.ReactNode;
}

// Shows `children` when given (e.g. "Sort: Name"), else the selected item's
// label, else the placeholder — the placeholder also covers a value whose
// item isn't in the list yet (options still loading).
const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, placeholder, children, ...props }, ref) => {
    const ctx = useSelectContext('SelectValue');
    const selected = ctx.items.find((i) => i.value === ctx.value);
    return (
      <span ref={ref} className={cn('pointer-events-none', className)} {...props}>
        {ctx.value === '' ? placeholder : (children ?? selected?.label ?? placeholder)}
      </span>
    );
  },
);
SelectValue.displayName = 'SelectValue';

const SelectContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, children, align = 'start', sideOffset = 4, ...props }, ref) => {
  const ctx = useSelectContext('SelectContent');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const visible =ctx.items.filter((i) => matches(i.text, ctx.query));
  const enabled = visible.filter((i) => !i.disabled);

  const moveActive = (step: 1 | -1) => {
    if (!enabled.length) return;
    const index = enabled.findIndex((i) => i.value === ctx.activeValue);
    const next =
      index === -1
        ? enabled[step === 1 ? 0 : enabled.length - 1]
        : enabled[Math.min(Math.max(index + step, 0), enabled.length - 1)];
    ctx.setActiveValue(next.value);
    revealOption(optionId(ctx.listboxId, next.value));
  };

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(selectContentClass, className)}
        onOpenAutoFocus={(e) => {
          // Radix would focus the search box with its text selected, so a
          // second key typed right after the one that opened the dropdown
          // (see SelectTrigger) would replace it — put the caret at the end.
          // On touch, focus the panel instead so no on-screen keyboard opens.
          e.preventDefault();
          const input = inputRef.current;
          if (ctx.getPointerType() === 'touch' || !input) {
            (e.currentTarget as HTMLElement | null)?.focus({ preventScroll: true });
          } else {
            input.focus({ preventScroll: true });
            input.setSelectionRange(input.value.length, input.value.length);
          }
          if (ctx.activeValue !== null) revealOption(optionId(ctx.listboxId, ctx.activeValue));
        }}
        {...props}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            role="combobox"
            aria-label="Search options"
            aria-expanded
            aria-controls={ctx.listboxId}
            aria-autocomplete="list"
            aria-activedescendant={ctx.activeValue !== null ? optionId(ctx.listboxId, ctx.activeValue) : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder="Search..."
            value={ctx.query}
            onChange={(e) => ctx.search(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                moveActive(e.key === 'ArrowDown' ? 1 : -1);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (ctx.activeValue !== null) ctx.select(ctx.activeValue);
              }
            }}
            className="h-10 w-full min-w-0 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
          />
        </div>
        <div id={ctx.listboxId} role="listbox" className="relative max-h-72 overflow-y-auto p-1">
          {children}
          {!visible.length && <p className="py-6 text-center text-sm text-muted-foreground">No results found.</p>}
        </div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
});
SelectContent.displayName = 'SelectContent';

const SelectGroup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>((props, ref) => (
  <div ref={ref} role="group" {...props} />
));
SelectGroup.displayName = 'SelectGroup';

export interface SelectItemProps extends React.ComponentPropsWithoutRef<'div'> {
  value: string;
  disabled?: boolean;
  // Text the search matches against; defaults to the item's text content.
  textValue?: string;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, disabled = false, textValue, ...props }, ref) => {
    const ctx = useSelectContext('SelectItem');
    if (!matches(textValue ?? textOf(children), ctx.query)) return null;
    const selected = value === ctx.value;
    const active = value === ctx.activeValue;
    return (
      <div
        ref={ref}
        id={optionId(ctx.listboxId, value)}
        role="option"
        aria-selected={selected}
        aria-disabled={disabled || undefined}
        data-active={active ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        className={cn(selectItemClass, className)}
        {...props}
        onPointerMove={(e) => {
          props.onPointerMove?.(e);
          if (!disabled && !active) ctx.setActiveValue(value);
        }}
        onClick={(e) => {
          props.onClick?.(e);
          if (!disabled) ctx.select(value);
        }}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {selected && <Check className="h-4 w-4" />}
        </span>
        {children}
      </div>
    );
  },
);
SelectItem.displayName = 'SelectItem';

function collectItems(node: React.ReactNode, out: ItemInfo[] = []): ItemInfo[] {
  React.Children.forEach(node, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === SelectItem) {
      const p = child.props as SelectItemProps;
      out.push({ value: p.value, label: p.children, text: p.textValue ?? textOf(p.children), disabled: !!p.disabled });
      return;
    }
    collectItems((child.props as { children?: React.ReactNode }).children, out);
  });
  return out;
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

function Select({ value: valueProp, defaultValue = '', onValueChange, disabled, children }: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const value = valueProp ?? uncontrolledValue;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [activeValue, setActiveValue] = React.useState<string | null>(null);
  const pointerTypeRef = React.useRef('');
  const setPointerType = (type: string) => {
    pointerTypeRef.current = type;
  };
  const getPointerType = () => pointerTypeRef.current;
  const listboxId = React.useId();
  const items = collectItems(children);

  // The query is reset on open, not on close, so the list doesn't jump back
  // to every option while the closing animation is still on screen.
  const openWith = (initialQuery: string) => {
    setQuery(initialQuery);
    setActiveValue(
      initialQuery
        ? firstMatch(items, initialQuery)
        : items.some((i) => i.value === value && !i.disabled)
          ? value
          : null,
    );
    setOpen(true);
  };

  const search = (next: string) => {
    setQuery(next);
    setActiveValue(firstMatch(items, next));
  };

  // Like Radix, re-picking the current value doesn't fire onValueChange.
  const select = (next: string) => {
    if (next !== value) {
      if (valueProp === undefined) setUncontrolledValue(next);
      onValueChange?.(next);
    }
    setOpen(false);
  };

  return (
    <SelectContext
      value={{ value, disabled, items, query, activeValue, listboxId, setPointerType, getPointerType, openWith, search, select, setActiveValue }}
    >
      {/* modal: locks page scroll and outside clicks like Radix Select did,
          and lets the list scroll with the wheel inside a modal Dialog
          (a non-modal popover there is blocked by the Dialog's scroll lock). */}
      <PopoverPrimitive.Root open={open} onOpenChange={(next) => (next ? openWith('') : setOpen(false))} modal>
        {children}
      </PopoverPrimitive.Root>
    </SelectContext>
  );
}

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };
