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
import { KanbanBoard } from '../../components/KanbanBoard';
import { getApiErrorMessage } from '../../lib/utils';

const jobSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  location: z.string().min(2),
  employmentType: z.string().min(2),
  description: z.string().min(20),
});

export const RecruitmentPage = () => {
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      slug: '',
      location: 'Lahore / Hybrid',
      employmentType: 'Full-time',
      description: '',
    },
  });

  const jobsQuery = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data } = await api.get('/recruitment/jobs');
      return data.data as Array<{ _id: string; title: string; location: string; employmentType: string; status: string }>;
    },
  });

  const applicationsQuery = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const { data } = await api.get('/recruitment/applications');
      return data.data as Array<{ _id: string; name: string; email: string; stage: string }>;
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      await api.post('/recruitment/jobs', {
        ...values,
        openings: 1,
        status: 'published',
      });
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const moveApplicationMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      await api.patch(`/recruitment/applications/${id}/stage`, { stage });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['applications'] }),
  });

  if (jobsQuery.isLoading || applicationsQuery.isLoading) {
    return <LoadingState label="Loading recruitment pipeline..." />;
  }

  if (jobsQuery.isError || applicationsQuery.isError) {
    return <ErrorState label="Recruitment data could not be loaded." />;
  }

  const mutationError =
    createJobMutation.isError || moveApplicationMutation.isError
      ? getApiErrorMessage(createJobMutation.error ?? moveApplicationMutation.error, 'Recruitment action could not be completed.')
      : null;

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Publish a role</h3>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit((values) => createJobMutation.mutate(values))}>
          <Input placeholder="Role title" {...form.register('title')} />
          <Input placeholder="Slug" {...form.register('slug')} />
          <Input placeholder="Location" {...form.register('location')} />
          <Input placeholder="Employment type" {...form.register('employmentType')} />
          <div className="md:col-span-2">
            <Textarea placeholder="Job description" {...form.register('description')} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={createJobMutation.isPending}>
              {createJobMutation.isPending ? 'Publishing...' : 'Publish Job'}
            </Button>
          </div>
        </form>
        {createJobMutation.isSuccess && <p className="text-sm text-emerald-600">Job published successfully.</p>}
        {mutationError && <p className="text-sm text-red-500">{mutationError}</p>}
      </Card>
      <DataTable
        title="Job Posts"
        items={jobsQuery.data ?? []}
        columns={[
          { key: 'title', header: 'Role' },
          { key: 'location', header: 'Location' },
          { key: 'employmentType', header: 'Type' },
          { key: 'status', header: 'Status' },
        ]}
      />
      <KanbanBoard
        items={(applicationsQuery.data ?? []).map((item) => ({ _id: item._id, name: item.name, email: item.email, stage: item.stage }))}
        columns={['Applied', 'Screening', 'Interview', 'Assessment', 'Offer', 'Hired']}
        onMove={(id, stage) => moveApplicationMutation.mutate({ id, stage })}
      />
    </div>
  );
};
