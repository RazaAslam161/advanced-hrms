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
import { KanbanBoard } from '../../components/KanbanBoard';
import { getApiErrorMessage } from '../../lib/utils';

const jobSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  location: z.string().min(2),
  employmentType: z.string().min(2),
  description: z.string().min(20),
  status: z.enum(['draft', 'published', 'closed']).default('published'),
});

type JobFormValues = z.infer<typeof jobSchema>;

const emptyValues: JobFormValues = {
  title: '',
  slug: '',
  location: 'Lahore / Hybrid',
  employmentType: 'Full-time',
  description: '',
  status: 'published',
};

export const RecruitmentPage = () => {
  const queryClient = useQueryClient();
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: emptyValues,
  });

  const jobsQuery = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data } = await api.get('/recruitment/jobs');
      return data.data as Array<{ _id: string; title: string; slug: string; location: string; employmentType: string; description: string; status: 'draft' | 'published' | 'closed' }>;
    },
  });

  const applicationsQuery = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const { data } = await api.get('/recruitment/applications');
      return data.data as Array<{ _id: string; name: string; email: string; stage: string }>;
    },
  });

  const saveJobMutation = useMutation({
    mutationFn: async (values: JobFormValues) => {
      const payload = {
        ...values,
        openings: 1,
      };

      if (editingJobId) {
        await api.patch(`/recruitment/jobs/${editingJobId}`, payload);
        return;
      }

      await api.post('/recruitment/jobs', payload);
    },
    onSuccess: () => {
      form.reset(emptyValues);
      setEditingJobId(null);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/recruitment/jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      if (editingJobId) {
        setEditingJobId(null);
        form.reset(emptyValues);
      }
    },
  });

  const quickUpdateMutation = useMutation({
    mutationFn: async (payload: { id: string; values: Partial<JobFormValues> }) => {
      await api.patch(`/recruitment/jobs/${payload.id}`, payload.values);
    },
    onSuccess: () => {
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
    saveJobMutation.isError || moveApplicationMutation.isError || deleteJobMutation.isError || quickUpdateMutation.isError
      ? getApiErrorMessage(saveJobMutation.error ?? moveApplicationMutation.error ?? deleteJobMutation.error ?? quickUpdateMutation.error, 'Recruitment action could not be completed.')
      : null;

  const startEditing = (job: JobFormValues & { _id: string }) => {
    setEditingJobId(job._id);
    form.reset({
      title: job.title,
      slug: job.slug,
      location: job.location,
      employmentType: job.employmentType,
      description: job.description,
      status: job.status,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-white">{editingJobId ? 'Edit job post' : 'Publish a role'}</h3>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit((values) => saveJobMutation.mutate(values))}>
          <Input placeholder="Role title" {...form.register('title')} />
          <Input placeholder="Slug" {...form.register('slug')} />
          <Input placeholder="Location" {...form.register('location')} />
          <Input placeholder="Employment type" {...form.register('employmentType')} />
          <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...form.register('status')}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>
          <div className="md:col-span-2">
            <Textarea placeholder="Job description" {...form.register('description')} />
          </div>
          <div className="md:col-span-2 flex gap-3">
            <Button type="submit" disabled={saveJobMutation.isPending}>
              {saveJobMutation.isPending ? 'Saving...' : editingJobId ? 'Save Job' : 'Publish Job'}
            </Button>
            {editingJobId ? (
              <Button
                type="button"
                variant="outline"
                soundTone="none"
                onClick={() => {
                  setEditingJobId(null);
                  form.reset(emptyValues);
                }}
              >
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>
        {saveJobMutation.isSuccess ? <p className="text-sm text-emerald-300">Job details saved successfully.</p> : null}
        {mutationError ? <p className="text-sm text-rose-300">{mutationError}</p> : null}
      </Card>
      <DataTable
        title="Job Posts"
        items={jobsQuery.data ?? []}
        columns={[
          { key: 'title', header: 'Role' },
          { key: 'location', header: 'Location' },
          { key: 'employmentType', header: 'Type' },
          { key: 'status', header: 'Status' },
          {
            key: 'actions',
            header: 'Actions',
            render: (item) => (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" soundTone="none" onClick={() => startEditing(item)}>
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    quickUpdateMutation.mutate({
                      id: item._id,
                      values: {
                        status: item.status === 'published' ? 'closed' : 'published',
                      },
                    })
                  }
                >
                  {item.status === 'published' ? 'Close role' : 'Publish role'}
                </Button>
                <Button type="button" variant="outline" disabled={deleteJobMutation.isPending} onClick={() => deleteJobMutation.mutate(item._id)}>
                  Delete
                </Button>
              </div>
            ),
          },
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
