import * as React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-input-bg)] px-4 py-3 text-sm text-[color:var(--color-text)] outline-none ring-0 placeholder:text-[color:var(--color-muted)] focus:border-secondary',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
