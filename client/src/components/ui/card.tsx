import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'rounded-[1.75rem] border border-white/10 bg-white/6 p-5 text-white shadow-panel backdrop-blur',
      className,
    )}
    {...props}
  />
);
