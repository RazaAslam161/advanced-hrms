import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { DataTable } from '../../components/DataTable';
import { OrgChart } from '../../components/OrgChart';
import { LoadingState, ErrorState } from '../../components/AsyncState';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { hasAnyPermission } from '../../lib/permissions';
import { getApiErrorMessage } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import type { Department } from '../../types';

const departmentSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10),
  description: z.string().optional(),
  head: z.string().optional(),
  parentDepartment: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

const emptyValues: DepartmentFormValues = {
  name: '',
  code: '',
  description: '',
  head: '',
  parentDepartment: '',
  status: 'active',
};

export const DepartmentPage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: emptyValues,
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get('/departments', { params: { limit: 100 } });
      return data.data as Department[];
    },
  });

  const directoryQuery = useQuery({
    queryKey: ['department-head-directory'],
    queryFn: async () => {
      const { data } = await api.get('/employees/directory');
      return data.data as Array<{ _id: string; firstName: string; lastName: string; employeeId: string; designation: string }>;
    },
  });

  const canManageDepartments = hasAnyPermission(user?.permissions, ['departments.create', 'departments.update', 'departments.delete']);

  const createMutation = useMutation({
    mutationFn: async (values: DepartmentFormValues) => {
      const { data } = await api.post('/departments', {
        ...values,
        code: values.code.toUpperCase(),
      });
      return data.data as Department;
    },
    onSuccess: () => {
      form.reset(emptyValues);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; values: Partial<DepartmentFormValues> }) => {
      const { data } = await api.patch(`/departments/${payload.id}`, payload.values);
      return data.data as Department;
    },
    onSuccess: () => {
      form.reset(emptyValues);
      setEditingDepartmentId(null);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });

  if (departmentsQuery.isLoading || directoryQuery.isLoading) {
    return <LoadingState label="Loading departments..." />;
  }

  if (departmentsQuery.isError || directoryQuery.isError) {
    return <ErrorState label="Department data could not be loaded." />;
  }

  const mutationError =
    createMutation.isError || updateMutation.isError || deleteMutation.isError
      ? getApiErrorMessage(createMutation.error ?? updateMutation.error ?? deleteMutation.error, 'Department action could not be completed.')
      : null;

  const startEditing = (department: Department) => {
    setEditingDepartmentId(department._id);
    form.reset({
      name: department.name,
      code: department.code,
      description: department.description ?? '',
      head: department.head?._id ?? '',
      parentDepartment: department.parentDepartment?._id ?? '',
      status: (department.status as DepartmentFormValues['status']) ?? 'active',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {canManageDepartments ? (
        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{editingDepartmentId ? 'Edit department' : 'Create department'}</h3>
            <p className="text-sm text-white/55">Manage department setup, assign a head, and control whether the department stays active.</p>
          </div>
          <form
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
            onSubmit={form.handleSubmit((values) => {
              if (editingDepartmentId) {
                updateMutation.mutate({ id: editingDepartmentId, values: { ...values, code: values.code.toUpperCase() } });
                return;
              }
              createMutation.mutate(values);
            })}
          >
            <Input placeholder="Department name" {...form.register('name')} />
            <Input placeholder="Department code" {...form.register('code')} />
            <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...form.register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...form.register('head')}>
              <option value="">Select department head</option>
              {(directoryQuery.data ?? []).map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.firstName} {employee.lastName} | {employee.designation}
                </option>
              ))}
            </select>
            <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...form.register('parentDepartment')}>
              <option value="">No parent department</option>
              {(departmentsQuery.data ?? [])
                .filter((department) => department._id !== editingDepartmentId)
                .map((department) => (
                  <option key={department._id} value={department._id}>
                    {department.name}
                  </option>
                ))}
            </select>
            <Input placeholder="Short description" {...form.register('description')} />
            <div className="md:col-span-2 xl:col-span-3 flex gap-3">
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingDepartmentId
                  ? updateMutation.isPending
                    ? 'Saving department...'
                    : 'Save department'
                  : createMutation.isPending
                    ? 'Creating department...'
                    : 'Create department'}
              </Button>
              {editingDepartmentId ? (
                <Button
                  type="button"
                  variant="outline"
                  soundTone="none"
                  onClick={() => {
                    setEditingDepartmentId(null);
                    form.reset(emptyValues);
                  }}
                >
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </form>
          {createMutation.isSuccess ? <p className="text-sm text-emerald-300">Department created successfully.</p> : null}
          {updateMutation.isSuccess ? <p className="text-sm text-emerald-300">Department updated successfully.</p> : null}
          {mutationError ? <p className="text-sm text-rose-300">{mutationError}</p> : null}
        </Card>
      ) : null}

      <OrgChart departments={departmentsQuery.data ?? []} />

      <DataTable
        title="Departments"
        items={departmentsQuery.data ?? []}
        columns={[
          { key: 'name', header: 'Department' },
          { key: 'code', header: 'Code' },
          { key: 'head', header: 'Head', render: (item) => (item.head ? `${item.head.firstName} ${item.head.lastName}` : 'Not assigned') },
          { key: 'status', header: 'Status', render: (item) => <Badge>{item.status}</Badge> },
          {
            key: 'actions',
            header: 'Actions',
            render: (item) =>
              canManageDepartments ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" soundTone="none" onClick={() => startEditing(item)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      updateMutation.mutate({
                        id: item._id,
                        values: { status: item.status === 'active' ? 'inactive' : 'active' },
                      })
                    }
                  >
                    {item.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button type="button" variant="outline" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(item._id)}>
                    Delete
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-white/45">View only</span>
              ),
          },
        ]}
      />
    </div>
  );
};
