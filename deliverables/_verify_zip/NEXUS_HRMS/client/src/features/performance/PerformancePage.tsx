import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/DataTable';
import { StatCard } from '../../components/StatCard';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { ClipboardList, Goal, Star, TrendingUp } from 'lucide-react';
import { getApiErrorMessage, toIsoDateTime, toLocalDateTimeInputValue } from '../../lib/utils';

interface CycleRow {
  _id: string;
  name: string;
  status: 'draft' | 'active' | 'completed';
  startDate: string;
  endDate: string;
}

interface ReviewRow {
  _id: string;
  overallRating: number;
  calibrationBand: string;
  status: string;
}

const cycleSchema = z
  .object({
    name: z.string().min(2),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
  })
  .refine((values) => new Date(values.endDate) >= new Date(values.startDate), {
    path: ['endDate'],
    message: 'End date must be after the start date',
  });

export const PerformancePage = () => {
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(cycleSchema),
    defaultValues: {
      name: 'Quarterly Review',
      startDate: toLocalDateTimeInputValue(new Date()),
      endDate: toLocalDateTimeInputValue(new Date()),
    },
  });

  const dashboardQuery = useQuery({
    queryKey: ['performance-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/performance/dashboard');
      return data.data;
    },
  });

  const cyclesQuery = useQuery({
    queryKey: ['review-cycles'],
    queryFn: async () => {
      const { data } = await api.get('/performance/cycles');
      return data.data as CycleRow[];
    },
  });

  const reviewsQuery = useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const { data } = await api.get('/performance/reviews');
      return data.data as ReviewRow[];
    },
  });

  const createCycleMutation = useMutation({
    mutationFn: async (values: { name: string; startDate: string; endDate: string }) => {
      await api.post('/performance/cycles', {
        ...values,
        startDate: toIsoDateTime(values.startDate),
        endDate: toIsoDateTime(values.endDate),
        ratingScale: [1, 2, 3, 4, 5],
        status: 'draft',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-cycles'] });
      form.reset({
        name: 'Quarterly Review',
        startDate: toLocalDateTimeInputValue(new Date()),
        endDate: toLocalDateTimeInputValue(new Date()),
      });
    },
  });

  const cycleActionMutation = useMutation({
    mutationFn: async (payload: { id: string; action: 'activate' | 'complete' | 'delete' }) => {
      if (payload.action === 'delete') {
        await api.delete(`/performance/cycles/${payload.id}`);
        return;
      }

      await api.patch(`/performance/cycles/${payload.id}`, {
        status: payload.action === 'activate' ? 'active' : 'completed',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });

  if (dashboardQuery.isLoading || cyclesQuery.isLoading || reviewsQuery.isLoading) {
    return <LoadingState label="Loading performance insights..." />;
  }

  if (dashboardQuery.isError || cyclesQuery.isError || reviewsQuery.isError) {
    return <ErrorState label="Performance data could not be loaded." />;
  }

  const mutationError =
    createCycleMutation.isError || cycleActionMutation.isError
      ? getApiErrorMessage(createCycleMutation.error ?? cycleActionMutation.error, 'Performance action could not be completed.')
      : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard label="Reviews" value={dashboardQuery.data.reviewCount} helper="Total reviews logged" icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard label="Avg Rating" value={dashboardQuery.data.averageRating} helper="Overall workforce rating" icon={<Star className="h-5 w-5" />} />
        <StatCard label="OKR Progress" value={`${dashboardQuery.data.okrProgress}%`} helper="Average objective progress" icon={<Goal className="h-5 w-5" />} />
        <StatCard label="Active PIPs" value={dashboardQuery.data.activePips} helper="Employees on improvement plans" icon={<TrendingUp className="h-5 w-5" />} />
      </div>
      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Create a review cycle</h3>
        <form className="flex flex-col gap-3 md:flex-row" onSubmit={form.handleSubmit((values) => createCycleMutation.mutate(values))}>
          <Input placeholder="Cycle name" {...form.register('name')} />
          <Input type="datetime-local" {...form.register('startDate')} />
          <Input type="datetime-local" {...form.register('endDate')} />
          <Button type="submit" disabled={createCycleMutation.isPending}>
            {createCycleMutation.isPending ? 'Saving...' : 'Save Cycle'}
          </Button>
        </form>
        {form.formState.errors.endDate ? <p className="text-sm text-rose-300">{form.formState.errors.endDate.message}</p> : null}
        {createCycleMutation.isSuccess && <p className="text-sm text-emerald-300">Review cycle saved successfully.</p>}
        {mutationError ? <p className="text-sm text-rose-300">{mutationError}</p> : null}
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <DataTable<CycleRow>
          title="Review Cycles"
          items={cyclesQuery.data ?? []}
          columns={[
            { key: 'name', header: 'Cycle' },
            { key: 'status', header: 'Status' },
            { key: 'startDate', header: 'Start', render: (item) => new Date(item.startDate).toLocaleDateString() },
            { key: 'endDate', header: 'End', render: (item) => new Date(item.endDate).toLocaleDateString() },
            {
              key: 'actions',
              header: 'Actions',
              render: (item) => (
                <div className="flex flex-wrap gap-2">
                  {item.status !== 'active' ? (
                    <Button type="button" onClick={() => cycleActionMutation.mutate({ id: item._id, action: 'activate' })} disabled={cycleActionMutation.isPending}>
                      Activate
                    </Button>
                  ) : (
                    <Button type="button" onClick={() => cycleActionMutation.mutate({ id: item._id, action: 'complete' })} disabled={cycleActionMutation.isPending}>
                      Mark complete
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={() => cycleActionMutation.mutate({ id: item._id, action: 'delete' })} disabled={cycleActionMutation.isPending}>
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
        <DataTable<ReviewRow>
          title="Performance Reviews"
          items={reviewsQuery.data ?? []}
          columns={[
            { key: '_id', header: 'Review ID' },
            { key: 'overallRating', header: 'Rating' },
            { key: 'calibrationBand', header: 'Bell Curve Band' },
            { key: 'status', header: 'Status' },
          ]}
        />
      </div>
    </div>
  );
};
