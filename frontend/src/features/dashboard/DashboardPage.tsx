import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, BriefcaseBusiness, CalendarCheck2, ShieldCheck } from 'lucide-react';
import { RupeeIcon } from '../../components/RupeeIcon';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../lib/api';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { Card } from '../../components/ui/card';
import { StatCard } from '../../components/StatCard';
import { LiveActivityPanel } from '../../components/LiveActivityPanel';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { getPortalConfig, getPortalNavItems } from '../../lib/constants';
import type { Project } from '../../types';

interface DashboardAnnouncement {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  published?: boolean;
}

interface DashboardNotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface DashboardActivityItem {
  id: string;
  type: 'announcement' | 'project' | 'notification';
  title: string;
  description: string;
  timestamp: string;
  meta: string;
}

export const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === 'superAdmin';
  const portal = getPortalConfig(user?.role);
  const navigate = useNavigate();
  const canReadAnalytics = user?.permissions?.includes('analytics.read') ?? false;
  const canReadProjects = user?.permissions?.includes('projects.read') ?? false;
  const canReadAnnouncements = user?.permissions?.includes('announcements.read') ?? false;
  const canReadNotifications = user?.permissions?.includes('notifications.read') ?? false;
  const portalNavItems = getPortalNavItems(user);

  const metricsQuery = useQuery({
    queryKey: ['analytics-dashboard'],
    enabled: canReadAnalytics,
    queryFn: async () => {
      const { data } = await api.get('/analytics/dashboard');
      return data.data;
    },
  });

  const chartsQuery = useQuery({
    queryKey: ['analytics-charts'],
    enabled: canReadAnalytics,
    queryFn: async () => {
      const { data } = await api.get('/analytics/charts');
      return data.data;
    },
  });

  const projectsQuery = useQuery({
    queryKey: ['dashboard-projects'],
    enabled: canReadProjects,
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.data as Project[];
    },
  });

  const profileQuery = useQuery({
    queryKey: ['current-profile'],
    enabled: Boolean(user),
    retry: false,
    queryFn: async () => {
      const { data } = await api.get('/employees/me');
      return data.data as {
        employeeId: string;
        designation: string;
        department?: { name: string; code: string };
      };
    },
  });

  const announcementsQuery = useQuery({
    queryKey: ['dashboard-announcements'],
    enabled: canReadAnnouncements,
    queryFn: async () => {
      const { data } = await api.get('/announcements');
      return data.data as DashboardAnnouncement[];
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ['dashboard-notifications'],
    enabled: canReadNotifications,
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data.data as { notifications: DashboardNotification[]; unreadCount: number };
    },
  });

  const stats = useMemo(() => {
    if (canReadAnalytics && metricsQuery.data) {
      return [
        {
          key: 'headcount',
          label: 'Total Employees',
          value: metricsQuery.data.totalEmployees,
          helper: 'Active workforce across all departments',
          icon: <BarChart3 className="h-5 w-5" />,
          accent: 'primary' as const,
        },
        {
          key: 'leave',
          label: 'New Hires',
          value: metricsQuery.data.newHires,
          helper: 'People added in the last 30 days',
          icon: <BriefcaseBusiness className="h-5 w-5" />,
          accent: 'emerald' as const,
        },
        {
          key: 'attendance',
          label: 'Avg Attendance',
          value: metricsQuery.data.averageAttendance,
          helper: 'Average hours logged per attendance record',
          icon: <CalendarCheck2 className="h-5 w-5" />,
          accent: 'sky' as const,
        },
        {
          key: 'payroll',
          label: 'Payroll Cost',
          value: formatCurrency(metricsQuery.data.payrollCost, 'PKR'),
          helper: 'Current processed net salary value',
          icon: <RupeeIcon className="text-base" />,
          accent: 'amber' as const,
        },
      ];
    }

    return [
      {
        key: 'headcount',
        label: 'Portal Permissions',
        value: user?.permissions?.length ?? 0,
        helper: 'Capabilities assigned to this login',
        icon: <BarChart3 className="h-5 w-5" />,
        accent: 'primary' as const,
      },
      {
        key: 'leave',
        label: 'Available Modules',
        value: Math.max(portalNavItems.length - 1, 0),
        helper: 'Portal sections available to this role',
        icon: <BriefcaseBusiness className="h-5 w-5" />,
        accent: 'emerald' as const,
      },
      {
        key: 'attendance',
        label: 'Assigned Projects',
        value: projectsQuery.data?.length ?? 0,
        helper: 'Workspaces visible to this account',
        icon: <CalendarCheck2 className="h-5 w-5" />,
        accent: 'sky' as const,
      },
      {
        key: 'payroll',
        label: 'Password State',
        value: user?.mustChangePassword ? 'Rotate now' : 'Healthy',
        helper: 'Credential health for this portal',
        icon: <ShieldCheck className="h-5 w-5" />,
        accent: 'amber' as const,
      },
    ];
  }, [canReadAnalytics, metricsQuery.data, portalNavItems.length, projectsQuery.data?.length, user]);

  const recentUpdates = useMemo<DashboardActivityItem[]>(() => {
    const announcementItems = (announcementsQuery.data ?? []).map((announcement) => ({
      id: `announcement-${announcement._id}`,
      type: 'announcement' as const,
      title: announcement.title,
      description: announcement.content,
      timestamp: announcement.createdAt,
      meta: 'Company update',
    }));

    const notificationItems = (notificationsQuery.data?.notifications ?? []).map((notification) => ({
      id: `notification-${notification._id}`,
      type: 'notification' as const,
      title: notification.title,
      description: notification.message,
      timestamp: notification.createdAt,
      meta: notification.read ? 'Notification' : 'Unread notification',
    }));

    const projectItems = (projectsQuery.data ?? []).flatMap((project) =>
      (project.updates ?? []).map((update) => ({
        id: `project-${update._id}`,
        type: 'project' as const,
        title: project.name,
        description: update.summary,
        timestamp: update.submittedAt,
        meta: `${update.employeeId?.firstName ?? 'Someone'} ${update.employeeId?.lastName ?? ''} submitted a project update`,
      })),
    );

    return [...announcementItems, ...notificationItems, ...projectItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [announcementsQuery.data, notificationsQuery.data?.notifications, projectsQuery.data]);

  const quickActions = portalNavItems.slice(1, 5);

  if ((canReadAnalytics && (metricsQuery.isLoading || chartsQuery.isLoading)) || (canReadProjects && projectsQuery.isLoading) || profileQuery.isLoading) {
    return <LoadingState label="Preparing your workspace..." />;
  }

  if (canReadAnalytics && (metricsQuery.isError || chartsQuery.isError)) {
    return <ErrorState label="Dashboard widgets could not be loaded." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">{portal?.label ?? 'Workspace'}</p>
          <h3 className="mt-1 text-2xl font-semibold text-[color:var(--color-heading)]">
            Welcome back, {user?.firstName ?? 'there'}
          </h3>
          <p className="mt-1 text-sm theme-muted">Here is what needs your attention today.</p>
        </div>
        {quickActions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {quickActions.slice(0, 3).map((action) => (
              <Button key={action.path} variant="outline" className="shrink-0" onClick={() => navigate(action.path)}>
                {action.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.key} label={item.label} value={item.value} helper={item.helper} icon={item.icon} accent={item.accent} />
        ))}
      </div>

      {isSuperAdmin ? <LiveActivityPanel /> : null}

      <div className="grid gap-4">
        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-secondary">Recent Updates</p>
            <h3 className="mt-1 text-lg font-semibold text-[color:var(--color-heading)]">Latest activity</h3>
          </div>

          {announcementsQuery.isLoading || notificationsQuery.isLoading ? (
            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
              Refreshing the latest activity feed...
            </div>
          ) : recentUpdates.length > 0 ? (
            <div className="space-y-3">
              {recentUpdates.map((item) => (
                <div key={item.id} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
                            item.type === 'announcement' && 'bg-secondary/16 text-secondary',
                            item.type === 'project' && 'bg-emerald-500/14 text-emerald-300',
                            item.type === 'notification' && 'bg-amber-500/14 text-amber-300',
                          )}
                        >
                          {item.type}
                        </span>
                        <span className="text-xs text-white/38">{formatDate(item.timestamp)}</span>
                      </div>
                      <p className="mt-3 font-medium text-white">{item.title}</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/55">{item.description}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/35">{item.meta}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
              No fresh announcements or project updates are available for this account yet.
            </div>
          )}
        </Card>
      </div>

      {canReadAnalytics ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Hiring trend</h3>
              <p className="text-sm text-white/50">Recent movement in recruitment activity.</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartsQuery.data.monthlyHiringTrend}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
                  <XAxis dataKey="name" stroke="#a8a2c5" />
                  <YAxis stroke="#a8a2c5" />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#7F63F4" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Leave utilization</h3>
              <p className="text-sm text-white/50">Approved leave split by leave type.</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartsQuery.data.leaveTypeBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />
                  <XAxis dataKey="name" stroke="#a8a2c5" />
                  <YAxis stroke="#a8a2c5" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#FFC107" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Personal workspace</h3>
              <p className="text-sm text-white/50">A simpler home screen for daily employee and manager work.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Role</p>
                <p className="mt-2 text-lg font-semibold text-white">{portal?.label}</p>
                <p className="mt-2 text-sm text-white/55">Access stays focused on the sections assigned to this account.</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Work profile</p>
                <p className="mt-2 text-lg font-semibold text-white">{profileQuery.data?.designation ?? 'Profile active'}</p>
                <p className="mt-2 text-sm text-white/55">{profileQuery.data?.department?.name ?? 'Department can be assigned by HR or Super Admin'}</p>
              </div>
            </div>
          </Card>
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Assigned projects</h3>
              <p className="text-sm text-white/50">Project visibility is available directly inside the personal portal.</p>
            </div>
            <div className="space-y-3">
              {(projectsQuery.data ?? []).slice(0, 4).map((project) => (
                <div key={project._id} className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{project.name}</p>
                    <span className="text-sm text-secondary">{project.progress}%</span>
                  </div>
                  <p className="mt-2 text-sm text-white/55">
                    {project.clientName} | {project.status}
                  </p>
                </div>
              ))}
              {(projectsQuery.data ?? []).length === 0 ? (
                <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                  No projects have been assigned to this portal yet.
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
