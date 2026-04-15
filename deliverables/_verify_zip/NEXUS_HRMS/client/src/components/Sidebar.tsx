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
        'sticky top-0 hidden h-screen overflow-hidden border-r border-white/10 bg-night px-4 py-6 text-white lg:block',
        sidebarOpen ? 'w-72' : 'w-24',
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-8 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <BrandLogo collapsed={!sidebarOpen} />
            {sidebarOpen ? <p className="mt-4 text-xs uppercase tracking-[0.26em] text-white/45">{portal.label}</p> : null}
          </div>
          <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={toggleSidebar}>
            {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition',
                    isActive ? 'bg-primary text-white shadow-glow' : 'text-white/70 hover:bg-white/8 hover:text-white',
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                <span className={cn('transition-all', sidebarOpen ? 'opacity-100' : 'hidden opacity-0')}>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          {sidebarOpen ? (
            <div className="mt-8 space-y-4">
              <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">Official Site</p>
                <a href={companyProfile.website} target="_blank" rel="noreferrer" className="mt-2 block text-sm font-medium text-white/85 hover:text-white">
                  {companyProfile.website}
                </a>
                <p className="mt-3 text-sm text-white/65">{companyProfile.offices[0].city} and {companyProfile.offices[1].city}</p>
              </div>
              <DeveloperSignature compact />
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
};
