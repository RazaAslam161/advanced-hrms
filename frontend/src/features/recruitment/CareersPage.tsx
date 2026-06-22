import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncState';
import { companyProfile } from '../../lib/company';
import { getApiErrorMessage } from '../../lib/utils';

const applicationSchema = z.object({
  jobPostId: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  coverLetter: z.string().min(20),
});

export const CareersPage = () => {
  const form = useForm({
    resolver: zodResolver(applicationSchema),
  });

  const jobsQuery = useQuery({
    queryKey: ['public-jobs'],
    queryFn: async () => {
      const { data } = await api.get('/recruitment/public/careers');
      return data.data as Array<{ _id: string; title: string; location: string; description: string }>;
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      await api.post('/recruitment/public/applications', values);
    },
    onSuccess: () => form.reset(),
  });

  if (jobsQuery.isLoading) {
    return <LoadingState label="Loading Meta Labs Tech careers..." />;
  }

  if (jobsQuery.isError) {
    return <ErrorState label="Careers page could not be loaded." />;
  }

  if ((jobsQuery.data ?? []).length === 0) {
    return <EmptyState label="No public openings are live right now." />;
  }

  const selectedJobId = form.watch('jobPostId');
  const selectedJob = (jobsQuery.data ?? []).find((job) => job._id === selectedJobId);
  const mutationError = applyMutation.isError ? getApiErrorMessage(applyMutation.error, 'Application could not be submitted.') : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
      <div className="space-y-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.25em] text-secondary">{companyProfile.legalName}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Careers at {companyProfile.legalName}</h2>
          <p className="mt-3 text-sm text-white/60">{companyProfile.description}</p>
        </Card>
        {(jobsQuery.data ?? []).map((job) => (
          <Card key={job._id}>
            <p className="text-sm uppercase tracking-[0.2em] text-secondary">{job.location}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{job.title}</h2>
            <p className="mt-3 text-sm text-white/60">{job.description}</p>
            <Button className="mt-4" variant="outline" onClick={() => form.setValue('jobPostId', job._id)}>
              Apply to this role
            </Button>
          </Card>
        ))}
      </div>
      <Card className="space-y-4">
        <h3 className="text-xl font-semibold text-white">Apply now</h3>
        <p className="text-sm text-white/55">{selectedJob ? `Selected role: ${selectedJob.title}` : 'Choose a role from the list before submitting.'}</p>
        <form className="space-y-3" onSubmit={form.handleSubmit((values) => applyMutation.mutate(values))}>
          <Input placeholder="Selected job id" {...form.register('jobPostId')} />
          <Input placeholder="Full name" {...form.register('name')} />
          <Input placeholder="Email" {...form.register('email')} />
          <Input placeholder="Phone number" {...form.register('phone')} />
          <Textarea placeholder="Tell us why you're a strong fit" {...form.register('coverLetter')} />
          <Button type="submit" disabled={applyMutation.isPending}>
            {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
          </Button>
        </form>
        {applyMutation.isSuccess && <p className="text-sm text-emerald-600">Application submitted successfully.</p>}
        {mutationError && <p className="text-sm text-red-500">{mutationError}</p>}
      </Card>
    </div>
  );
};
