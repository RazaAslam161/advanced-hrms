import * as React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-white/10 bg-[rgba(255,255,255,0.055)] px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-white/35 focus:border-secondary focus:bg-[rgba(255,255,255,0.08)]',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
