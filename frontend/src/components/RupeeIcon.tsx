import { cn } from '../lib/utils';

export const RupeeIcon = ({ className }: { className?: string }) => (
  <span className={cn('inline-flex items-center justify-center font-bold leading-none', className)} aria-hidden="true">
    ₨
  </span>
);
