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
import { getApiErrorMessage, toIsoDateTime, toLocalDateTimeInputValue } from '../../lib/utils';
interface LeaveRow {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
}

const leaveSchema = z.object({
  leaveType: z.enum(['casual', 'sick', 'annual', 'unpaid', 'maternity', 'paternity']),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  halfDay: z.boolean().default(false),
  reason: z.string().min(5),
});

type LeaveFormValues = z.infer<typeof leaveSchema>;

export const LeavePage = () => {
  const queryClient = useQueryClient();
  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
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
  });

  const requestsQuery = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const { data } = await api.get('/leave');
      return data.data as LeaveRow[];
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (values: LeaveFormValues) => {
      await api.post('/leave/apply', {
        ...values,
        startDate: toIsoDateTime(values.startDate),
        endDate: toIsoDateTime(values.endDate),
      });
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    },
  });

  if (balancesQuery.isLoading || requestsQuery.isLoading) {
    return <LoadingState label="Loading leave workspace..." />;
  }

  if (balancesQuery.isError || requestsQuery.isError) {
    return <ErrorState label="Leave information could not be loaded." />;
  }

  const mutationError = applyMutation.isError ? getApiErrorMessage(applyMutation.error, 'Leave request could not be submitted.') : null;

  return (
    <div className="space-y-6">
      <Card className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <div>
          <h3 className="text-lg font-semibold text-white">Apply for leave</h3>
          <p className="text-sm text-white/55">Support for half-day requests, balance checks, and multi-step approvals.</p>
          <form className="mt-4 space-y-3" onSubmit={form.handleSubmit((values) => applyMutation.mutate(values))}>
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
            <Button type="submit" disabled={applyMutation.isPending}>
              {applyMutation.isPending ? 'Submitting...' : 'Submit Leave Request'}
            </Button>
          </form>
          {applyMutation.isSuccess && <p className="mt-3 text-sm text-emerald-600">Leave request submitted successfully.</p>}
          {mutationError && <p className="mt-3 text-sm text-red-500">{mutationError}</p>}
        </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(balancesQuery.data.balances).map(([key, value]) => (
            <Card key={key} className="bg-white/5">
              <p className="text-sm uppercase tracking-[0.2em] text-secondary">{key}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{Number(value) - Number(balancesQuery.data.used[key])}</p>
              <p className="text-xs text-white/45">days remaining</p>
            </Card>
          ))}
        </div>
      </Card>
      <DataTable<LeaveRow>
        title="Leave Requests"
        items={requestsQuery.data ?? []}
        columns={[
          { key: 'leaveType', header: 'Type' },
          { key: 'startDate', header: 'Start', render: (item) => new Date(item.startDate).toLocaleDateString() },
          { key: 'endDate', header: 'End', render: (item) => new Date(item.endDate).toLocaleDateString() },
          { key: 'days', header: 'Days' },
          { key: 'status', header: 'Status' },
        ]}
      />
    </div>
  );
};
