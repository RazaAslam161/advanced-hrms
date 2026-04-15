import { cn } from '../lib/utils';
import { companyProfile } from '../lib/company';

export const BrandLogo = ({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) => (
  <div className={cn('flex items-center gap-3', className)}>
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/95 shadow-lg ring-1 ring-white/20">
      <img src={companyProfile.assets.icon} alt={`${companyProfile.legalName} icon`} className="h-8 w-8 object-contain" />
    </div>
    {!collapsed ? (
      <div className="overflow-hidden">
        <div className="inline-flex rounded-2xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-white/20">
          <img src={companyProfile.assets.logo} alt={companyProfile.legalName} className="h-10 w-auto object-contain" />
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-[0.35em] text-muted/90">People Operations OS</p>
      </div>
    ) : null}
  </div>
);
