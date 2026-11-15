'use client';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import { AXIS, TOOLTIP } from '@/features/admin/components/admin-charts';

interface DailyPoint {
  date: string;
  views: number;
  bids: number;
}

/** 'YYYY-MM-DD' -> "5 Nov". */
export function dayLabel(date: string) {
  try {
    return format(parseISO(date), 'd MMM');
  } catch {
    return date;
  }
}

/** Views and bids per day (same chart style as the admin dashboard). */
export function DailyChart({ data }: { data: DailyPoint[] }) {
  const rows = data.map((d) => ({ ...d, label: dayLabel(d.date) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <Tooltip {...TOOLTIP} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="views" name="Views" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="bids" name="Bids" stroke="hsl(var(--warning))" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
