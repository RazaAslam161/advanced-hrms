import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { DataTable } from '../../components/DataTable';
import { formatDate, getApiErrorMessage } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import type { Department } from '../../types';
import { permissionGroups } from '../../lib/permissions';

interface ManagedUser {
  id: string;
  _id?: string;
  email: string;
  role: 'superAdmin' | 'admin' | 'manager' | 'employee' | 'recruiter';
  permissions: string[];
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLogin?: string;
  mustChangePassword?: boolean;
  createdAt: string;
}

const optionalStrongPassword = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || value.length >= 10, 'Password must be at least 10 characters')
  .refine((value) => value.length === 0 || /[A-Z]/.test(value), 'Password must include an uppercase letter')
  .refine((value) => value.length === 0 || /[a-z]/.test(value), 'Password must include a lowercase letter')
  .refine((value) => value.length === 0 || /[0-9]/.test(value), 'Password must include a number');

const accountSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['superAdmin', 'admin', 'manager', 'employee', 'recruiter']),
  department: z.string().optional(),
  designation: z.string().min(2),
  password: optionalStrongPassword.optional(),
});

const transferSchema = z.object({
  currentPassword: z.string().min(1),
  targetUserId: z.string().min(1),
});

type AccountFormValues = z.infer<typeof accountSchema>;
type TransferFormValues = z.infer<typeof transferSchema>;

const roleLabels: Record<ManagedUser['role'], string> = {
  superAdmin: 'Super Admin',
  admin: 'HR',
  manager: 'Manager',
  employee: 'Employee',
  recruiter: 'Recruiter',
};

const defaultDesignationByRole: Record<ManagedUser['role'], string> = {
  superAdmin: 'Super Admin',
  admin: 'HR Admin',
  manager: 'Team Manager',
  employee: 'Employee',
  recruiter: 'Recruiter',
};

export const AccessControlPage = () => {
  const queryClient = useQueryClient();
  const auth = useAuthStore();
  const [issuedCredentials, setIssuedCredentials] = useState<{ email: string; password: string; label: string } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedActive, setSelectedActive] = useState(true);

  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'employee',
      department: '',
      designation: 'Employee',
      password: '',
    },
  });

  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      currentPassword: '',
      targetUserId: '',
    },
  });

  const selectedRole = accountForm.watch('role');

  useEffect(() => {
    accountForm.setValue('designation', defaultDesignationByRole[selectedRole], { shouldValidate: false });
  }, [accountForm, selectedRole]);

  const usersQuery = useQuery({
    queryKey: ['auth-users'],
    queryFn: async () => {
      const { data } = await api.get('/auth/users');
      return (data.data as ManagedUser[]).map((user) => ({ ...user, _id: user.id }));
    },
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments-for-access'],
    queryFn: async () => {
      const { data } = await api.get('/departments', { params: { limit: 100 } });
      return data.data as Department[];
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: async (values: AccountFormValues) => {
      const { data } = await api.post('/auth/register', {
        ...values,
        department: values.department?.trim() ? values.department.trim() : undefined,
        password: values.password?.trim() ? values.password.trim() : undefined,
      });
      return data.data as { user: ManagedUser; generatedPassword?: string };
    },
    onSuccess: (payload) => {
      accountForm.reset({
        firstName: '',
        lastName: '',
        email: '',
        role: 'employee',
        department: '',
        designation: 'Employee',
        password: '',
      });
      setIssuedCredentials(
        payload.generatedPassword
          ? {
              email: payload.user.email,
              password: payload.generatedPassword,
              label: `${payload.user.firstName} ${payload.user.lastName}`,
            }
          : null,
      );
      queryClient.invalidateQueries({ queryKey: ['auth-users'] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post(`/auth/users/${userId}/reset-password`);
      return data.data as { email: string; generatedPassword: string };
    },
    onSuccess: (payload) => {
      setIssuedCredentials({
        email: payload.email,
        password: payload.generatedPassword,
        label: 'Temporary password reset',
      });
      queryClient.invalidateQueries({ queryKey: ['auth-users'] });
    },
  });

  const updateAccessMutation = useMutation({
    mutationFn: async (payload: { id: string; permissions: string[]; isActive: boolean }) => {
      const { data } = await api.patch(`/auth/users/${payload.id}`, {
        permissions: payload.permissions,
        isActive: payload.isActive,
      });
      return data.data as ManagedUser;
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ['auth-users'] });
      setSelectedPermissions(payload.permissions);
      setSelectedActive(payload.isActive);
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (values: TransferFormValues) => {
      const { data } = await api.post('/auth/transfer-super-admin', values);
      return data.data as { newSuperAdmin: { email: string } };
    },
    onSuccess: () => {
      auth.clearSession();
      window.location.assign('/login');
    },
  });

  const summary = useMemo(() => {
    const users = usersQuery.data ?? [];
    return {
      total: users.length,
      pendingPasswordChange: users.filter((user) => user.mustChangePassword).length,
      active: users.filter((user) => user.isActive).length,
      hrSeats: users.filter((user) => user.role === 'admin').length,
    };
  }, [usersQuery.data]);

  const selectedUser = useMemo(
    () => (usersQuery.data ?? []).find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, usersQuery.data],
  );

  useEffect(() => {
    if (!selectedUserId && usersQuery.data?.length) {
      setSelectedUserId(usersQuery.data[0].id);
    }
  }, [selectedUserId, usersQuery.data]);

  useEffect(() => {
    if (!selectedUser) {
      return;
    }
    setSelectedPermissions(selectedUser.permissions);
    setSelectedActive(selectedUser.isActive);
  }, [selectedUser]);

  if (usersQuery.isLoading || departmentsQuery.isLoading) {
    return <LoadingState label="Loading access control workspace..." />;
  }

  if (usersQuery.isError || departmentsQuery.isError) {
    return <ErrorState label="Access control data could not be loaded." />;
  }

  const createError = createAccountMutation.isError ? getApiErrorMessage(createAccountMutation.error, 'Account could not be created.') : null;
  const accessError = updateAccessMutation.isError ? getApiErrorMessage(updateAccessMutation.error, 'Access changes could not be saved.') : null;
  const transferError = transferMutation.isError ? getApiErrorMessage(transferMutation.error, 'Authority transfer failed.') : null;

  const togglePermission = (permission: string) => {
    setSelectedPermissions((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    );
  };

  const canEditSelectedUser = selectedUser && !(selectedUser.role === 'superAdmin' && auth.user?.role !== 'superAdmin');

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-secondary">Accounts</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.total}</p>
          <p className="mt-1 text-sm text-white/55">Provisioned company logins</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-secondary">Active</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.active}</p>
          <p className="mt-1 text-sm text-white/55">Users with access enabled</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-secondary">Password Rotation</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.pendingPasswordChange}</p>
          <p className="mt-1 text-sm text-white/55">Users forced to update temporary passwords</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-secondary">HR Seats</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary.hrSeats}</p>
          <p className="mt-1 text-sm text-white/55">Admins operating the HR portal</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Provision unique login credentials</h3>
            <p className="text-sm text-white/55">Create company logins by role. Leave the password empty to issue a temporary password that must be changed on first use.</p>
          </div>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={accountForm.handleSubmit((values) => createAccountMutation.mutate(values))}>
            <Input placeholder="First name" {...accountForm.register('firstName')} />
            <Input placeholder="Last name" {...accountForm.register('lastName')} />
            <Input placeholder="Work email" {...accountForm.register('email')} />
            <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...accountForm.register('role')}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">HR</option>
              <option value="recruiter">Recruiter</option>
              {auth.user?.role === 'superAdmin' ? <option value="superAdmin">Super Admin</option> : null}
            </select>
            <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...accountForm.register('department')}>
              <option value="">Select department</option>
              {(departmentsQuery.data ?? []).map((department) => (
                <option key={department._id} value={department._id}>
                  {department.name}
                </option>
              ))}
            </select>
            <div className="md:col-span-2">
              <Input placeholder="Designation" {...accountForm.register('designation')} />
              {accountForm.formState.errors.designation ? <p className="mt-1 text-xs text-rose-300">{accountForm.formState.errors.designation.message}</p> : null}
            </div>
            <div className="md:col-span-2">
              <Input type="password" placeholder="Optional custom password" {...accountForm.register('password')} />
              {accountForm.formState.errors.password ? <p className="mt-1 text-xs text-rose-300">{accountForm.formState.errors.password.message}</p> : null}
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={createAccountMutation.isPending}>
                {createAccountMutation.isPending ? 'Provisioning account...' : 'Provision account'}
              </Button>
            </div>
          </form>
          {createAccountMutation.isSuccess ? <p className="text-sm text-emerald-300">Account provisioned successfully.</p> : null}
          {createError ? <p className="text-sm text-rose-300">{createError}</p> : null}
        </Card>

        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Issued credentials</h3>
            <p className="text-sm text-white/55">Use this panel to hand over temporary credentials securely after account creation or reset.</p>
          </div>
          {issuedCredentials ? (
            <div className="rounded-[1.4rem] border border-primary/30 bg-primary/10 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-secondary">{issuedCredentials.label}</p>
              <p className="mt-4 text-sm text-white/55">Email</p>
              <p className="font-medium text-white">{issuedCredentials.email}</p>
              <p className="mt-4 text-sm text-white/55">Temporary password</p>
              <p className="font-medium text-white">{issuedCredentials.password}</p>
              <p className="mt-4 text-xs text-white/45">This password is only shown once here. The user should change it immediately after sign-in.</p>
            </div>
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
              No new credentials issued in this session yet.
            </div>
          )}
          {auth.user?.role === 'superAdmin' ? (
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-secondary">Super Admin authority handover</p>
              <p className="mt-2 text-sm text-white/55">If the CEO authority changes, transfer Super Admin to another company account. This logs out the current user immediately.</p>
              <form className="mt-4 grid gap-3" onSubmit={transferForm.handleSubmit((values) => transferMutation.mutate(values))}>
                <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...transferForm.register('targetUserId')}>
                  <option value="">Select target account</option>
                  {(usersQuery.data ?? [])
                    .filter((user) => user.id !== auth.user?.id)
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} | {roleLabels[user.role]}
                      </option>
                    ))}
                </select>
                <Input type="password" placeholder="Confirm your current password" {...transferForm.register('currentPassword')} />
                <Button type="submit" variant="outline" disabled={transferMutation.isPending}>
                  {transferMutation.isPending ? 'Transferring authority...' : 'Transfer Super Admin authority'}
                </Button>
              </form>
              {transferError ? <p className="mt-3 text-sm text-rose-300">{transferError}</p> : null}
            </div>
          ) : (
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5 text-sm text-white/55">
              HR admins can provision and reset credentials. Only the current Super Admin can transfer company authority.
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
        <DataTable
          title="Company Access Registry"
          items={usersQuery.data ?? []}
          columns={[
            { key: 'name', header: 'User', render: (item) => `${item.firstName} ${item.lastName}` },
            { key: 'email', header: 'Email' },
            { key: 'role', header: 'Portal', render: (item) => roleLabels[item.role] },
            { key: 'status', header: 'Status', render: (item) => <Badge>{item.isActive ? 'Active' : 'Disabled'}</Badge> },
            { key: 'password', header: 'Password State', render: (item) => <Badge>{item.mustChangePassword ? 'Must change' : 'Current'}</Badge> },
            {
              key: 'lastLogin',
              header: 'Last Login',
              render: (item) => (item.lastLogin ? formatDate(item.lastLogin) : 'No login yet'),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (item) => (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" soundTone="none" onClick={() => setSelectedUserId(item.id)}>
                    Manage access
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={resetPasswordMutation.isPending}
                    onClick={() => resetPasswordMutation.mutate(item.id)}
                  >
                    Reset password
                  </Button>
                </div>
              ),
            },
          ]}
        />

        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Account detail and permissions</h3>
            <p className="text-sm text-white/55">Select an account from the registry to add or remove permissions and control whether the login stays active.</p>
          </div>
          {selectedUser ? (
            <>
              <div className="rounded-[1.3rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">{roleLabels[selectedUser.role]}</p>
                <p className="mt-2 text-lg font-semibold text-white">{selectedUser.firstName} {selectedUser.lastName}</p>
                <p className="text-sm text-white/55">{selectedUser.email}</p>
                <p className="mt-3 text-sm text-white/60">{selectedPermissions.length} permissions selected</p>
              </div>

              <label className="flex items-center justify-between rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                <span>Account active</span>
                <input
                  type="checkbox"
                  checked={selectedActive}
                  disabled={selectedUser.role === 'superAdmin'}
                  onChange={(event) => setSelectedActive(event.target.checked)}
                  className="h-4 w-4 accent-[#7F63F4]"
                />
              </label>

              <div className="max-h-[26rem] space-y-4 overflow-y-auto pr-2">
                {Object.entries(permissionGroups).map(([group, permissions]) => (
                  <div key={group} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-secondary">{group}</p>
                    <div className="mt-3 grid gap-2">
                      {permissions.map((permission) => (
                        <label key={permission} className="flex items-center gap-3 text-sm text-white/78">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#7F63F4]"
                            checked={selectedPermissions.includes(permission)}
                            disabled={!canEditSelectedUser}
                            onChange={() => togglePermission(permission)}
                          />
                          <span>{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  disabled={!canEditSelectedUser || updateAccessMutation.isPending}
                  onClick={() =>
                    selectedUser &&
                    updateAccessMutation.mutate({
                      id: selectedUser.id,
                      permissions: selectedPermissions,
                      isActive: selectedActive,
                    })
                  }
                >
                  {updateAccessMutation.isPending ? 'Saving access...' : 'Save access changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  soundTone="none"
                  onClick={() => {
                    if (!selectedUser) {
                      return;
                    }
                    setSelectedPermissions(selectedUser.permissions);
                    setSelectedActive(selectedUser.isActive);
                  }}
                >
                  Reset changes
                </Button>
              </div>
              {updateAccessMutation.isSuccess ? <p className="text-sm text-emerald-300">Access settings updated successfully.</p> : null}
              {accessError ? <p className="text-sm text-rose-300">{accessError}</p> : null}
            </>
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
              Select an account from the registry to manage permissions.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
