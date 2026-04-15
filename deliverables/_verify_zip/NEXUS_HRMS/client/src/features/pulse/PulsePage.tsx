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
import { getApiErrorMessage } from '../../lib/utils';

const recognitionSchema = z.object({
  fromEmployeeId: z.string().min(1),
  toEmployeeId: z.string().min(1),
  message: z.string().min(5),
  badge: z.string().min(2),
});

export const PulsePage = () => {
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(recognitionSchema),
    defaultValues: {
      fromEmployeeId: '',
      toEmployeeId: '',
      message: '',
      badge: 'Team Player',
    },
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

  const surveysQuery = useQuery({
    queryKey: ['pulse-surveys'],
    queryFn: async () => {
      const { data } = await api.get('/pulse/surveys');
      return data.data;
    },
  });

  const recognitionQuery = useQuery({
    queryKey: ['recognition'],
    queryFn: async () => {
      const { data } = await api.get('/pulse/recognition');
      return data.data;
    },
  });

  const createRecognitionMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      await api.post('/pulse/recognition', values);
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['recognition'] });
    },
  });

  if (surveysQuery.isLoading || recognitionQuery.isLoading || meQuery.isLoading || directoryQuery.isLoading) {
    return <LoadingState label="Loading pulse and recognition..." />;
  }

  if (surveysQuery.isError || recognitionQuery.isError || meQuery.isError || directoryQuery.isError) {
    return <ErrorState label="Pulse information could not be loaded." />;
  }

  const mutationError = createRecognitionMutation.isError
    ? getApiErrorMessage(createRecognitionMutation.error, 'Recognition could not be shared.')
    : null;

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Send recognition</h3>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={form.handleSubmit((values) =>
            createRecognitionMutation.mutate({
              ...values,
              fromEmployeeId: values.fromEmployeeId || meQuery.data!._id,
            })
          )}
        >
          <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...form.register('fromEmployeeId')}>
            <option value={meQuery.data?._id}>{meQuery.data ? `${meQuery.data.firstName} ${meQuery.data.lastName} (${meQuery.data.employeeId})` : 'Select sender'}</option>
          </select>
          <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...form.register('toEmployeeId')}>
            <option value="">Select teammate</option>
            {(directoryQuery.data ?? [])
              .filter((employee) => employee._id !== meQuery.data?._id)
              .map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.firstName} {employee.lastName} ({employee.employeeId})
                </option>
              ))}
          </select>
          <Input placeholder="Badge" {...form.register('badge')} />
          <div className="md:col-span-2">
            <Textarea placeholder="Recognition message" {...form.register('message')} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={createRecognitionMutation.isPending}>
              {createRecognitionMutation.isPending ? 'Sharing...' : 'Share Recognition'}
            </Button>
          </div>
        </form>
        {createRecognitionMutation.isSuccess && <p className="text-sm text-emerald-400">Recognition shared successfully.</p>}
        {mutationError && <p className="text-sm text-red-400">{mutationError}</p>}
      </Card>
      <DataTable title="Pulse Surveys" items={surveysQuery.data} columns={[{ key: 'title', header: 'Survey' }, { key: 'active', header: 'Active' }]} />
      <DataTable
        title="Recognition Feed"
        items={recognitionQuery.data}
        columns={[
          { key: 'badge', header: 'Badge' },
          { key: 'message', header: 'Message' },
        ]}
      />
    </div>
  );
};
