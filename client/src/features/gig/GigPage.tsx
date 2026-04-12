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
import { useAuthStore } from '../../store/authStore';
import { getApiErrorMessage } from '../../lib/utils';

const gigSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  ownerId: z.string().min(1),
});

export const GigPage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canCreateGig = user?.role === 'superAdmin' || user?.role === 'admin' || user?.role === 'manager';
  const form = useForm({
    resolver: zodResolver(gigSchema),
  });

  const meQuery = useQuery({
    queryKey: ['employee-me'],
    queryFn: async () => {
      const { data } = await api.get('/employees/me');
      return data.data as { _id: string; employeeId: string; firstName: string; lastName: string };
    },
  });

  const directoryQuery = useQuery({
    queryKey: ['employee-directory'],
    queryFn: async () => {
      const { data } = await api.get('/employees/directory');
      return data.data as Array<{ _id: string; employeeId: string; firstName: string; lastName: string }>;
    },
  });

  const gigsQuery = useQuery({
    queryKey: ['gigs'],
    queryFn: async () => {
      const { data } = await api.get('/gigs');
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      await api.post('/gigs', { ...values, skillTags: [], status: 'open' });
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
    },
  });

  if (gigsQuery.isLoading || meQuery.isLoading || directoryQuery.isLoading) {
    return <LoadingState label="Loading internal gig marketplace..." />;
  }

  if (gigsQuery.isError || meQuery.isError || directoryQuery.isError) {
    return <ErrorState label="Gig marketplace could not be loaded." />;
  }

  const mutationError = createMutation.isError ? getApiErrorMessage(createMutation.error, 'Gig could not be created.') : null;

  return (
    <div className="space-y-6">
      {canCreateGig ? (
        <Card className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Post an internal gig</h3>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={form.handleSubmit((values) =>
              createMutation.mutate({
                ...values,
                ownerId: values.ownerId || meQuery.data!._id,
              })
            )}
          >
            <Input placeholder="Gig title" {...form.register('title')} />
            <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...form.register('ownerId')}>
              <option value={meQuery.data?._id}>{meQuery.data ? `${meQuery.data.firstName} ${meQuery.data.lastName} (${meQuery.data.employeeId})` : 'Select owner'}</option>
              {(directoryQuery.data ?? []).map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.firstName} {employee.lastName} ({employee.employeeId})
                </option>
              ))}
            </select>
            <div className="md:col-span-2">
              <Textarea placeholder="Describe the side project or collaboration" {...form.register('description')} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Gig'}
              </Button>
            </div>
          </form>
          {createMutation.isSuccess && <p className="text-sm text-emerald-400">Gig created successfully.</p>}
          {mutationError && <p className="text-sm text-red-400">{mutationError}</p>}
        </Card>
      ) : (
        <Card className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Internal gigs</h3>
          <p className="text-sm text-white/60">Employees can browse open collaborations here. Creation is reserved for HR, admins, and managers.</p>
        </Card>
      )}
      <DataTable
        title="Internal Gigs"
        items={gigsQuery.data}
        columns={[{ key: 'title', header: 'Gig' }, { key: 'status', header: 'Status' }, { key: 'description', header: 'Description' }]}
      />
    </div>
  );
};
