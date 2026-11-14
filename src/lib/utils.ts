import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
}

// Fixed clock time ("11:40 am") for an individual chat message bubble — a
// per-message stamp must not keep changing text as time passes (a transcript
// full of "5m ago" bubbles that silently become "1h ago" mid-read reads
// wrong; WhatsApp and every other DM UI show a fixed send-time per message
// instead). Use this inside a thread's message list.
export function formatMessageTime(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

// WhatsApp-style list-row timestamp ("last active" on a chat inbox row) —
// clock time for today, "Yesterday" for yesterday, a real date otherwise.
// Replaced an earlier "just now"/"5m ago" relative-time label (removed
// 2026-09-11): a vague, constantly-changing string was worse than a fixed
// time even on a list row, and it's what every real chat app actually shows
// here (WhatsApp's own chat list never says "5m ago").
export function formatListTime(date: string | Date) {
  const d = new Date(date);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return formatMessageTime(d);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return formatDate(d);
}
