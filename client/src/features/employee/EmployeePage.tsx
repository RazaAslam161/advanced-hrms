import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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

export const EmployeePage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [issuedCredentials, setIssuedCredentials] = useState<{ email: string; password: string; role: string } | null>(null);
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'employee',
      department: '',
      designation: '',
      employmentType: 'full-time',
      joiningDate: toLocalDateTimeInputValue(new Date()),
      salary: { basic: 100000, houseRent: 0, medical: 0, transport: 0, currency: 'PKR', bonus: 0 },
    },
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
        joiningDate: toIsoDateTime(values.joiningDate),
        timezone: 'Asia/Karachi',
        workLocation: 'onsite',
        country: 'Pakistan',
        status: 'active',
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
      form.reset();
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

  if (employeesQuery.isLoading || departmentsQuery.isLoading) {
    return <LoadingState label="Loading employee directory..." />;
  }

  if (employeesQuery.isError || departmentsQuery.isError) {
    return <ErrorState label="Employee data could not be loaded." />;
  }

  const mutationError = createMutation.isError ? getApiErrorMessage(createMutation.error, 'Employee could not be created.') : null;
  const canCreateEmployees = user?.role === 'superAdmin' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      {canCreateEmployees ? (
        <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Add team member</h3>
              <p className="text-sm text-white/55">Create the employee profile and issue unique portal credentials in one step.</p>
            </div>
            <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
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
              <Input type="datetime-local" {...form.register('joiningDate')} />
              <Input type="number" placeholder="Basic salary" {...form.register('salary.basic')} />
              <div className="md:col-span-2 xl:col-span-3">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving employee...' : 'Create employee and credentials'}
                </Button>
              </div>
            </form>
            {createMutation.isSuccess && <p className="text-sm text-emerald-300">Employee account created successfully.</p>}
            {mutationError && <p className="text-sm text-rose-300">{mutationError}</p>}
          </Card>
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Issued credentials</h3>
              <p className="text-sm text-white/55">Temporary passwords are generated automatically so each individual gets a unique login on first access.</p>
            </div>
            {issuedCredentials ? (
              <div className="rounded-[1.4rem] border border-primary/30 bg-primary/10 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">{issuedCredentials.role} portal</p>
                <p className="mt-4 text-sm text-white/55">Email</p>
                <p className="font-medium text-white">{issuedCredentials.email}</p>
                <p className="mt-4 text-sm text-white/55">Temporary password</p>
                <p className="font-medium text-white">{issuedCredentials.password}</p>
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
          { key: 'designation', header: 'Designation' },
          { key: 'status', header: 'Status', render: (item) => <Badge>{item.status}</Badge> },
          { key: 'employmentType', header: 'Type' },
          { key: 'salary', header: 'Basic Salary', render: (item) => formatCurrency(item.salary?.basic ?? 0, item.salary?.currency ?? 'PKR') },
        ]}
      />
    </div>
  );
};
