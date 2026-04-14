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
import { hasAnyPermission, hasPermission } from '../../lib/permissions';
import { useAuthStore } from '../../store/authStore';
import { getApiErrorMessage } from '../../lib/utils';

const gigSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  ownerId: z.string().min(1),
  status: z.enum(['open', 'inProgress', 'completed', 'closed']).default('open'),
});

type GigFormValues = z.infer<typeof gigSchema>;

const emptyValues: GigFormValues = {
  title: '',
  description: '',
  ownerId: '',
  status: 'open',
};

export const GigPage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [editingGigId, setEditingGigId] = useState<string | null>(null);
  const [activeApplyGigId, setActiveApplyGigId] = useState<string | null>(null);
  const [lastAppliedGigId, setLastAppliedGigId] = useState<string | null>(null);
  const canManageGigs = hasAnyPermission(user?.permissions, ['gigs.create', 'gigs.manage']);
  const canApplyToGigs = hasPermission(user?.permissions, 'gigs.read');
  const form = useForm<GigFormValues>({
    resolver: zodResolver(gigSchema),
    defaultValues: emptyValues,
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
      return data.data as Array<{
        _id: string;
        title: string;
        description: string;
        status: 'open' | 'inProgress' | 'completed' | 'closed';
        ownerId?: { _id: string; firstName: string; lastName: string };
        applicants?: Array<{ _id: string }>;
      }>;
    },
  });

  const saveGigMutation = useMutation({
    mutationFn: async (values: GigFormValues) => {
      if (editingGigId) {
        await api.patch(`/gigs/${editingGigId}`, values);
        return;
      }
      await api.post('/gigs', { ...values, skillTags: [] });
    },
    onSuccess: () => {
      form.reset(emptyValues);
      setEditingGigId(null);
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
    },
  });

  const deleteGigMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/gigs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
    },
  });

  const quickUpdateMutation = useMutation({
    mutationFn: async (payload: { id: string; values: Partial<GigFormValues> }) => {
      await api.patch(`/gigs/${payload.id}`, payload.values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/gigs/${id}/apply`);
    },
    onMutate: (id) => {
      setActiveApplyGigId(id);
    },
    onSuccess: (_data, id) => {
      setLastAppliedGigId(id);
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
    },
    onSettled: () => {
      setActiveApplyGigId(null);
    },
  });

  if (gigsQuery.isLoading || meQuery.isLoading || directoryQuery.isLoading) {
    return <LoadingState label="Loading internal gig marketplace..." />;
  }

  if (gigsQuery.isError || meQuery.isError || directoryQuery.isError) {
    return <ErrorState label="Gig marketplace could not be loaded." />;
  }

  const mutationError =
    saveGigMutation.isError || applyMutation.isError || deleteGigMutation.isError || quickUpdateMutation.isError
      ? getApiErrorMessage(saveGigMutation.error ?? applyMutation.error ?? deleteGigMutation.error ?? quickUpdateMutation.error, 'Gig action could not be completed.')
      : null;

  const startEditing = (gig: GigFormValues & { _id: string }) => {
    setEditingGigId(gig._id);
    form.reset({
      title: gig.title,
      description: gig.description,
      ownerId: gig.ownerId,
      status: gig.status,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {canManageGigs ? (
        <Card className="space-y-4">
          <h3 className="text-lg font-semibold text-white">{editingGigId ? 'Edit internal gig' : 'Post an internal gig'}</h3>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={form.handleSubmit((values) =>
              saveGigMutation.mutate({
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
            <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...form.register('status')}>
              <option value="open">Open</option>
              <option value="inProgress">In progress</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </select>
            <div className="md:col-span-2">
              <Textarea placeholder="Describe the side project or collaboration" {...form.register('description')} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <Button type="submit" disabled={saveGigMutation.isPending}>
                {saveGigMutation.isPending ? 'Saving...' : editingGigId ? 'Save Gig' : 'Create Gig'}
              </Button>
              {editingGigId ? (
                <Button
                  type="button"
                  variant="outline"
                  soundTone="none"
                  onClick={() => {
                    setEditingGigId(null);
                    form.reset(emptyValues);
                  }}
                >
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </form>
          {saveGigMutation.isSuccess ? <p className="text-sm text-emerald-400">Gig saved successfully.</p> : null}
          {mutationError ? <p className="text-sm text-rose-300">{mutationError}</p> : null}
        </Card>
      ) : (
        <Card className="space-y-2">
          <h3 className="text-lg font-semibold text-white">Internal gigs</h3>
          <p className="text-sm text-white/60">Employees can browse open collaborations here and register interest directly from the table.</p>
          {applyMutation.isSuccess && lastAppliedGigId ? <p className="text-sm text-emerald-400">Interest recorded successfully for the selected gig.</p> : null}
          {mutationError ? <p className="text-sm text-rose-300">{mutationError}</p> : null}
        </Card>
      )}
      <DataTable
        title="Internal Gigs"
        items={gigsQuery.data ?? []}
        columns={[
          { key: 'title', header: 'Gig' },
          { key: 'status', header: 'Status' },
          { key: 'description', header: 'Description' },
          { key: 'owner', header: 'Owner', render: (item) => (item.ownerId ? `${item.ownerId.firstName} ${item.ownerId.lastName}` : 'Not set') },
          {
            key: 'actions',
            header: 'Actions',
            render: (item) => {
              const hasApplied = item.applicants?.some((applicant) => applicant._id === meQuery.data?._id) ?? false;
              return canManageGigs ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" soundTone="none" onClick={() => startEditing({ _id: item._id, title: item.title, description: item.description, ownerId: item.ownerId?._id ?? meQuery.data!._id, status: item.status })}>
                    Edit
                  </Button>
                  <Button type="button" variant="outline" onClick={() => quickUpdateMutation.mutate({ id: item._id, values: { status: item.status === 'open' ? 'closed' : 'open' } })}>
                    {item.status === 'open' ? 'Close' : 'Re-open'}
                  </Button>
                  <Button type="button" variant="outline" disabled={deleteGigMutation.isPending} onClick={() => deleteGigMutation.mutate(item._id)}>
                    Delete
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => applyMutation.mutate(item._id)}
                  disabled={applyMutation.isPending || item.status !== 'open' || !canApplyToGigs || hasApplied}
                >
                  {item.status !== 'open' ? 'Closed' : hasApplied ? 'Applied' : applyMutation.isPending && activeApplyGigId === item._id ? 'Applying...' : 'Apply'}
                </Button>
              );
            },
          },
        ]}
      />
    </div>
  );
};
