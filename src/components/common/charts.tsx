'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, Tooltip, LineChart, Line } from 'recharts';

const PALETTE = ['hsl(142 71% 41%)', 'hsl(35 92% 50%)', 'hsl(0 72% 51%)', 'hsl(215 16% 60%)', 'hsl(221 83% 53%)'];

export interface DonutSlice {
  name: string;
  value: number;
  color?: string;
}

export function DonutChart({ data, size = 180 }: { data: DonutSlice[]; size?: number }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="relative" style={{ height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={size * 0.32} outerRadius={size * 0.46} paddingAngle={2} stroke="none">
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tnum">{total.toLocaleString('en-IN')}</span>
        <span className="text-xs text-muted-foreground">Total</span>
      </div>
    </div>
  );
}

export function Sparkline({ data, color = 'hsl(var(--primary))', height = 40 }: { data: number[]; color?: string; height?: number }) {
  const series = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={series} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#spark)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({ data, height = 200 }: { data: { label: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, bottom: 0, left: 0, right: 8 }}>
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', fontSize: 12 }}
          labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
        />
        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export { PALETTE };
