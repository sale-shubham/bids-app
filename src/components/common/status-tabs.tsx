'use client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

/** Status tab bar bound to a URL param. */
export function StatusTabs({
  value,
  tabs,
  onChange,
}: {
  value: string;
  tabs: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList>
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
