import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncState';
import { getApiErrorMessage } from '../../lib/utils';

const announcementSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
});

export const AnnouncementPage = () => {
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(announcementSchema),
  });

  const announcementsQuery = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data } = await api.get('/announcements');
      return data.data as Array<{ _id: string; title: string; content: string; createdAt: string }>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      await api.post('/announcements', { ...values, audience: 'all', published: true });
    },
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  if (announcementsQuery.isLoading) {
    return <LoadingState label="Loading announcements..." />;
  }

  if (announcementsQuery.isError) {
    return <ErrorState label="Announcements could not be loaded." />;
  }

  const mutationError = createMutation.isError ? getApiErrorMessage(createMutation.error, 'Announcement could not be published.') : null;

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Broadcast an announcement</h3>
        <form className="space-y-3" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
          <Input placeholder="Announcement title" {...form.register('title')} />
          <Textarea placeholder="Write the announcement" {...form.register('content')} />
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Publishing...' : 'Publish Announcement'}
          </Button>
        </form>
        {createMutation.isSuccess && <p className="text-sm text-emerald-600">Announcement published successfully.</p>}
        {mutationError && <p className="text-sm text-red-500">{mutationError}</p>}
      </Card>
      {(announcementsQuery.data ?? []).length === 0 ? (
        <EmptyState label="No company-wide announcements have been published yet." />
      ) : (
        <div className="grid gap-4">
          {(announcementsQuery.data ?? []).map((item) => (
            <Card key={item._id}>
              <p className="text-xs uppercase tracking-[0.2em] text-secondary">{new Date(item.createdAt).toLocaleDateString()}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm text-white/60">{item.content}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
