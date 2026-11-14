import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Money is stored in paise (integer); show it as rupees, e.g. 125050 -> "₹1,250.50".
export function formatINR(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
}

// Fixed clock time ("11:40 am"), e.g. a bid timestamp. Stays the same as time passes.
export function formatMessageTime(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

// List-row timestamp: clock time for today, "Yesterday", else a real date.
export function formatListTime(date: string | Date) {
  const d = new Date(date);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return formatMessageTime(d);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return formatDate(d);
}
