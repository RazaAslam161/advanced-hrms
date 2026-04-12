import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, BriefcaseBusiness, CalendarCheck2, DollarSign } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../lib/api';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { Card } from '../../components/ui/card';
import { StatCard } from '../../components/StatCard';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuthStore } from '../../store/authStore';
import { companyProfile } from '../../lib/company';
import { formatCurrency, getApiErrorMessage } from '../../lib/utils';
import { getPortalConfig, getPortalNavItems } from '../../lib/constants';
import type { Project } from '../../types';

const widgetCatalog = {
  headcount: { label: 'headcount' },
  attendance: { label: 'attendance' },
  leave: { label: 'leave' },
  payroll: { label: 'payroll' },
};

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(10)
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[0-9]/, 'Password must include a number'),
});

export const DashboardPage = () => {
  const widgetOrder = useUIStore((state) => state.widgetOrder);
  const setWidgetOrder = useUIStore((state) => state.setWidgetOrder);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setSession = useAuthStore((state) => state.setSession);
  const portal = getPortalConfig(user?.role);
  const navigate = useNavigate();
  const canReadAnalytics = user?.permissions.includes('analytics.read') ?? false;
  const canReadProjects = user?.permissions.includes('projects.read') ?? false;
  const portalNavItems = getPortalNavItems(user);
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  });

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
    queryKey: ['dashboard-profile'],
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

  const changePasswordMutation = useMutation({
    mutationFn: async (values: z.infer<typeof passwordSchema>) => {
      await api.post('/auth/change-password', values);
    },
    onSuccess: () => {
      passwordForm.reset();
      if (user && accessToken) {
        setSession(accessToken, { ...user, mustChangePassword: false });
      }
    },
  });

  const rotateWidgets = () => {
    if (widgetOrder.length < 2) {
      return;
    }
    setWidgetOrder([...widgetOrder.slice(1), widgetOrder[0]]);
  };

  const stats = useMemo(() => {
    if (canReadAnalytics && metricsQuery.data) {
      return [
        { key: 'headcount', label: 'Total Employees', value: metricsQuery.data.totalEmployees, helper: 'Active workforce across all departments', icon: <BarChart3 className="h-5 w-5" /> },
        { key: 'leave', label: 'New Hires', value: metricsQuery.data.newHires, helper: 'People added in the last 30 days', icon: <BriefcaseBusiness className="h-5 w-5" /> },
        { key: 'attendance', label: 'Avg Attendance', value: metricsQuery.data.averageAttendance, helper: 'Average hours logged per attendance record', icon: <CalendarCheck2 className="h-5 w-5" /> },
        { key: 'payroll', label: 'Payroll Cost', value: formatCurrency(metricsQuery.data.payrollCost, 'PKR'), helper: 'Current processed net salary value', icon: <DollarSign className="h-5 w-5" /> },
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
        value: user?.mustChangePassword ? 'Rotate now' : 'Active',
        helper: 'Credential health for this portal',
        icon: <DollarSign className="h-5 w-5" />,
      },
    ];
  }, [canReadAnalytics, metricsQuery.data, portalNavItems.length, projectsQuery.data?.length, user]);

  const quickActions = portalNavItems.slice(1, 5);
  const passwordError = changePasswordMutation.isError
    ? getApiErrorMessage(changePasswordMutation.error, 'Password could not be updated.')
    : null;

  if ((canReadAnalytics && (metricsQuery.isLoading || chartsQuery.isLoading)) || (canReadProjects && projectsQuery.isLoading) || profileQuery.isLoading) {
    return <LoadingState label="Preparing your workforce dashboard..." />;
  }

  if (canReadAnalytics && (metricsQuery.isError || chartsQuery.isError)) {
    return <ErrorState label="Dashboard widgets could not be loaded." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-white">{portal?.label ?? 'Command Center'}</h3>
          <p className="text-sm text-white/55">{portal?.description ?? 'Draggable-style widgets, live KPIs, and activity flow for people operations.'}</p>
        </div>
        <Button variant="outline" onClick={rotateWidgets}>
          Reorder Widgets
        </Button>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="p-6 md:p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-secondary">{companyProfile.legalName}</p>
            <h3 className="mt-3 max-w-2xl text-3xl font-semibold text-white">A company-shaped HRMS for product builders, recruiters, managers, and employees.</h3>
            <p className="mt-4 max-w-2xl text-sm text-white/60">{companyProfile.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button key={action.path} variant="outline" onClick={() => navigate(action.path)}>
                  {action.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {companyProfile.services.map((service) => (
                <span key={service} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-medium text-white/75">
                  {service}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center border-l border-white/10 bg-gradient-to-br from-primary/12 to-white/[0.02] p-6">
            <img src={companyProfile.assets.hero} alt={`${companyProfile.legalName} hero`} className="max-h-72 w-full object-contain" />
          </div>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-4">
        {widgetOrder.map((widgetId) => {
          const item = stats.find((stat) => stat.key === widgetCatalog[widgetId as keyof typeof widgetCatalog].label) ?? stats[0];
          return <StatCard key={widgetId} label={item.label} value={item.value} helper={item.helper} icon={item.icon} />;
        })}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
        <Card>
          <p className="text-sm uppercase tracking-[0.3em] text-secondary">Portal Authority</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">{portal?.label}</h3>
          <p className="mt-3 max-w-2xl text-sm text-white/58">{portal?.description}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Signed in as</p>
              <p className="mt-2 font-medium text-white">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-white/50">{user?.email}</p>
              {profileQuery.data?.employeeId ? <p className="mt-2 text-sm text-white/65">{profileQuery.data.employeeId}</p> : null}
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Scope</p>
              <p className="mt-2 font-medium text-white">{user?.permissions.length ?? 0} permission rules</p>
              <p className="text-sm text-white/50">
                {profileQuery.data?.department?.name
                  ? `${profileQuery.data.department.name} • ${profileQuery.data.designation}`
                  : user?.mustChangePassword
                    ? 'Password change required'
                    : 'Credentials active'}
              </p>
            </div>
          </div>
        </Card>
        <Card className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-secondary">Credential Security</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Change portal password</h3>
            <p className="mt-2 text-sm text-white/58">
              {user?.mustChangePassword
                ? 'This account is using a temporary password. Rotate it now before continuing.'
                : 'Use this panel to rotate your own credentials without leaving the portal.'}
            </p>
          </div>
          <form className="grid gap-3" onSubmit={passwordForm.handleSubmit((values) => changePasswordMutation.mutate(values))}>
            <Input type="password" placeholder="Current password" {...passwordForm.register('currentPassword')} />
            {passwordForm.formState.errors.currentPassword ? <p className="text-sm text-rose-300">{passwordForm.formState.errors.currentPassword.message}</p> : null}
            <Input type="password" placeholder="New password" {...passwordForm.register('newPassword')} />
            {passwordForm.formState.errors.newPassword ? <p className="text-sm text-rose-300">{passwordForm.formState.errors.newPassword.message}</p> : null}
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? 'Updating password...' : 'Update password'}
            </Button>
          </form>
          {changePasswordMutation.isSuccess ? <p className="text-sm text-emerald-300">Password updated successfully.</p> : null}
          {passwordError ? <p className="text-sm text-rose-300">{passwordError}</p> : null}
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <p className="text-sm uppercase tracking-[0.3em] text-secondary">Company Footprint</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Official office and contact profile</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {companyProfile.offices.map((office) => (
              <div key={office.label} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">{office.label}</p>
                <p className="mt-3 text-lg font-semibold text-white">
                  {office.city}, {office.country}
                </p>
                <p className="mt-2 text-sm text-white/58">{office.address}</p>
                <p className="mt-2 text-sm text-white/75">{office.phone}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.3em] text-secondary">Launchpad</p>
          <h3 className="mt-3 text-2xl font-semibold text-white">Role-first workflow access</h3>
          <div className="mt-5 grid gap-3">
            {portalNavItems.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className="flex items-center justify-between rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/20 p-2 text-secondary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{item.label}</p>
                    <p className="text-sm text-white/45">{portal?.label}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-white/45" />
              </button>
            ))}
          </div>
        </Card>
      </div>
      {canReadAnalytics ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Hiring trend</h3>
              <p className="text-sm text-white/50">Applications flowing through the recruitment engine.</p>
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
              <p className="text-sm text-white/50">Distribution by leave type across approved requests.</p>
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
              <p className="text-sm text-white/50">Your home portal is now role-based and independent from the company-wide analytics dashboard.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Portal</p>
                <p className="mt-2 text-lg font-semibold text-white">{portal?.label}</p>
                <p className="mt-2 text-sm text-white/55">{portal?.description}</p>
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
              <p className="text-sm text-white/50">Project visibility is now available directly from the personal portal.</p>
            </div>
            <div className="space-y-3">
              {(projectsQuery.data ?? []).slice(0, 4).map((project) => (
                <div key={project._id} className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{project.name}</p>
                    <span className="text-sm text-secondary">{project.progress}%</span>
                  </div>
                  <p className="mt-2 text-sm text-white/55">{project.clientName} • {project.status}</p>
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
