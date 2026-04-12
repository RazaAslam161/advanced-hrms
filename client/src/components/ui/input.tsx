import * as React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-white/35 focus:border-secondary focus:bg-white/10',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
