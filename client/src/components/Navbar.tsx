import { LogOut, MoonStar, Search, SunMedium } from 'lucide-react';
import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { companyProfile } from '../lib/company';
import { getPortalLabelFromPath, getPortalNavItems, type PortalConfig } from '../lib/constants';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';

export const Navbar = ({ portal }: { portal: PortalConfig }) => {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const { darkMode, toggleDarkMode } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = useMemo(() => getPortalNavItems(user), [user]);
  const current = getPortalLabelFromPath(user, location.pathname);
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSettled: () => {
      clearSession();
      navigate('/login');
    },
  });

  return (
    <div className="flex flex-col gap-4 rounded-[1.9rem] border border-white/10 bg-white/6 p-4 shadow-panel backdrop-blur md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-secondary">{portal.label}</p>
        <h2 className="text-2xl font-semibold text-white">{current}</h2>
        <p className="mt-1 text-sm text-white/55">{companyProfile.legalName}</p>
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <Input
            className="pl-9"
            placeholder="Search a workspace section and press Enter..."
            onKeyDown={(event) => {
              if (event.key !== 'Enter') {
                return;
              }
              const query = event.currentTarget.value.toLowerCase().trim();
              const match = navItems.find((item) => item.label.toLowerCase().includes(query));
              if (match) {
                navigate(match.path);
              }
            }}
          />
        </div>
        <Badge>{unreadCount} unread</Badge>
        <Button variant="ghost" onClick={() => window.open(companyProfile.website, '_blank', 'noopener,noreferrer')}>
          Website
        </Button>
        <Button variant="outline" onClick={toggleDarkMode}>
          {darkMode ? <SunMedium className="mr-2 h-4 w-4" /> : <MoonStar className="mr-2 h-4 w-4" />}
          {darkMode ? 'Light' : 'Dark'}
        </Button>
        <Button variant="outline" disabled={logoutMutation.isPending} onClick={() => logoutMutation.mutate()}>
          <LogOut className="mr-2 h-4 w-4" />
          {logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}
        </Button>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
          <p className="text-sm font-semibold text-white">{user ? `${user.firstName} ${user.lastName}` : 'Guest User'}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">{user?.role ?? 'public'}</p>
        </div>
      </div>
    </div>
  );
};
