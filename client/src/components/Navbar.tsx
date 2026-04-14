import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BellRing, ChevronDown, LogOut, MoonStar, Search, Settings2, ShieldCheck, SunMedium, UserCircle2, Volume2, VolumeX } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { companyProfile } from '../lib/company';
import { getPortalLabelFromPath, getPortalNavItems, type PortalConfig } from '../lib/constants';
import { playUiTone } from '../lib/sound';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useUIStore } from '../store/uiStore';
import type { Employee } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { UserAvatar } from './UserAvatar';

export const Navbar = ({ portal }: { portal: PortalConfig }) => {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const user = useAuthStore((state) => state.user);
  const authUser = user;
  const clearSession = useAuthStore((state) => state.clearSession);
  const { darkMode, soundEnabled, toggleDarkMode, toggleSoundEnabled } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = useMemo(() => getPortalNavItems(user), [user]);
  const current = getPortalLabelFromPath(user, location.pathname);
  const notificationPath = navItems.find((item) => item.slug === 'notifications')?.path;
  const settingsPath = navItems.find((item) => item.slug === 'settings')?.path;
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['current-profile'],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await api.get('/employees/me');
      return data.data as Employee;
    },
  });

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSettled: () => {
      clearSession();
      navigate('/login');
    },
  });

  const currentProfileName =
    `${profileQuery.data?.firstName ?? user?.firstName ?? ''} ${profileQuery.data?.lastName ?? user?.lastName ?? ''}`.trim() || 'Guest User';

  const openSettingsSection = (section: 'profile' | 'settings' | 'security') => {
    if (!settingsPath) {
      return;
    }

    setMenuOpen(false);
    navigate(section === 'settings' ? settingsPath : `${settingsPath}?section=${section}`);
  };

  return (
    <div className="relative z-40 flex flex-col gap-4 rounded-[1.35rem] border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-3.5 shadow-panel backdrop-blur-sm xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-white/42">
          <span>{companyProfile.legalName}</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span>{portal.label}</span>
        </div>
        <h2 className="mt-2 text-[1.75rem] font-semibold text-white">{current}</h2>
        <p className="mt-1 text-sm text-white/55">A focused operating view for people, delivery, and internal approvals.</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <Input
            className="pl-9"
            placeholder="Jump to a section"
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

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className="relative h-10 w-10 rounded-full px-0"
            soundTone="none"
            title={notificationPath ? `Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}` : `${unreadCount} unread notifications`}
            aria-label={notificationPath ? 'Open notifications' : 'Notifications'}
            onClick={() => {
              playUiTone('soft', true);
              if (notificationPath) {
                navigate(notificationPath);
              }
            }}
          >
            <BellRing className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 min-w-[1.15rem] rounded-full bg-secondary px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 w-10 rounded-full px-0"
            soundTone="none"
            title={soundEnabled ? 'Mute interface sounds' : 'Enable interface sounds'}
            aria-label={soundEnabled ? 'Mute interface sounds' : 'Enable interface sounds'}
            onClick={() => {
              const nextEnabled = !soundEnabled;
              toggleSoundEnabled();
              playUiTone(nextEnabled ? 'success' : 'soft', true);
            }}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 w-10 rounded-full px-0"
            soundTone="none"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => {
              toggleDarkMode();
              playUiTone('soft', true);
            }}
          >
            {darkMode ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          </Button>

          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1.5 text-left transition hover:bg-white/8"
              onClick={() => setMenuOpen((currentState) => !currentState)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <UserAvatar
                name={currentProfileName}
                src={profileQuery.data?.avatar}
                active={authUser?.isActive ?? true}
                size="sm"
              />
              <ChevronDown className="h-4 w-4 text-white/45" />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.65rem)] z-[90] w-64 rounded-2xl border border-white/10 bg-[#130e22] p-2 shadow-2xl">
                <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                  <UserAvatar
                    name={currentProfileName}
                    src={profileQuery.data?.avatar}
                    active={authUser?.isActive ?? true}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{currentProfileName}</p>
                    <p className="truncate text-sm text-white/50">{user?.email}</p>
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/78 transition hover:bg-white/8 hover:text-white"
                    onClick={() => openSettingsSection('profile')}
                  >
                    <UserCircle2 className="h-4 w-4 text-secondary" />
                    Profile
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/78 transition hover:bg-white/8 hover:text-white"
                    onClick={() => openSettingsSection('settings')}
                  >
                    <Settings2 className="h-4 w-4 text-secondary" />
                    Settings
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/78 transition hover:bg-white/8 hover:text-white"
                    onClick={() => openSettingsSection('security')}
                  >
                    <ShieldCheck className="h-4 w-4 text-secondary" />
                    Security
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-200 transition hover:bg-rose-500/10 hover:text-rose-100"
                    disabled={logoutMutation.isPending}
                    onClick={() => logoutMutation.mutate()}
                  >
                    <LogOut className="h-4 w-4" />
                    {logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
