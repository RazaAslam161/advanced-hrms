import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export const Badge = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-subtle-bg)] px-3 py-1 text-xs font-semibold text-secondary',
      className,
    )}
    {...props}
  />
);
