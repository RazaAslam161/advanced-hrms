import type { ReactNode } from 'react';
import { Card } from './ui/card';
import { cn } from '../lib/utils';

type StatAccent = 'primary' | 'emerald' | 'amber' | 'sky';

const accentStyles: Record<StatAccent, string> = {
  primary: 'bg-primary/15 text-secondary',
  emerald: 'bg-emerald-500/15 text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-300',
  sky: 'bg-sky-500/15 text-sky-300',
};

export const StatCard = ({
  label,
  value,
  helper,
  icon,
  accent = 'primary',
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: ReactNode;
  accent?: StatAccent;
}) => (
  <Card className="p-4">
    <div className="flex items-start justify-between gap-3">
      <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] theme-muted">{label}</p>
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', accentStyles[accent])}>{icon}</span>
    </div>
    <p className="mt-3 text-2xl font-bold leading-tight text-[color:var(--color-heading)]">{value}</p>
    <p className="mt-1.5 line-clamp-2 text-xs leading-5 theme-muted">{helper}</p>
  </Card>
);
