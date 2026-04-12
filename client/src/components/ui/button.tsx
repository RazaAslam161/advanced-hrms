import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white shadow-glow hover:-translate-y-0.5 hover:bg-primary/90',
        secondary: 'bg-accent text-ink hover:-translate-y-0.5 hover:bg-accent/90',
        ghost: 'bg-transparent text-white/80 hover:bg-white/10 hover:text-white',
        outline: 'border border-white/15 bg-white/5 text-white hover:bg-white/10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />
));

Button.displayName = 'Button';
