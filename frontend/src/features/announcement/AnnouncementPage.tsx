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
import { EmptyState, ErrorState, LoadingState } from '../../components/AsyncState';
import { hasAnyPermission } from '../../lib/permissions';
import { getApiErrorMessage } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

const announcementSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  audience: z.enum(['all', 'department']).default('all'),
  department: z.string().optional(),
  published: z.boolean().default(true),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

const emptyValues: AnnouncementFormValues = {
  title: '',
  content: '',
  audience: 'all',
  department: '',
  published: true,
};

interface AnnouncementRow {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  published?: boolean;
  readReceipts?: string[];
}

export const AnnouncementPage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const canManageAnnouncements = hasAnyPermission(user?.permissions, ['announcements.publish', 'announcements.manage']);
  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: emptyValues,
  });

  const announcementsQuery = useQuery({
    queryKey: ['announcements', canManageAnnouncements ? 'manage' : 'public'],
    queryFn: async () => {
      const { data } = await api.get(canManageAnnouncements ? '/announcements/manage' : '/announcements');
      return data.data as AnnouncementRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: AnnouncementFormValues) => {
      const payload = {
        ...values,
        department: values.audience === 'department' ? values.department : undefined,
      };
      if (editingAnnouncementId) {
        await api.patch(`/announcements/${editingAnnouncementId}`, payload);
        return;
      }
      await api.post('/announcements', payload);
    },
    onSuccess: () => {
      form.reset(emptyValues);
      setEditingAnnouncementId(null);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/announcements/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  if (announcementsQuery.isLoading) {
    return <LoadingState label="Loading announcements..." />;
  }

  if (announcementsQuery.isError) {
    return <ErrorState label="Announcements could not be loaded." />;
  }

  const mutationError =
    saveMutation.isError || deleteMutation.isError || markReadMutation.isError
      ? getApiErrorMessage(saveMutation.error ?? deleteMutation.error ?? markReadMutation.error, 'Announcement action could not be completed.')
      : null;

  const startEditing = (item: AnnouncementRow) => {
    setEditingAnnouncementId(item._id);
    form.reset({
      title: item.title,
      content: item.content,
      audience: 'all',
      department: '',
      published: item.published ?? true,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {canManageAnnouncements ? (
        <Card className="space-y-4">
          <h3 className="text-lg font-semibold text-white">{editingAnnouncementId ? 'Edit announcement' : 'Broadcast an announcement'}</h3>
          <form className="space-y-3" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
            <Input placeholder="Announcement title" {...form.register('title')} />
            <Textarea placeholder="Write the announcement" {...form.register('content')} />
            <div className="flex gap-3">
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Publishing...' : editingAnnouncementId ? 'Save announcement' : 'Publish announcement'}
              </Button>
              {editingAnnouncementId ? (
                <Button
                  type="button"
                  variant="outline"
                  soundTone="none"
                  onClick={() => {
                    setEditingAnnouncementId(null);
                    form.reset(emptyValues);
                  }}
                >
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </form>
          {saveMutation.isSuccess ? <p className="text-sm text-emerald-300">Announcement saved successfully.</p> : null}
          {mutationError ? <p className="text-sm text-rose-300">{mutationError}</p> : null}
        </Card>
      ) : null}

      {(announcementsQuery.data ?? []).length === 0 ? (
        <EmptyState label="No company-wide announcements have been published yet." />
      ) : (
        <DataTable
          title="Announcements"
          items={announcementsQuery.data ?? []}
          columns={[
            { key: 'title', header: 'Title' },
            { key: 'createdAt', header: 'Published', render: (item) => new Date(item.createdAt).toLocaleDateString() },
            { key: 'content', header: 'Message', render: (item) => <span className="line-clamp-3 max-w-xl">{item.content}</span> },
            {
              key: 'actions',
              header: 'Actions',
              render: (item) =>
                canManageAnnouncements ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" soundTone="none" onClick={() => startEditing(item)}>
                      Edit
                    </Button>
                    <Button type="button" variant="outline" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(item._id)}>
                      Delete
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" disabled={markReadMutation.isPending} onClick={() => markReadMutation.mutate(item._id)}>
                    Mark read
                  </Button>
                ),
            },
          ]}
        />
      )}
    </div>
  );
};
