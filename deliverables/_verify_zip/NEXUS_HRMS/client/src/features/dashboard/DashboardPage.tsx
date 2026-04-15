import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  BriefcaseBusiness,
  CalendarCheck2,
  DollarSign,
  FolderKanban,
  ShieldCheck,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../lib/api';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { Card } from '../../components/ui/card';
import { StatCard } from '../../components/StatCard';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../store/authStore';
import { companyProfile } from '../../lib/company';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
import { getPortalConfig, getPortalNavItems } from '../../lib/constants';
import type { Project } from '../../types';

const widgetCatalog = {
  headcount: { label: 'headcount' },
  attendance: { label: 'attendance' },
  leave: { label: 'leave' },
  payroll: { label: 'payroll' },
};

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
  const widgetOrder = useUIStore((state) => state.widgetOrder);
  const setWidgetOrder = useUIStore((state) => state.setWidgetOrder);
  const user = useAuthStore((state) => state.user);
  const portal = getPortalConfig(user?.role);
  const navigate = useNavigate();
  const canReadAnalytics = user?.permissions.includes('analytics.read') ?? false;
  const canReadProjects = user?.permissions.includes('projects.read') ?? false;
  const canReadAnnouncements = user?.permissions.includes('announcements.read') ?? false;
  const canReadNotifications = user?.permissions.includes('notifications.read') ?? false;
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

  const rotateWidgets = () => {
    if (widgetOrder.length < 2) {
      return;
    }
    setWidgetOrder([...widgetOrder.slice(1), widgetOrder[0]]);
  };

  const activeProjects = useMemo(
    () => (projectsQuery.data ?? []).filter((project) => project.status === 'active').length,
    [projectsQuery.data],
  );

  const averageProjectProgress = useMemo(() => {
    const projects = projectsQuery.data ?? [];
    if (projects.length === 0) {
      return 0;
    }

    const total = projects.reduce((sum, project) => sum + (project.progress ?? 0), 0);
    return Math.round(total / projects.length);
  }, [projectsQuery.data]);

  const stats = useMemo(() => {
    if (canReadAnalytics && metricsQuery.data) {
      return [
        {
          key: 'headcount',
          label: 'Total Employees',
          value: metricsQuery.data.totalEmployees,
          helper: 'Active workforce across all departments',
          icon: <BarChart3 className="h-5 w-5" />,
        },
        {
          key: 'leave',
          label: 'New Hires',
          value: metricsQuery.data.newHires,
          helper: 'People added in the last 30 days',
          icon: <BriefcaseBusiness className="h-5 w-5" />,
        },
        {
          key: 'attendance',
          label: 'Avg Attendance',
          value: metricsQuery.data.averageAttendance,
          helper: 'Average hours logged per attendance record',
          icon: <CalendarCheck2 className="h-5 w-5" />,
        },
        {
          key: 'payroll',
          label: 'Payroll Cost',
          value: formatCurrency(metricsQuery.data.payrollCost, 'PKR'),
          helper: 'Current processed net salary value',
          icon: <DollarSign className="h-5 w-5" />,
        },
      ];
    }

    return [
      {
        key: 'headcount',
        label: 'Portal Permissions',
        value: user?.permissions.length ?? 0,
        helper: 'Capabilities assigned to this login',
        icon: <BarChart3 className="h-5 w-5" />,
      },
      {
        key: 'leave',
        label: 'Available Modules',
        value: Math.max(portalNavItems.length - 1, 0),
        helper: 'Portal sections available to this role',
        icon: <BriefcaseBusiness className="h-5 w-5" />,
      },
      {
        key: 'attendance',
        label: 'Assigned Projects',
        value: projectsQuery.data?.length ?? 0,
        helper: 'Workspaces visible to this account',
        icon: <CalendarCheck2 className="h-5 w-5" />,
      },
      {
        key: 'payroll',
        label: 'Password State',
        value: user?.mustChangePassword ? 'Rotate now' : 'Healthy',
        helper: 'Credential health for this portal',
        icon: <DollarSign className="h-5 w-5" />,
      },
    ];
  }, [canReadAnalytics, metricsQuery.data, portalNavItems.length, projectsQuery.data?.length, user]);

  const operationsSummary = useMemo(
    () => [
      {
        label: 'Platform status',
        value: 'Operational',
        helper: 'Core people, payroll, and project modules are available.',
        icon: <Activity className="h-4 w-4" />,
        tone: 'text-emerald-300',
      },
      {
        label: 'Unread alerts',
        value: String(notificationsQuery.data?.unreadCount ?? 0),
        helper: 'Items still waiting for review or acknowledgement.',
        icon: <BellRing className="h-4 w-4" />,
        tone: 'text-amber-300',
      },
      {
        label: 'Delivery pulse',
        value: `${activeProjects} active`,
        helper: `${averageProjectProgress}% average progress across visible workspaces.`,
        icon: <FolderKanban className="h-4 w-4" />,
        tone: 'text-secondary',
      },
      {
        label: 'Access health',
        value: user?.mustChangePassword ? 'Action required' : 'Verified',
        helper: user?.mustChangePassword
          ? 'A temporary password is still in use for this account.'
          : 'Account credentials are in a normal operating state.',
        icon: <ShieldCheck className="h-4 w-4" />,
        tone: user?.mustChangePassword ? 'text-amber-300' : 'text-emerald-300',
      },
    ],
    [activeProjects, averageProjectProgress, notificationsQuery.data?.unreadCount, user?.mustChangePassword],
  );

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
        meta: `${update.employeeId.firstName} ${update.employeeId.lastName} submitted a project update`,
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-white">{portal?.label ?? 'Workspace'}</h3>
          <p className="text-sm text-white/55">A practical daily view of people operations, delivery activity, and account actions.</p>
        </div>
        <Button variant="outline" className="shrink-0" onClick={rotateWidgets}>
          Rotate widgets
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-secondary">{companyProfile.platformName}</p>
            <h3 className="mt-3 max-w-2xl text-3xl font-semibold text-white">A cleaner operating layer for teams, approvals, and internal delivery.</h3>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">
              This portal keeps records, approvals, payroll, hiring, and delivery updates close enough to act on without turning the dashboard into noise.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button key={action.path} variant="outline" onClick={() => navigate(action.path)}>
                  {action.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/42">Logged in as</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="mt-1 text-sm text-white/55">{profileQuery.data?.designation ?? user?.role ?? 'Portal user'}</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/42">Work context</p>
                <p className="mt-2 text-lg font-semibold text-white">{profileQuery.data?.department?.name ?? 'Cross-functional access'}</p>
                <p className="mt-1 text-sm text-white/55">{profileQuery.data?.employeeId ?? 'Employee profile linked to this account'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center border-l border-white/10 bg-gradient-to-br from-primary/12 to-white/[0.02] p-6">
            <img
              src={companyProfile.assets.hero}
              alt={`${companyProfile.legalName} hero`}
              className="hero-float max-h-72 w-full object-contain drop-shadow-[0_28px_55px_rgba(127,99,244,0.2)]"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        {widgetOrder.map((widgetId) => {
          const widget = widgetCatalog[widgetId as keyof typeof widgetCatalog];
          const item = stats.find((stat) => stat.key === widget.label) ?? stats[0];
          return <StatCard key={widgetId} label={item.label} value={item.value} helper={item.helper} icon={item.icon} />;
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
        <Card className="space-y-5">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-secondary">Operations Overview</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">What needs attention right now</h3>
            <p className="mt-2 text-sm text-white/58">A quick read on platform health, delivery motion, and whether this account is ready for normal use.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {operationsSummary.map((item) => (
              <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/42">{item.label}</p>
                  <span className={cn('rounded-full bg-white/6 p-2', item.tone)}>{item.icon}</span>
                </div>
                <p className={cn('mt-4 text-xl font-semibold text-white', item.tone)}>{item.value}</p>
                <p className="mt-2 text-sm leading-6 text-white/56">{item.helper}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white/55">
            Coverage remains aligned with the company footprint in {companyProfile.offices[0].city} and {companyProfile.offices[1].city}, with the same portal model shared across both offices.
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-secondary">Recent Updates</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Live company and project activity</h3>
            <p className="mt-2 text-sm text-white/58">Recent announcements, project movement, and notification traffic visible to this account.</p>
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

      <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
        <Card>
          <p className="text-sm uppercase tracking-[0.3em] text-secondary">Account</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Workspace identity</h3>
          <p className="mt-3 max-w-2xl text-sm text-white/58">A quick summary of the account currently signed in, the linked employee profile, and access posture.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Signed in as</p>
              <p className="mt-2 font-medium text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm text-white/50">{user?.email}</p>
              {profileQuery.data?.employeeId ? <p className="mt-2 text-sm text-white/65">{profileQuery.data.employeeId}</p> : null}
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Scope</p>
              <p className="mt-2 font-medium text-white">{user?.permissions.length ?? 0} permission rules</p>
              <p className="text-sm text-white/50">
                {profileQuery.data?.department?.name
                  ? `${profileQuery.data.department.name} | ${profileQuery.data.designation}`
                  : user?.mustChangePassword
                    ? 'Password change required'
                    : 'Credentials active'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-secondary">Settings</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Centralized account controls</h3>
            <p className="mt-2 text-sm text-white/58">Profile, password, notification preferences, session history, and privacy details now live inside a dedicated Settings workspace.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/42">Unread notifications</p>
              <p className="mt-2 text-lg font-semibold text-white">{notificationsQuery.data?.unreadCount ?? 0}</p>
              <p className="mt-2 text-sm text-white/55">Review alerts, approvals, and announcements from Settings or the notifications center.</p>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/42">Credential status</p>
              <p className="mt-2 text-lg font-semibold text-white">{user?.mustChangePassword ? 'Action required' : 'Healthy'}</p>
              <p className="mt-2 text-sm text-white/55">Security tasks and session controls are now centralized inside Settings.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => navigate(`${portal?.basePath ?? '/login'}/settings`)}>
              Open Settings
            </Button>
            <Button type="button" variant="outline" soundTone="none" onClick={() => navigate(`${portal?.basePath ?? '/login'}/settings?section=security`)}>
              Open Security
            </Button>
          </div>
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
