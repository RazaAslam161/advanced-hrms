import * as React from 'react';
import { cn } from '../../lib/utils';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[120px] w-full rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-input-bg)] px-4 py-3 text-sm text-[color:var(--color-text)] outline-none placeholder:text-[color:var(--color-muted)] focus:border-secondary',
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
