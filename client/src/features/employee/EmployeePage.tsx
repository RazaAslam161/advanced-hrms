import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { Badge } from '../../components/ui/badge';
import { hasAnyPermission } from '../../lib/permissions';
import { formatCurrency, getApiErrorMessage, toIsoDateTime, toLocalDateTimeInputValue } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import type { Department, Employee } from '../../types';

const employeeSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['superAdmin', 'admin', 'manager', 'employee', 'recruiter']).default('employee'),
  department: z.string().optional(),
  designation: z.string().min(2),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'intern']),
  joiningDate: z.string().min(1),
  status: z.enum(['active', 'probation', 'inactive', 'terminated']).default('active'),
  salary: z.object({
    basic: z.coerce.number().min(0),
    houseRent: z.coerce.number().min(0).default(0),
    medical: z.coerce.number().min(0).default(0),
    transport: z.coerce.number().min(0).default(0),
    currency: z.string().default('PKR'),
    bonus: z.coerce.number().min(0).default(0),
  }),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

const emptyFormValues = (): EmployeeFormValues => ({
  firstName: '',
  lastName: '',
  email: '',
  role: 'employee',
  department: '',
  designation: '',
  employmentType: 'full-time',
  joiningDate: toLocalDateTimeInputValue(new Date()),
  status: 'active',
  salary: { basic: 100000, houseRent: 0, medical: 0, transport: 0, currency: 'PKR', bonus: 0 },
});

export const EmployeePage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [issuedCredentials, setIssuedCredentials] = useState<{ email: string; password: string; role: string } | null>(null);
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: emptyFormValues(),
  });

  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await api.get('/employees');
      return data.data as Employee[];
    },
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments-for-employees'],
    queryFn: async () => {
      const { data } = await api.get('/departments', { params: { limit: 100 } });
      return data.data as Department[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      const { data } = await api.post('/employees', {
        ...values,
        department: values.department?.trim() ? values.department.trim() : undefined,
        joiningDate: toIsoDateTime(values.joiningDate),
        timezone: 'Asia/Karachi',
        workLocation: 'onsite',
        country: 'Pakistan',
        emergencyContacts: [],
        skills: [],
      });
      return data.data as {
        employee: Employee;
        credentials: {
          email: string;
          role: string;
          generatedPassword?: string;
        };
      };
    },
    onSuccess: (payload) => {
      form.reset(emptyFormValues());
      setEditingEmployeeId(null);
      setIssuedCredentials(
        payload.credentials.generatedPassword
          ? {
              email: payload.credentials.email,
              password: payload.credentials.generatedPassword,
              role: payload.credentials.role,
            }
          : null,
      );
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; values: Partial<EmployeeFormValues> }) => {
      const { data } = await api.patch(`/employees/${payload.id}`, payload.values);
      return data.data as Employee;
    },
    onSuccess: () => {
      form.reset(emptyFormValues());
      setEditingEmployeeId(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const canManageEmployees = hasAnyPermission(user?.permissions, ['employees.create', 'employees.update', 'employees.delete']);

  const mutationError = useMemo(() => {
    if (createMutation.isError) {
      return getApiErrorMessage(createMutation.error, 'Employee could not be created.');
    }
    if (updateMutation.isError) {
      return getApiErrorMessage(updateMutation.error, 'Employee could not be updated.');
    }
    if (archiveMutation.isError) {
      return getApiErrorMessage(archiveMutation.error, 'Employee could not be archived.');
    }
    return null;
  }, [archiveMutation.error, archiveMutation.isError, createMutation.error, createMutation.isError, updateMutation.error, updateMutation.isError]);

  if (employeesQuery.isLoading || departmentsQuery.isLoading) {
    return <LoadingState label="Loading employee directory..." />;
  }

  if (employeesQuery.isError || departmentsQuery.isError) {
    return <ErrorState label="Employee data could not be loaded." />;
  }

  const applyEmployeeToForm = (employee: Employee) => {
    setEditingEmployeeId(employee._id);
    form.reset({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: employee.role ?? 'employee',
      department: employee.department?._id ?? '',
      designation: employee.designation,
      employmentType: employee.employmentType as EmployeeFormValues['employmentType'],
      joiningDate: toLocalDateTimeInputValue(employee.joiningDate ?? new Date()),
      status: (employee.status as EmployeeFormValues['status']) ?? 'active',
      salary: {
        basic: employee.salary?.basic ?? 0,
        houseRent: employee.salary?.houseRent ?? 0,
        medical: employee.salary?.medical ?? 0,
        transport: employee.salary?.transport ?? 0,
        currency: employee.salary?.currency ?? 'PKR',
        bonus: employee.salary?.bonus ?? 0,
      },
    });
    setIssuedCredentials(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {canManageEmployees ? (
        <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{editingEmployeeId ? 'Edit team member' : 'Add team member'}</h3>
              <p className="text-sm text-white/55">Create the employee profile, issue unique credentials, or update role and status from the same workspace.</p>
            </div>
            <form
              data-testid="employee-create-form"
              className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
              onSubmit={form.handleSubmit((values) => {
                const payload = {
                  ...values,
                  department: values.department?.trim() ? values.department.trim() : undefined,
                  joiningDate: toIsoDateTime(values.joiningDate),
                  timezone: 'Asia/Karachi',
                  workLocation: 'onsite',
                  country: 'Pakistan',
                  emergencyContacts: [],
                  skills: [],
                };

                if (editingEmployeeId) {
                  updateMutation.mutate({ id: editingEmployeeId, values: payload });
                  return;
                }

                createMutation.mutate(values);
              })}
            >
              <Input placeholder="First name" {...form.register('firstName')} />
              <Input placeholder="Last name" {...form.register('lastName')} />
              <Input placeholder="Work email" {...form.register('email')} />
              <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...form.register('role')}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">HR</option>
                <option value="recruiter">Recruiter</option>
              </select>
              <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...form.register('department')}>
                <option value="">Select department</option>
                {(departmentsQuery.data ?? []).map((department) => (
                  <option key={department._id} value={department._id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <Input placeholder="Designation" {...form.register('designation')} />
              <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...form.register('employmentType')}>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
              <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...form.register('status')}>
                <option value="active">Active</option>
                <option value="probation">Probation</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
              <Input type="datetime-local" {...form.register('joiningDate')} />
              <Input type="number" placeholder="Basic salary" {...form.register('salary.basic')} />
              <Input type="number" placeholder="House rent" {...form.register('salary.houseRent')} />
              <Input type="number" placeholder="Medical" {...form.register('salary.medical')} />
              <Input type="number" placeholder="Transport" {...form.register('salary.transport')} />
              <div className="flex gap-3 md:col-span-2 xl:col-span-3">
                <Button data-testid="employee-create-submit" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingEmployeeId
                    ? updateMutation.isPending
                      ? 'Saving employee...'
                      : 'Save employee'
                    : createMutation.isPending
                      ? 'Saving employee...'
                      : 'Create employee and credentials'}
                </Button>
                {editingEmployeeId ? (
                  <Button
                    type="button"
                    variant="outline"
                    soundTone="none"
                    onClick={() => {
                      setEditingEmployeeId(null);
                      form.reset(emptyFormValues());
                    }}
                  >
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </form>
            {createMutation.isSuccess && <p className="text-sm text-emerald-300">Employee account created successfully.</p>}
            {updateMutation.isSuccess && <p className="text-sm text-emerald-300">Employee profile updated successfully.</p>}
            {mutationError && <p className="text-sm text-rose-300">{mutationError}</p>}
          </Card>
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Issued credentials</h3>
              <p className="text-sm text-white/55">Temporary passwords are generated automatically so each individual gets a unique login on first access.</p>
            </div>
            {issuedCredentials ? (
              <div data-testid="issued-credentials-card" className="rounded-[1.4rem] border border-primary/30 bg-primary/10 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">{issuedCredentials.role} portal</p>
                <p className="mt-4 text-sm text-white/55">Email</p>
                <p data-testid="issued-credentials-email" className="font-medium text-white">{issuedCredentials.email}</p>
                <p className="mt-4 text-sm text-white/55">Temporary password</p>
                <p data-testid="issued-credentials-password" className="font-medium text-white">{issuedCredentials.password}</p>
              </div>
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
                No new credentials issued yet in this session.
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card>
          <h3 className="text-lg font-semibold text-white">Employee directory</h3>
          <p className="mt-2 text-sm text-white/55">Managers can review the directory here. Account creation is restricted to the Super Admin and HR portal.</p>
        </Card>
      )}

      <DataTable
        title="Employees"
        items={employeesQuery.data ?? []}
        columns={[
          { key: 'employeeId', header: 'Employee ID' },
          { key: 'fullName', header: 'Name', render: (item) => `${item.firstName} ${item.lastName}` },
          { key: 'department', header: 'Department', render: (item) => item.department?.name ?? 'Not assigned' },
          { key: 'designation', header: 'Designation' },
          { key: 'status', header: 'Status', render: (item) => <Badge>{item.status}</Badge> },
          { key: 'employmentType', header: 'Type' },
          { key: 'salary', header: 'Basic Salary', render: (item) => formatCurrency(item.salary?.basic ?? 0, item.salary?.currency ?? 'PKR') },
          {
            key: 'actions',
            header: 'Actions',
            render: (item) =>
              canManageEmployees ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" soundTone="none" onClick={() => applyEmployeeToForm(item)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      updateMutation.mutate({
                        id: item._id,
                        values: {
                          status: item.status === 'active' ? 'inactive' : 'active',
                        },
                      })
                    }
                  >
                    {item.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button type="button" variant="outline" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate(item._id)}>
                    Archive
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-white/45">View only</span>
              ),
          },
        ]}
      />
    </div>
  );
};
