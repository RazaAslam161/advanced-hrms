import { useState } from 'react';
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
  const isSuperAdmin = user?.role === 'superAdmin';
  const canApplyOnBehalf = user?.role === 'admin';
  const [fileOnBehalf, setFileOnBehalf] = useState(false);

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

  const onBehalfSelectionMissing = canApplyOnBehalf && fileOnBehalf && !form.watch('employeeId');

  return (
    <div className="space-y-6">
      {!isSuperAdmin ? (
        <>
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[color:var(--color-heading)]">Apply for leave</h3>
              <p className="text-sm theme-muted">Submit your own leave request with half-day support, balance checks, and multi-step approvals.</p>
              <form data-testid="leave-request-form" className="mt-4 space-y-3" onSubmit={form.handleSubmit((values) => applyMutation.mutate(values))}>
              {canApplyOnBehalf ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <label className="flex items-center gap-2 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={fileOnBehalf}
                      onChange={(event) => {
                        setFileOnBehalf(event.target.checked);
                        if (!event.target.checked) {
                          form.setValue('employeeId', '');
                        }
                      }}
                    />
                    File this request on behalf of another employee
                  </label>
                  {fileOnBehalf ? (
                    <select className="field-select mt-3" {...form.register('employeeId')}>
                      <option value="">Select employee</option>
                      {(directoryQuery.data ?? []).map((employee) => (
                        <option key={employee._id} value={employee._id}>
                          {employee.firstName} {employee.lastName} ({employee.employeeId})
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              ) : null}
              <select className="field-select" {...form.register('leaveType')}>
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
              <Button data-testid="leave-submit" type="submit" disabled={applyMutation.isPending || onBehalfSelectionMissing}>
                {applyMutation.isPending ? 'Submitting...' : 'Submit Leave Request'}
              </Button>
              {onBehalfSelectionMissing ? <p className="text-sm text-amber-200">Select an employee to file this request on their behalf.</p> : null}
            </form>
            {applyMutation.isSuccess && <p className="mt-3 text-sm text-emerald-300">Leave request submitted successfully.</p>}
            {mutationError && <p className="text-sm text-rose-300">{mutationError}</p>}
            </div>
          </Card>
          <Card className="space-y-4">
            <h3 className="text-lg font-semibold text-[color:var(--color-heading)]">Leave balances</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(balancesQuery.data?.balances ?? {}).map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-subtle-bg)] p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-secondary">{key}</p>
                <p className="mt-2 text-3xl font-semibold text-[color:var(--color-heading)]">{Number(value) - Number(balancesQuery.data?.used?.[key] ?? 0)}</p>
                <p className="text-xs theme-muted">days remaining</p>
              </div>
            ))}
            </div>
          </Card>
        </>
      ) : null}

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
