import { resolveAssetUrl } from '../lib/assets';
import { cn } from '../lib/utils';

interface UserAvatarProps {
  name: string;
  src?: string;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-14 w-14 text-base',
  lg: 'h-20 w-20 text-xl',
} as const;

export const UserAvatar = ({ name, src, active = true, size = 'sm', className }: UserAvatarProps) => {
  const resolvedSrc = resolveAssetUrl(src);
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'U';

  return (
    <div className={cn('relative shrink-0', className)}>
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-full border border-white/12 bg-white/6 font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]',
          sizeMap[size],
        )}
      >
        {resolvedSrc ? <img src={resolvedSrc} alt={name} className="h-full w-full object-cover" /> : <span>{initials}</span>}
      </div>
      <span
        className={cn(
          'absolute bottom-0 right-0 rounded-full border-2 border-night',
          size === 'lg' ? 'h-4 w-4' : 'h-3 w-3',
          active ? 'bg-emerald-400' : 'bg-rose-400',
        )}
        aria-hidden="true"
      />
    </div>
  );
};
