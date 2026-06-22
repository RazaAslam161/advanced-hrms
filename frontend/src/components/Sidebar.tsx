import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { companyProfile } from '../lib/company';
import type { PortalConfig } from '../lib/constants';
import { getPortalNavItems } from '../lib/constants';
import { cn } from '../lib/utils';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { BrandLogo } from './BrandLogo';
import { DeveloperSignature } from './DeveloperSignature';
import { Button } from './ui/button';

export const Sidebar = ({ portal }: { portal: PortalConfig }) => {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const user = useAuthStore((state) => state.user);
  const navItems = getPortalNavItems(user);

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen overflow-hidden border-r border-[color:var(--color-card-border)] bg-[color:var(--color-card-bg)] px-4 py-6 text-[color:var(--color-text)] backdrop-blur-sm lg:block',
        sidebarOpen ? 'w-72' : 'w-24',
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-8 space-y-4">
          <div className="w-full min-w-0">
            <BrandLogo collapsed={!sidebarOpen} />
          </div>
          {sidebarOpen ? <p className="text-xs uppercase tracking-[0.26em] theme-muted">{portal.label}</p> : null}
          <Button
            variant="outline"
            className={cn('h-9 shrink-0', sidebarOpen ? 'w-full justify-center' : 'mx-auto w-9 px-0')}
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span className="text-xs">Collapse sidebar</span>
              </>
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.slug === ''}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
                    isActive ? 'bg-primary text-white shadow-glow' : 'text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle-bg)] hover:text-[color:var(--color-text)]',
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className={cn('transition-all', sidebarOpen ? 'opacity-100' : 'hidden opacity-0')}>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          {sidebarOpen ? (
            <div className="mt-8 space-y-4">
              <div className="rounded-[1.2rem] border border-[color:var(--color-border)] bg-[color:var(--color-subtle-bg)] p-4">
                <p className="text-[11px] uppercase tracking-[0.34em] theme-muted">Official Site</p>
                <a href={companyProfile.website} target="_blank" rel="noreferrer" className="mt-2 block text-sm font-medium text-[color:var(--color-text)] hover:text-secondary">
                  {companyProfile.website}
                </a>
                <p className="mt-3 text-sm theme-muted">{companyProfile.offices[0].city} and {companyProfile.offices[1].city}</p>
              </div>
              <DeveloperSignature compact />
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
};
