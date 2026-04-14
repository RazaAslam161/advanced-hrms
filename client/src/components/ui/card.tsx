import type { HTMLAttributes, MouseEvent } from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

const supportsInteractiveTilt = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer:fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const Card = ({ className, interactive = true, onMouseMove, onMouseLeave, style, ...props }: CardProps) => (
  <div
    className={cn(
      'rounded-[1.35rem] border border-white/10 bg-[rgba(255,255,255,0.045)] p-5 text-white shadow-panel backdrop-blur-sm',
      interactive ? 'surface-3d' : null,
      className,
    )}
    style={
      interactive
        ? ({
            '--card-rotate-x': '0deg',
            '--card-rotate-y': '0deg',
            ...style,
          } as React.CSSProperties)
        : style
    }
    onMouseMove={(event: MouseEvent<HTMLDivElement>) => {
      if (interactive && supportsInteractiveTilt()) {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const rotateY = (x - 0.5) * 7;
        const rotateX = (0.5 - y) * 7;
        event.currentTarget.dataset.tilting = 'true';
        event.currentTarget.style.setProperty('--card-rotate-x', `${rotateX.toFixed(2)}deg`);
        event.currentTarget.style.setProperty('--card-rotate-y', `${rotateY.toFixed(2)}deg`);
      }
      onMouseMove?.(event);
    }}
    onMouseLeave={(event: MouseEvent<HTMLDivElement>) => {
      if (interactive) {
        event.currentTarget.dataset.tilting = 'false';
        event.currentTarget.style.setProperty('--card-rotate-x', '0deg');
        event.currentTarget.style.setProperty('--card-rotate-y', '0deg');
      }
      onMouseLeave?.(event);
    }}
    {...props}
  />
);
