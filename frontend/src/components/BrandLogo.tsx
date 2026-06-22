import { cn } from '../lib/utils';
import { companyProfile } from '../lib/company';

export const BrandLogo = ({
  collapsed = false,
  centered = false,
  className,
}: {
  collapsed?: boolean;
  centered?: boolean;
  className?: string;
}) => (
  <div className={cn('w-full min-w-0', centered && 'flex flex-col items-center', className)}>
    {collapsed ? (
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 shadow-lg ring-1 ring-white/20">
        <img src={companyProfile.assets.icon} alt={`${companyProfile.legalName} icon`} className="h-8 w-8 object-contain" />
      </div>
    ) : (
      <div
        className={cn(
          'w-full max-w-full overflow-hidden rounded-2xl bg-white/95 px-3 py-2.5 shadow-lg ring-1 ring-white/20',
          centered && 'mx-auto max-w-[280px]',
        )}
      >
        <img
          src={companyProfile.assets.logo}
          alt={companyProfile.legalName}
          className="block h-9 w-full max-w-full object-contain object-left"
        />
      </div>
    )}
  </div>
);
