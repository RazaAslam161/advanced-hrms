import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { playUiTone, type SoundKind } from '../../lib/sound';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white shadow-glow hover:bg-primary/90',
        secondary: 'bg-accent text-ink hover:bg-accent/90',
        ghost: 'bg-transparent text-white/80 hover:bg-white/10 hover:text-white',
        outline: 'border border-white/15 bg-white/5 text-white hover:bg-white/10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  soundTone?: SoundKind | 'none';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, soundTone = 'click', onClick, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(buttonVariants({ variant }), className)}
    onClick={(event) => {
      if (soundTone !== 'none' && !props.disabled) {
        playUiTone(soundTone);
      }
      onClick?.(event);
    }}
    {...props}
  />
));

Button.displayName = 'Button';
