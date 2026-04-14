import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BellRing,
  Camera,
  CircleHelp,
  Clock3,
  Eye,
  KeyRound,
  LaptopMinimal,
  Mail,
  MapPin,
  MoonStar,
  Palette,
  ShieldCheck,
  SunMedium,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../../lib/api';
import { companyProfile } from '../../lib/company';
import { cn, getApiErrorMessage } from '../../lib/utils';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncState';
import { UserAvatar } from '../../components/UserAvatar';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import type { AccountActivity, AccountSession, Employee, NotificationPreferences } from '../../types';

const sectionSchema = z.enum(['profile', 'account', 'security', 'notifications', 'preferences', 'privacy', 'activity', 'support']);
type SettingsSection = z.infer<typeof sectionSchema>;

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  displayName: z.string().trim().optional(),
  email: z.string().email('Enter a valid email'),
  phone: z.string().trim().optional(),
  timezone: z.string().min(2, 'Timezone is required'),
  workLocation: z.enum(['onsite', 'remote', 'hybrid']),
  country: z.string().min(2, 'Country is required'),
  emergencyContacts: z
    .array(
      z.object({
        name: z.string().min(2, 'Name is required'),
        relation: z.string().min(2, 'Relation is required'),
        phone: z.string().min(5, 'Phone is required'),
      }),
    )
    .default([]),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(/[A-Z]/, 'Password must include an uppercase letter')
      .regex(/[a-z]/, 'Password must include a lowercase letter')
      .regex(/[0-9]/, 'Password must include a number'),
    confirmPassword: z.string().min(1, 'Please confirm the new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const notificationSchema = z.object({
  preferences: z.object({
    leave: z.object({ email: z.boolean(), inApp: z.boolean() }),
    payroll: z.object({ email: z.boolean(), inApp: z.boolean() }),
    review: z.object({ email: z.boolean(), inApp: z.boolean() }),
    announcement: z.object({ email: z.boolean(), inApp: z.boolean() }),
    system: z.object({ email: z.boolean(), inApp: z.boolean() }),
  }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type NotificationFormValues = z.infer<typeof notificationSchema>;

interface EmployeeTimelineItem {
  _id: string;
  action: string;
  summary: string;
  occurredAt: string;
}

const settingsSections: Array<{ key: SettingsSection; label: string; helper: string }> = [
  { key: 'profile', label: 'Profile', helper: 'Personal details and photo' },
  { key: 'account', label: 'Account', helper: 'Portal and account identity' },
  { key: 'security', label: 'Security', helper: 'Password and session controls' },
  { key: 'notifications', label: 'Notifications', helper: 'Email and in-app alerts' },
  { key: 'preferences', label: 'Preferences', helper: 'Theme, sound, and workspace behavior' },
  { key: 'privacy', label: 'Privacy', helper: 'How your data is handled internally' },
  { key: 'activity', label: 'Activity', helper: 'Recent account and profile history' },
  { key: 'support', label: 'Support', helper: 'Help, recovery, and company contacts' },
];

const timezones = ['Asia/Karachi', 'Asia/Dubai', 'UTC'];
const workLocationOptions = [
  { value: 'onsite', label: 'Onsite' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
] as const;

const formatDateTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('en-PK', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Not available';

const describeSession = (session: AccountSession) => {
  if (session.userAgent) {
    return session.userAgent;
  }

  if (session.ipAddress) {
    return `IP ${session.ipAddress}`;
  }

  return 'Unknown device';
};

export const SettingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const authUser = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const { darkMode, soundEnabled, toggleDarkMode, toggleSoundEnabled } = useUIStore();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const requestedSection = searchParams.get('section');
  const activeSection = sectionSchema.safeParse(requestedSection).success
    ? (requestedSection as SettingsSection)
    : 'profile';

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      displayName: '',
      email: '',
      phone: '',
      timezone: 'Asia/Karachi',
      workLocation: 'onsite',
      country: 'Pakistan',
      emergencyContacts: [],
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      preferences: {
        leave: { email: true, inApp: true },
        payroll: { email: true, inApp: true },
        review: { email: true, inApp: true },
        announcement: { email: true, inApp: true },
        system: { email: false, inApp: true },
      },
    },
  });

  const emergencyContacts = useFieldArray({
    control: profileForm.control,
    name: 'emergencyContacts',
  });

  const profileQuery = useQuery({
    queryKey: ['current-profile'],
    queryFn: async () => {
      const { data } = await api.get('/employees/me');
      return data.data as Employee;
    },
  });

  const notificationPreferencesQuery = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/preferences/me');
      return data.data as NotificationPreferences;
    },
  });

  const sessionsQuery = useQuery({
    queryKey: ['account-sessions'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me/sessions');
      return data.data as AccountSession[];
    },
  });

  const accountActivityQuery = useQuery({
    queryKey: ['account-activity'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me/activity');
      return data.data as AccountActivity[];
    },
  });

  const employeeActivityQuery = useQuery({
    queryKey: ['employee-activity'],
    queryFn: async () => {
      const { data } = await api.get('/employees/me/activity');
      return data.data as EmployeeTimelineItem[];
    },
  });

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    profileForm.reset({
      firstName: profileQuery.data.firstName,
      lastName: profileQuery.data.lastName,
      displayName: profileQuery.data.displayName ?? '',
      email: profileQuery.data.email,
      phone: profileQuery.data.phone ?? '',
      timezone: profileQuery.data.timezone ?? 'Asia/Karachi',
      workLocation: (profileQuery.data.workLocation as ProfileFormValues['workLocation']) ?? 'onsite',
      country: profileQuery.data.country ?? 'Pakistan',
      emergencyContacts: profileQuery.data.emergencyContacts ?? [],
    });
  }, [profileForm, profileQuery.data]);

  useEffect(() => {
    if (!notificationPreferencesQuery.data) {
      return;
    }

    notificationForm.reset(notificationPreferencesQuery.data);
  }, [notificationForm, notificationPreferencesQuery.data]);

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const { data } = await api.patch('/employees/me', {
        ...values,
        displayName: values.displayName?.trim() ? values.displayName.trim() : undefined,
        phone: values.phone?.trim() ? values.phone.trim() : undefined,
      });
      return data.data as Employee;
    },
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: ['current-profile'] });
      queryClient.invalidateQueries({ queryKey: ['employee-activity'] });
      queryClient.invalidateQueries({ queryKey: ['account-activity'] });
      if (authUser && accessToken) {
        setSession(accessToken, {
          ...authUser,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
        });
      }
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/employees/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-profile'] });
      queryClient.invalidateQueries({ queryKey: ['employee-activity'] });
      queryClient.invalidateQueries({ queryKey: ['account-activity'] });
    },
  });

  const removeAvatarMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete('/employees/me/avatar');
      return data.data as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-profile'] });
      queryClient.invalidateQueries({ queryKey: ['employee-activity'] });
      queryClient.invalidateQueries({ queryKey: ['account-activity'] });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      await api.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
    },
    onSuccess: () => {
      passwordForm.reset();
      queryClient.invalidateQueries({ queryKey: ['account-activity'] });
      if (authUser && accessToken) {
        setSession(accessToken, { ...authUser, mustChangePassword: false });
      }
    },
  });

  const updateNotificationPreferencesMutation = useMutation({
    mutationFn: async (values: NotificationFormValues) => {
      const { data } = await api.put('/notifications/preferences/me', values);
      return data.data as NotificationPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout-all');
    },
    onSuccess: () => {
      clearSession();
      navigate('/login');
    },
  });

  const combinedActivity = useMemo(() => {
    const accountItems = (accountActivityQuery.data ?? []).map((item) => ({
      id: `account-${item._id}`,
      title: `${item.module}.${item.action}`,
      summary: item.metadata?.summary ? String(item.metadata.summary) : `Account ${item.action.replace(/\./g, ' ')}`,
      occurredAt: item.createdAt,
      tone: 'account' as const,
    }));

    const employeeItems = (employeeActivityQuery.data ?? []).map((item) => ({
      id: `employee-${item._id}`,
      title: item.action,
      summary: item.summary,
      occurredAt: item.occurredAt,
      tone: 'employee' as const,
    }));

    return [...accountItems, ...employeeItems]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 12);
  }, [accountActivityQuery.data, employeeActivityQuery.data]);

  const profileName = `${profileQuery.data?.firstName ?? authUser?.firstName ?? ''} ${profileQuery.data?.lastName ?? authUser?.lastName ?? ''}`.trim() || 'Portal User';
  const profileError = updateProfileMutation.isError ? getApiErrorMessage(updateProfileMutation.error, 'Profile could not be updated.') : null;
  const passwordError = changePasswordMutation.isError ? getApiErrorMessage(changePasswordMutation.error, 'Password could not be updated.') : null;
  const notificationError = updateNotificationPreferencesMutation.isError
    ? getApiErrorMessage(updateNotificationPreferencesMutation.error, 'Notification preferences could not be updated.')
    : null;
  const avatarError =
    updateAvatarMutation.isError || removeAvatarMutation.isError
      ? getApiErrorMessage(updateAvatarMutation.error ?? removeAvatarMutation.error, 'Profile photo could not be updated.')
      : null;

  if (
    profileQuery.isLoading ||
    notificationPreferencesQuery.isLoading ||
    sessionsQuery.isLoading ||
    accountActivityQuery.isLoading ||
    employeeActivityQuery.isLoading
  ) {
    return <LoadingState label="Loading settings..." />;
  }

  if (
    profileQuery.isError ||
    notificationPreferencesQuery.isError ||
    sessionsQuery.isError ||
    accountActivityQuery.isError ||
    employeeActivityQuery.isError
  ) {
    return <ErrorState label="Settings could not be loaded." />;
  }

  const setActiveSection = (section: SettingsSection) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('section', section);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[16rem,1fr]">
      <Card className="h-fit space-y-3 xl:sticky xl:top-8">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-secondary">Settings</p>
          <h3 className="mt-3 text-xl font-semibold text-white">Account center</h3>
          <p className="mt-2 text-sm text-white/55">Manage personal information, security, alerts, and workspace preferences from one place.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 xl:block xl:space-y-2 xl:overflow-visible">
          {settingsSections.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={cn(
                'min-w-[11rem] rounded-2xl border px-4 py-3 text-left transition xl:min-w-0 xl:w-full',
                activeSection === section.key
                  ? 'border-primary/40 bg-primary/12 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/68 hover:bg-white/6 hover:text-white',
              )}
            >
              <p className="font-medium">{section.label}</p>
              <p className="mt-1 text-xs text-white/45">{section.helper}</p>
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-6">
        {activeSection === 'profile' ? (
          <Card className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Profile Photo</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Personal profile</h3>
                <p className="mt-2 text-sm text-white/58">Keep your account recognizable and your personal contact details current.</p>
              </div>

              <div className="flex items-center gap-4">
                <UserAvatar name={profileName} src={profileQuery.data?.avatar} active={authUser?.isActive ?? true} size="lg" />
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-white">{profileName}</p>
                  <p className="text-sm text-white/55">{profileQuery.data?.designation ?? authUser?.role}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()}>
                      <Camera className="mr-2 h-4 w-4" />
                      {profileQuery.data?.avatar ? 'Change photo' : 'Upload photo'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      soundTone="none"
                      disabled={!profileQuery.data?.avatar || removeAvatarMutation.isPending}
                      onClick={() => removeAvatarMutation.mutate()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        updateAvatarMutation.mutate(file);
                      }
                      event.target.value = '';
                    }}
                  />
                  {avatarError ? <p className="text-sm text-rose-300">{avatarError}</p> : null}
                  {updateAvatarMutation.isSuccess || removeAvatarMutation.isSuccess ? (
                    <p className="text-sm text-emerald-300">Profile photo updated successfully.</p>
                  ) : null}
                </div>
              </div>
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={profileForm.handleSubmit((values) => updateProfileMutation.mutate(values))}>
              <div>
                <Input placeholder="First name" {...profileForm.register('firstName')} />
                {profileForm.formState.errors.firstName ? <p className="mt-1 text-xs text-rose-300">{profileForm.formState.errors.firstName.message}</p> : null}
              </div>
              <div>
                <Input placeholder="Last name" {...profileForm.register('lastName')} />
                {profileForm.formState.errors.lastName ? <p className="mt-1 text-xs text-rose-300">{profileForm.formState.errors.lastName.message}</p> : null}
              </div>
              <div className="md:col-span-2">
                <Input placeholder="Display name" {...profileForm.register('displayName')} />
              </div>
              <div>
                <Input type="email" placeholder="Work email" {...profileForm.register('email')} />
                {profileForm.formState.errors.email ? <p className="mt-1 text-xs text-rose-300">{profileForm.formState.errors.email.message}</p> : null}
              </div>
              <div>
                <Input placeholder="Phone number" {...profileForm.register('phone')} />
              </div>
              <div>
                <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...profileForm.register('timezone')}>
                  {timezones.map((timezone) => (
                    <option key={timezone} value={timezone}>
                      {timezone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...profileForm.register('workLocation')}>
                  {workLocationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Input placeholder="Country" {...profileForm.register('country')} />
              </div>

              <div className="md:col-span-2 space-y-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">Emergency contacts</p>
                    <p className="text-sm text-white/50">Add at least one contact HR can reach if needed.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    soundTone="none"
                    onClick={() => emergencyContacts.append({ name: '', relation: '', phone: '' })}
                  >
                    Add contact
                  </Button>
                </div>

                {emergencyContacts.fields.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                    No emergency contacts added yet.
                  </div>
                ) : (
                  emergencyContacts.fields.map((field, index) => (
                    <div key={field.id} className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr,1fr,1fr,auto]">
                      <Input placeholder="Contact name" {...profileForm.register(`emergencyContacts.${index}.name`)} />
                      <Input placeholder="Relation" {...profileForm.register(`emergencyContacts.${index}.relation`)} />
                      <Input placeholder="Phone" {...profileForm.register(`emergencyContacts.${index}.phone`)} />
                      <Button type="button" variant="outline" soundTone="none" onClick={() => emergencyContacts.remove(index)}>
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-3">
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? 'Saving profile...' : 'Save profile'}
                </Button>
                <Button type="button" variant="outline" soundTone="none" onClick={() => profileForm.reset()}>
                  Reset changes
                </Button>
              </div>
              <div className="md:col-span-2">
                {updateProfileMutation.isSuccess ? <p className="text-sm text-emerald-300">Profile updated successfully.</p> : null}
                {profileError ? <p className="text-sm text-rose-300">{profileError}</p> : null}
              </div>
            </form>
          </Card>
        ) : null}

        {activeSection === 'account' ? (
          <div className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
            <Card className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Account</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Portal identity</h3>
                <p className="mt-2 text-sm text-white/58">The core account fields and company role currently linked to this login.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/42">Role</p>
                  <p className="mt-2 text-lg font-semibold text-white">{authUser?.role}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/42">Designation</p>
                  <p className="mt-2 text-lg font-semibold text-white">{profileQuery.data?.designation ?? 'Not assigned'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/42">Department</p>
                  <p className="mt-2 text-lg font-semibold text-white">{profileQuery.data?.department?.name ?? 'Not assigned'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/42">Employee ID</p>
                  <p className="mt-2 text-lg font-semibold text-white">{profileQuery.data?.employeeId ?? 'Pending'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/42">Employment Type</p>
                  <p className="mt-2 text-lg font-semibold capitalize text-white">{profileQuery.data?.employmentType ?? 'Full-time'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/42">Last Login</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatDateTime(authUser?.lastLogin ?? undefined)}</p>
                </div>
              </div>
            </Card>

            <Card className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Account Care</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Ownership and support</h3>
                <p className="mt-2 text-sm text-white/58">Use Settings for day-to-day account updates. Sensitive account status changes remain controlled by HR or Super Admin.</p>
              </div>
              <div className="space-y-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="font-medium text-white">Email and identity</p>
                  <p className="mt-2 text-sm leading-6 text-white/55">Your name and work email can be updated from the Profile section. Changes are reflected across the portal and logged for traceability.</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="font-medium text-white">Deactivation and role changes</p>
                  <p className="mt-2 text-sm leading-6 text-white/55">Role changes, account disablement, or access removal are handled by HR or the Super Admin to keep company access governance consistent.</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="font-medium text-white">Reporting line</p>
                  <p className="mt-2 text-sm text-white/55">
                    {profileQuery.data?.reportingTo
                      ? `${profileQuery.data.reportingTo.firstName} ${profileQuery.data.reportingTo.lastName} | ${profileQuery.data.reportingTo.designation}`
                      : 'No reporting manager is currently linked to this profile.'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {activeSection === 'security' ? (
          <div className="grid gap-4 xl:grid-cols-[1fr,0.95fr]">
            <Card className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Security</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Password and access</h3>
                <p className="mt-2 text-sm text-white/58">Keep your credentials current and review where this account is signed in.</p>
              </div>

              <form className="grid gap-3" onSubmit={passwordForm.handleSubmit((values) => changePasswordMutation.mutate(values))}>
                <Input type="password" placeholder="Current password" {...passwordForm.register('currentPassword')} />
                {passwordForm.formState.errors.currentPassword ? <p className="text-sm text-rose-300">{passwordForm.formState.errors.currentPassword.message}</p> : null}
                <Input type="password" placeholder="New password" {...passwordForm.register('newPassword')} />
                {passwordForm.formState.errors.newPassword ? <p className="text-sm text-rose-300">{passwordForm.formState.errors.newPassword.message}</p> : null}
                <Input type="password" placeholder="Confirm new password" {...passwordForm.register('confirmPassword')} />
                {passwordForm.formState.errors.confirmPassword ? <p className="text-sm text-rose-300">{passwordForm.formState.errors.confirmPassword.message}</p> : null}
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={changePasswordMutation.isPending}>
                    {changePasswordMutation.isPending ? 'Updating password...' : 'Update password'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    soundTone="none"
                    disabled={logoutAllMutation.isPending}
                    onClick={() => logoutAllMutation.mutate()}
                  >
                    Log out all devices
                  </Button>
                </div>
              </form>

              {changePasswordMutation.isSuccess ? <p className="text-sm text-emerald-300">Password updated successfully.</p> : null}
              {passwordError ? <p className="text-sm text-rose-300">{passwordError}</p> : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/42">Password status</p>
                  <p className="mt-2 text-lg font-semibold text-white">{authUser?.mustChangePassword ? 'Temporary password in use' : 'Healthy'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/42">Active sessions</p>
                  <p className="mt-2 text-lg font-semibold text-white">{sessionsQuery.data?.filter((session) => session.active).length ?? 0}</p>
                </div>
              </div>
            </Card>

            <Card className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Devices</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Recent sign-ins</h3>
                <p className="mt-2 text-sm text-white/58">A recent view of devices and browsers that have held a refresh session for this account.</p>
              </div>
              <div className="space-y-3">
                {(sessionsQuery.data ?? []).map((session) => (
                  <div key={session.id} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-white">{describeSession(session)}</p>
                        <p className="mt-2 text-sm text-white/55">{session.ipAddress ? `IP ${session.ipAddress}` : 'IP not captured'}</p>
                        <p className="mt-1 text-sm text-white/45">Signed in {formatDateTime(session.createdAt)}</p>
                      </div>
                      <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]', session.active ? 'bg-emerald-500/14 text-emerald-300' : 'bg-white/8 text-white/55')}>
                        {session.active ? 'Active' : 'Expired'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : null}

        {activeSection === 'notifications' ? (
          <Card className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-secondary">Notifications</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">Delivery preferences</h3>
              <p className="mt-2 text-sm text-white/58">Control how operational alerts, announcements, and reminders reach you.</p>
            </div>

            <form className="space-y-4" onSubmit={notificationForm.handleSubmit((values) => updateNotificationPreferencesMutation.mutate(values))}>
              {(Object.keys(notificationForm.watch('preferences')) as Array<keyof NotificationFormValues['preferences']>).map((key) => (
                <div key={key} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium capitalize text-white">{key}</p>
                      <p className="mt-1 text-sm text-white/50">Choose whether this category should reach your inbox, the portal, or both.</p>
                    </div>
                    <BellRing className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white">
                      <span>Email notifications</span>
                      <input type="checkbox" className="h-4 w-4 accent-[#7F63F4]" {...notificationForm.register(`preferences.${key}.email`)} />
                    </label>
                    <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white">
                      <span>In-app notifications</span>
                      <input type="checkbox" className="h-4 w-4 accent-[#7F63F4]" {...notificationForm.register(`preferences.${key}.inApp`)} />
                    </label>
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={updateNotificationPreferencesMutation.isPending}>
                  {updateNotificationPreferencesMutation.isPending ? 'Saving preferences...' : 'Save preferences'}
                </Button>
                <Button type="button" variant="outline" soundTone="none" onClick={() => notificationForm.reset()}>
                  Reset changes
                </Button>
              </div>

              {updateNotificationPreferencesMutation.isSuccess ? <p className="text-sm text-emerald-300">Notification preferences updated successfully.</p> : null}
              {notificationError ? <p className="text-sm text-rose-300">{notificationError}</p> : null}
            </form>
          </Card>
        ) : null}

        {activeSection === 'preferences' ? (
          <div className="grid gap-4 lg:grid-cols-[1fr,0.95fr]">
            <Card className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Preferences</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Workspace behavior</h3>
                <p className="mt-2 text-sm text-white/58">Tune how the portal looks and feels during daily use.</p>
              </div>

              <div className="space-y-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">Theme</p>
                      <p className="mt-1 text-sm text-white/50">Switch between light and dark presentation without leaving the portal.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant={darkMode ? 'outline' : 'default'} soundTone="none" onClick={() => darkMode && toggleDarkMode()}>
                        <SunMedium className="mr-2 h-4 w-4" />
                        Light
                      </Button>
                      <Button type="button" variant={darkMode ? 'default' : 'outline'} soundTone="none" onClick={() => !darkMode && toggleDarkMode()}>
                        <MoonStar className="mr-2 h-4 w-4" />
                        Dark
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">Interface sound</p>
                      <p className="mt-1 text-sm text-white/50">Keep interaction sounds available for feedback, or disable them globally.</p>
                    </div>
                    <Button type="button" variant="outline" soundTone="none" onClick={() => toggleSoundEnabled()}>
                      {soundEnabled ? <Volume2 className="mr-2 h-4 w-4" /> : <VolumeX className="mr-2 h-4 w-4" />}
                      {soundEnabled ? 'Sound on' : 'Sound off'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Display Context</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Current workspace defaults</h3>
              </div>
              <div className="space-y-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3 text-secondary">
                    <Palette className="h-4 w-4" />
                    <p className="text-sm font-medium text-white">Theme mode</p>
                  </div>
                  <p className="mt-3 text-sm text-white/55">{darkMode ? 'Dark mode is active' : 'Light mode is active'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3 text-secondary">
                    <Clock3 className="h-4 w-4" />
                    <p className="text-sm font-medium text-white">Timezone</p>
                  </div>
                  <p className="mt-3 text-sm text-white/55">{profileQuery.data?.timezone ?? 'Asia/Karachi'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3 text-secondary">
                    <MapPin className="h-4 w-4" />
                    <p className="text-sm font-medium text-white">Work location</p>
                  </div>
                  <p className="mt-3 text-sm capitalize text-white/55">{profileQuery.data?.workLocation ?? 'onsite'}</p>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {activeSection === 'privacy' ? (
          <div className="grid gap-4 lg:grid-cols-[1fr,0.95fr]">
            <Card className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Privacy</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Internal visibility and audit policy</h3>
                <p className="mt-2 text-sm text-white/58">This portal is built for company operations, so profile changes and access events are intentionally traceable.</p>
              </div>
              <div className="space-y-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3 text-secondary">
                    <Eye className="h-4 w-4" />
                    <p className="font-medium text-white">Who can see your account details</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/55">HR, Super Admin, and relevant managers can view role, designation, department, and workforce records that are necessary for approvals, payroll, and delivery operations.</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3 text-secondary">
                    <ShieldCheck className="h-4 w-4" />
                    <p className="font-medium text-white">How updates are tracked</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/55">Profile edits, password changes, and key account actions are recorded so the company can investigate issues, verify changes, and maintain secure internal controls.</p>
                </div>
              </div>
            </Card>

            <Card className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Data Handling</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">What this setting area controls</h3>
              </div>
              <div className="space-y-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/55">
                  This settings area lets you update the profile information that is appropriate for self-service, such as your name, phone, timezone, work location, and notification preferences.
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/55">
                  More sensitive controls such as role changes, formal deactivation, payroll permissions, and company-wide access changes remain restricted to HR and Super Admin workflows.
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {activeSection === 'activity' ? (
          <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
            <Card className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Recent Activity</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Account and profile history</h3>
                <p className="mt-2 text-sm text-white/58">A chronological feed of recent account actions and personal profile updates.</p>
              </div>
              {combinedActivity.length > 0 ? (
                <div className="space-y-3">
                  {combinedActivity.map((item) => (
                    <div key={item.id} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">{item.title}</p>
                          <p className="mt-2 text-sm leading-6 text-white/55">{item.summary}</p>
                        </div>
                        <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]', item.tone === 'account' ? 'bg-secondary/16 text-secondary' : 'bg-emerald-500/14 text-emerald-300')}>
                          {item.tone}
                        </span>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/35">{formatDateTime(item.occurredAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState label="No recent activity is available for this account yet." />
              )}
            </Card>

            <Card className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Session Snapshot</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Login history</h3>
              </div>
              <div className="space-y-3">
                {(sessionsQuery.data ?? []).map((session) => (
                  <div key={session.id} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-white/8 p-2 text-secondary">
                          <LaptopMinimal className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{describeSession(session)}</p>
                          <p className="text-sm text-white/50">{formatDateTime(session.createdAt)}</p>
                        </div>
                      </div>
                      <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]', session.active ? 'bg-emerald-500/14 text-emerald-300' : 'bg-white/8 text-white/55')}>
                        {session.active ? 'Active' : 'Closed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : null}

        {activeSection === 'support' ? (
          <div className="grid gap-4 lg:grid-cols-[1fr,0.95fr]">
            <Card className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Support</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Help and account recovery</h3>
                <p className="mt-2 text-sm text-white/58">If you are blocked, need a reset, or require an access change, use the appropriate company support path.</p>
              </div>
              <div className="space-y-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3 text-secondary">
                    <KeyRound className="h-4 w-4" />
                    <p className="font-medium text-white">Password recovery</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/55">If you are locked out or no longer have your current password, contact HR or the Super Admin so a temporary password can be issued securely and rotated at next sign-in.</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-3 text-secondary">
                    <CircleHelp className="h-4 w-4" />
                    <p className="font-medium text-white">Access or role issues</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/55">If you can see the wrong portal sections or need role changes, use the HR or Super Admin access workflow instead of sharing credentials or making manual workarounds.</p>
                </div>
              </div>
            </Card>

            <Card className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">Company Contacts</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Official channels</h3>
              </div>
              <div className="space-y-3">
                <a
                  href={`mailto:${companyProfile.email}`}
                  className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/5 p-4 text-white/80 transition hover:bg-white/8 hover:text-white"
                >
                  <Mail className="h-4 w-4 text-secondary" />
                  <span>{companyProfile.email}</span>
                </a>
                <a
                  href={companyProfile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/5 p-4 text-white/80 transition hover:bg-white/8 hover:text-white"
                >
                  <MapPin className="h-4 w-4 text-secondary" />
                  <span>{companyProfile.website}</span>
                </a>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/55">
                  {companyProfile.offices[0].city} and {companyProfile.offices[1].city} teams use the same role-based platform model, with HR and Super Admin handling company-level credential and access governance.
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
};
