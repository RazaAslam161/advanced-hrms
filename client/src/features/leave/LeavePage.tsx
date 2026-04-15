import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/DataTable';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { hasPermission } from '../../lib/permissions';
import { getApiErrorMessage, toIsoDateTime, toLocalDateTimeInputValue } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

interface LeaveRow {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  employeeId?: {
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: { name: string };
  };
}

const leaveSchema = z.object({
  employeeId: z.string().optional(),
  leaveType: z.enum(['casual', 'sick', 'annual', 'unpaid', 'maternity', 'paternity']),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  halfDay: z.boolean().default(false),
  reason: z.string().min(5),
});

type LeaveFormValues = z.infer<typeof leaveSchema>;

export const LeavePage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canApprove = hasPermission(user?.permissions, 'leave.approve');
  const canApplyOnBehalf = user?.role === 'superAdmin' || hasPermission(user?.permissions, 'leave.manage');

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      employeeId: '',
      leaveType: 'casual',
      startDate: toLocalDateTimeInputValue(new Date()),
      endDate: toLocalDateTimeInputValue(new Date()),
      halfDay: false,
      reason: '',
    },
  });

  const balancesQuery = useQuery({
    queryKey: ['leave-balances'],
    queryFn: async () => {
      const { data } = await api.get('/leave/balances');
      return data.data;
    },
    enabled: user?.role !== 'superAdmin' && hasPermission(user?.permissions, 'leave.read'),
  });

  const requestsQuery = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const { data } = await api.get('/leave');
      return data.data as LeaveRow[];
    },
  });

  const directoryQuery = useQuery({
    queryKey: ['leave-directory'],
    queryFn: async () => {
      const { data } = await api.get('/employees/directory');
      return data.data as Array<{ _id: string; employeeId: string; firstName: string; lastName: string }>;
    },
    enabled: canApplyOnBehalf,
  });

  const applyMutation = useMutation({
    mutationFn: async (values: LeaveFormValues) => {
      await api.post('/leave/apply', {
        ...values,
        employeeId: values.employeeId || undefined,
        startDate: toIsoDateTime(values.startDate),
        endDate: toIsoDateTime(values.endDate),
      });
    },
    onSuccess: () => {
      form.reset({
        employeeId: '',
        leaveType: 'casual',
        startDate: toLocalDateTimeInputValue(new Date()),
        endDate: toLocalDateTimeInputValue(new Date()),
        halfDay: false,
        reason: '',
      });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async (payload: { id: string; status: 'approved' | 'rejected' }) => {
      await api.patch(`/leave/${payload.id}/approve`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  if (requestsQuery.isLoading || (user?.role !== 'superAdmin' && balancesQuery.isLoading) || (canApplyOnBehalf && directoryQuery.isLoading)) {
    return <LoadingState label="Loading leave workspace..." />;
  }

  if (requestsQuery.isError || (user?.role !== 'superAdmin' && balancesQuery.isError) || (canApplyOnBehalf && directoryQuery.isError)) {
    return <ErrorState label="Leave information could not be loaded." />;
  }

  const mutationError =
    applyMutation.isError || approvalMutation.isError
      ? getApiErrorMessage(applyMutation.error ?? approvalMutation.error, 'Leave action could not be completed.')
      : null;

  const employeeSelection = form.watch('employeeId');
  const superAdminSelectionMissing = user?.role === 'superAdmin' && !employeeSelection;

  return (
    <div className="space-y-6">
      <Card className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <div>
          <h3 className="text-lg font-semibold text-white">{canApplyOnBehalf ? 'Create a leave request' : 'Apply for leave'}</h3>
          <p className="text-sm text-white/55">
            {user?.role === 'superAdmin'
              ? 'Super Admin can create leave requests on behalf of employees.'
              : 'Support for half-day requests, balance checks, and multi-step approvals.'}
          </p>
          <form data-testid="leave-request-form" className="mt-4 space-y-3" onSubmit={form.handleSubmit((values) => applyMutation.mutate(values))}>
            {canApplyOnBehalf ? (
              <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...form.register('employeeId')}>
                <option value="">{user?.role === 'superAdmin' ? 'Select employee' : 'Create for myself or select employee'}</option>
                {(directoryQuery.data ?? []).map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.firstName} {employee.lastName} ({employee.employeeId})
                  </option>
                ))}
              </select>
            ) : null}
            <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...form.register('leaveType')}>
              <option value="casual">Casual</option>
              <option value="sick">Sick</option>
              <option value="annual">Annual</option>
              <option value="unpaid">Unpaid</option>
              <option value="maternity">Maternity</option>
              <option value="paternity">Paternity</option>
            </select>
            <Input type="datetime-local" {...form.register('startDate')} />
            <Input type="datetime-local" {...form.register('endDate')} />
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input type="checkbox" {...form.register('halfDay')} />
              Half day leave
            </label>
            <Textarea placeholder="Reason for leave" {...form.register('reason')} />
            <Button data-testid="leave-submit" type="submit" disabled={applyMutation.isPending || superAdminSelectionMissing}>
              {applyMutation.isPending ? 'Submitting...' : canApplyOnBehalf ? 'Submit leave request' : 'Submit Leave Request'}
            </Button>
            {superAdminSelectionMissing ? <p className="text-sm text-amber-200">Select an employee before creating a leave request from the Super Admin portal.</p> : null}
          </form>
          {applyMutation.isSuccess && <p className="mt-3 text-sm text-emerald-300">Leave request submitted successfully.</p>}
          {mutationError && <p className="mt-3 text-sm text-rose-300">{mutationError}</p>}
        </div>
        {user?.role === 'superAdmin' ? (
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/60">
            Super Admin does not submit personal leave from this portal. Use this panel to create leave requests for employees who need administrative support.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(balancesQuery.data.balances).map(([key, value]) => (
              <Card key={key} className="bg-white/5">
                <p className="text-sm uppercase tracking-[0.2em] text-secondary">{key}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{Number(value) - Number(balancesQuery.data.used[key])}</p>
                <p className="text-xs text-white/45">days remaining</p>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <DataTable<LeaveRow>
        title="Leave Requests"
        items={requestsQuery.data ?? []}
        columns={[
          { key: 'employee', header: 'Employee', render: (item) => (item.employeeId ? `${item.employeeId.firstName} ${item.employeeId.lastName}` : 'Self') },
          { key: 'leaveType', header: 'Type' },
          { key: 'startDate', header: 'Start', render: (item) => new Date(item.startDate).toLocaleDateString() },
          { key: 'endDate', header: 'End', render: (item) => new Date(item.endDate).toLocaleDateString() },
          { key: 'days', header: 'Days' },
          { key: 'status', header: 'Status' },
          {
            key: 'actions',
            header: 'Actions',
            render: (item) =>
              canApprove && (item.status === 'pendingManager' || item.status === 'pendingHR') ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => approvalMutation.mutate({ id: item._id, status: 'approved' })} disabled={approvalMutation.isPending}>
                    Approve
                  </Button>
                  <Button type="button" variant="outline" onClick={() => approvalMutation.mutate({ id: item._id, status: 'rejected' })} disabled={approvalMutation.isPending}>
                    Reject
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-white/45">No action</span>
              ),
          },
        ]}
      />
    </div>
  );
};
