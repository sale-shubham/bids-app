'use client';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatINR } from '@/lib/utils';

export const TOOLTIP = {
  contentStyle: { borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', fontSize: 12 },
  labelStyle: { color: 'hsl(var(--muted-foreground))' },
};
export const AXIS = { fontSize: 12, fill: 'hsl(var(--muted-foreground))' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 'YYYY-MM' -> "Mar 26". */
export function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  const i = Number(mo) - 1;
  return MONTHS[i] ? `${MONTHS[i]} ${y.slice(2)}` : m;
}

export function RevenueBarChart({ data }: { data: { month: string; paidPaise: number }[] }) {
  const rows = data.map((d) => ({ label: monthLabel(d.month), rupees: d.paidPaise / 100 }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} />
        <Tooltip {...TOOLTIP} formatter={(v) => [formatINR(Number(v) * 100), 'Commission paid']} />
        <Bar dataKey="rupees" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SignupsLineChart({ data }: { data: { month: string; members: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <Tooltip {...TOOLTIP} />
        <Line type="monotone" dataKey="members" name="Signups" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
