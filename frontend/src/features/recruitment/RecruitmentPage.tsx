import { useMemo, useState } from 'react';
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
import { getApiErrorMessage, toIsoDateTime, toLocalDateTimeInputValue } from '../../lib/utils';

const jobSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  location: z.string().min(2),
  employmentType: z.string().min(2),
  description: z.string().min(20),
  status: z.enum(['draft', 'published', 'closed']).default('published'),
});

type JobFormValues = z.infer<typeof jobSchema>;

const interviewSchema = z.object({
  scheduledAt: z.string().min(1),
  durationMinutes: z.coerce.number().min(15).default(60),
  interviewer: z.string().min(2),
  meetingLink: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
});

type InterviewFormValues = z.infer<typeof interviewSchema>;

const emptyValues: JobFormValues = {
  title: '',
  slug: '',
  location: 'Lahore / Hybrid',
  employmentType: 'Full-time',
  description: '',
  status: 'published',
};

interface ApplicationRow {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  stage: string;
}

interface OnboardingItem {
  title: string;
  completed: boolean;
}

export const RecruitmentPage = () => {
  const queryClient = useQueryClient();
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: emptyValues,
  });

  const interviewForm = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewSchema),
    defaultValues: {
      scheduledAt: toLocalDateTimeInputValue(new Date()),
      durationMinutes: 60,
      interviewer: '',
      meetingLink: '',
      notes: '',
    },
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
      return data.data as ApplicationRow[];
    },
  });

  const selectedApplication = useMemo(
    () => (applicationsQuery.data ?? []).find((application) => application._id === selectedApplicationId) ?? null,
    [applicationsQuery.data, selectedApplicationId],
  );

  const onboardingQuery = useQuery({
    queryKey: ['onboarding', selectedApplicationId],
    enabled: Boolean(selectedApplicationId) && selectedApplication?.stage === 'Hired',
    queryFn: async () => {
      const { data } = await api.get(`/recruitment/onboarding/${selectedApplicationId}`);
      return data.data as { items: OnboardingItem[]; status: string } | null;
    },
  });

  const saveJobMutation = useMutation({
    mutationFn: async (values: JobFormValues) => {
      const payload = { ...values, openings: 1 };
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

  const scheduleInterviewMutation = useMutation({
    mutationFn: async (values: InterviewFormValues) => {
      await api.post('/recruitment/interviews', {
        applicationId: selectedApplicationId,
        scheduledAt: toIsoDateTime(values.scheduledAt),
        durationMinutes: values.durationMinutes,
        interviewer: values.interviewer,
        meetingLink: values.meetingLink ? values.meetingLink : undefined,
        notes: values.notes ? values.notes : undefined,
      });
    },
    onSuccess: () => {
      interviewForm.reset({
        scheduledAt: toLocalDateTimeInputValue(new Date()),
        durationMinutes: 60,
        interviewer: '',
        meetingLink: '',
        notes: '',
      });
      if (selectedApplication && selectedApplication.stage === 'Applied') {
        moveApplicationMutation.mutate({ id: selectedApplication._id, stage: 'Interview' });
      }
    },
  });

  const onboardingMutation = useMutation({
    mutationFn: async (items: OnboardingItem[]) => {
      await api.put(`/recruitment/onboarding/${selectedApplicationId}`, { items });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding', selectedApplicationId] }),
  });

  if (jobsQuery.isLoading || applicationsQuery.isLoading) {
    return <LoadingState label="Loading recruitment pipeline..." />;
  }

  if (jobsQuery.isError || applicationsQuery.isError) {
    return <ErrorState label="Recruitment data could not be loaded." />;
  }

  const mutationError =
    saveJobMutation.isError || moveApplicationMutation.isError || deleteJobMutation.isError || quickUpdateMutation.isError || scheduleInterviewMutation.isError
      ? getApiErrorMessage(
          saveJobMutation.error ?? moveApplicationMutation.error ?? deleteJobMutation.error ?? quickUpdateMutation.error ?? scheduleInterviewMutation.error,
          'Recruitment action could not be completed.',
        )
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

  const toggleOnboardingItem = (index: number) => {
    const items = onboardingQuery.data?.items ?? [];
    const next = items.map((item, itemIndex) => (itemIndex === index ? { ...item, completed: !item.completed } : item));
    onboardingMutation.mutate(next);
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-[color:var(--color-heading)]">{editingJobId ? 'Edit job post' : 'Publish a role'}</h3>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit((values) => saveJobMutation.mutate(values))}>
          <Input placeholder="Role title" {...form.register('title')} />
          <Input placeholder="Slug" {...form.register('slug')} />
          <Input placeholder="Location" {...form.register('location')} />
          <Input placeholder="Employment type" {...form.register('employmentType')} />
          <select className="field-select" {...form.register('status')}>
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
                      values: { status: item.status === 'published' ? 'closed' : 'published' },
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

      <Card className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--color-heading)]">Candidate management</h3>
          <p className="text-sm theme-muted">Select a candidate to schedule interviews and run onboarding once hired.</p>
        </div>

        {(applicationsQuery.data ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-subtle-bg)] p-4 text-sm theme-muted">
            No candidates have applied yet. Published roles appear on the public careers page.
          </p>
        ) : (
          <select
            className="field-select md:max-w-md"
            value={selectedApplicationId ?? ''}
            onChange={(event) => setSelectedApplicationId(event.target.value || null)}
          >
            <option value="">Select a candidate</option>
            {(applicationsQuery.data ?? []).map((application) => (
              <option key={application._id} value={application._id}>
                {application.name} — {application.stage}
              </option>
            ))}
          </select>
        )}

        {selectedApplication ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-subtle-bg)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary">Schedule interview</p>
              <p className="mt-1 text-sm font-medium text-[color:var(--color-text)]">
                {selectedApplication.name} · {selectedApplication.email}
              </p>
              <form className="mt-3 space-y-3" onSubmit={interviewForm.handleSubmit((values) => scheduleInterviewMutation.mutate(values))}>
                <Input type="datetime-local" {...interviewForm.register('scheduledAt')} />
                <Input type="number" placeholder="Duration (minutes)" {...interviewForm.register('durationMinutes')} />
                <Input placeholder="Interviewer name" {...interviewForm.register('interviewer')} />
                {interviewForm.formState.errors.interviewer ? (
                  <p className="text-xs text-rose-300">{interviewForm.formState.errors.interviewer.message}</p>
                ) : null}
                <Input placeholder="Meeting link (optional)" {...interviewForm.register('meetingLink')} />
                {interviewForm.formState.errors.meetingLink ? (
                  <p className="text-xs text-rose-300">{interviewForm.formState.errors.meetingLink.message}</p>
                ) : null}
                <Textarea placeholder="Notes for the interviewer (optional)" {...interviewForm.register('notes')} />
                <Button type="submit" disabled={scheduleInterviewMutation.isPending}>
                  {scheduleInterviewMutation.isPending ? 'Scheduling...' : 'Schedule interview'}
                </Button>
                {scheduleInterviewMutation.isSuccess ? (
                  <p className="text-sm text-emerald-300">Interview scheduled. A calendar invite was generated for the interviewer.</p>
                ) : null}
              </form>
            </div>

            <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-subtle-bg)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-secondary">Onboarding</p>
              {selectedApplication.stage !== 'Hired' ? (
                <p className="mt-3 text-sm theme-muted">
                  Move this candidate to <span className="font-medium text-[color:var(--color-text)]">Hired</span> on the pipeline to start the onboarding checklist.
                </p>
              ) : onboardingQuery.isLoading ? (
                <p className="mt-3 text-sm theme-muted">Loading onboarding checklist...</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {(onboardingQuery.data?.items ?? []).map((item, index) => (
                    <label key={item.title} className="flex items-start gap-3 text-sm text-[color:var(--color-text)]">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-[#7F63F4]"
                        checked={item.completed}
                        disabled={onboardingMutation.isPending}
                        onChange={() => toggleOnboardingItem(index)}
                      />
                      <span className={item.completed ? 'line-through theme-muted' : ''}>{item.title}</span>
                    </label>
                  ))}
                  {(onboardingQuery.data?.items ?? []).length === 0 ? (
                    <p className="text-sm theme-muted">Onboarding checklist will appear here.</p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
};
