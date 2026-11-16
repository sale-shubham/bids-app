'use client';
import * as React from 'react';
import Link from 'next/link';
import { EllipsisVertical, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface RowAction {
  label: string;
  icon: LucideIcon;
  /** A link entry; otherwise `onSelect` runs. */
  href?: string;
  onSelect?: () => void;
  /** Red, for cancel / delete and their kin. */
  destructive?: boolean;
  /** Draws a line above this entry. */
  separated?: boolean;
  /** Greyed out, with `hint` beneath it saying why. */
  disabled?: boolean;
  hint?: string;
}

/**
 * A row's actions behind one ⋯ button, identical on a table row and a mobile
 * card. The caller filters the list (permissions, status); an empty list
 * renders nothing. Destructive entries should open a page-level
 * `<ConfirmDialog>`. `modal={false}` so a dialog opened from an entry is not
 * left under the menu's pointer lock. The trigger is named `Actions for <name>`.
 */
export function RowActionsMenu({ name, actions }: { name: string; actions: RowAction[] }) {
  if (actions.length === 0) return null;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label={`Actions for ${name}`}>
          <EllipsisVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((a, i) => {
          const Icon = a.icon;
          const tone = a.destructive ? 'text-destructive focus:text-destructive' : undefined;
          return (
            <React.Fragment key={a.label}>
              {a.separated && i > 0 && <DropdownMenuSeparator />}
              {a.href ? (
                <DropdownMenuItem asChild className={tone}>
                  <Link href={a.href}>
                    <Icon className="h-4 w-4" /> {a.label}
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={a.onSelect} disabled={a.disabled} className={tone}>
                  <Icon className="h-4 w-4" />
                  {a.hint ? (
                    <span className="flex flex-col">
                      {a.label}
                      <span className="text-xs font-normal text-muted-foreground">{a.hint}</span>
                    </span>
                  ) : (
                    a.label
                  )}
                </DropdownMenuItem>
              )}
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
