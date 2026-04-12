import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { useAuthStore } from '../../store/authStore';
import { formatDate, getApiErrorMessage, toIsoDateTime, toLocalDateTimeInputValue } from '../../lib/utils';
import type { Department, Project } from '../../types';

interface DirectoryEmployee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  country?: string;
  department?: Department;
}

const projectSchema = z.object({
  name: z.string().min(3),
  code: z.string().min(2),
  clientName: z.string().min(2),
  department: z.string().min(1),
  managerId: z.string().min(1),
  memberIds: z.array(z.string()).default([]),
  description: z.string().min(10),
  status: z.enum(['planning', 'active', 'onHold', 'completed']).default('planning'),
  health: z.enum(['green', 'amber', 'red']).default('green'),
  progress: z.coerce.number().min(0).max(100).default(0),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
});

const projectUpdateSchema = z.object({
  projectId: z.string().min(1),
  summary: z.string().min(8),
  blockers: z.string().optional(),
  progress: z.coerce.number().min(0).max(100),
  projectStatus: z.enum(['planning', 'active', 'onHold', 'completed']).default('active'),
});

type ProjectFormValues = z.infer<typeof projectSchema>;
type ProjectUpdateFormValues = z.infer<typeof projectUpdateSchema>;

const healthTone = {
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  amber: 'bg-amber-500/15 text-amber-200 border-amber-500/25',
  red: 'bg-rose-500/15 text-rose-200 border-rose-500/25',
} as const;

export const ProjectPage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [activeDepartment, setActiveDepartment] = useState<string>('all');
  const canManageProjects = ['superAdmin', 'admin', 'manager'].includes(user?.role ?? '');

  const projectForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      code: '',
      clientName: 'Meta Labs Tech Internal',
      department: '',
      managerId: '',
      memberIds: [],
      description: '',
      status: 'planning',
      health: 'green',
      progress: 0,
      startDate: toLocalDateTimeInputValue(new Date()),
      endDate: '',
    },
  });

  const updateForm = useForm<ProjectUpdateFormValues>({
    resolver: zodResolver(projectUpdateSchema),
    defaultValues: {
      projectId: '',
      summary: '',
      blockers: '',
      progress: 0,
      projectStatus: 'active',
    },
  });

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects');
      return data.data as Project[];
    },
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments-for-projects'],
    queryFn: async () => {
      const { data } = await api.get('/departments', { params: { limit: 100 } });
      return data.data as Department[];
    },
  });

  const employeesQuery = useQuery({
    queryKey: ['employee-directory-for-projects'],
    queryFn: async () => {
      const { data } = await api.get('/employees/directory');
      return data.data as DirectoryEmployee[];
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      await api.post('/projects', {
        ...values,
        code: values.code.toUpperCase(),
        startDate: toIsoDateTime(values.startDate),
        endDate: values.endDate ? toIsoDateTime(values.endDate) : undefined,
      });
    },
    onSuccess: () => {
      projectForm.reset({
        name: '',
        code: '',
        clientName: 'Meta Labs Tech Internal',
        department: '',
        managerId: '',
        memberIds: [],
        description: '',
        status: 'planning',
        health: 'green',
        progress: 0,
        startDate: toLocalDateTimeInputValue(new Date()),
        endDate: '',
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const addUpdateMutation = useMutation({
    mutationFn: async (values: ProjectUpdateFormValues) => {
      await api.post(`/projects/${values.projectId}/updates`, {
        summary: values.summary,
        blockers: values.blockers,
        progress: values.progress,
        projectStatus: values.projectStatus,
      });
    },
    onSuccess: () => {
      updateForm.reset({
        projectId: '',
        summary: '',
        blockers: '',
        progress: 0,
        projectStatus: 'active',
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const departmentSummaries = useMemo(() => {
    const projects = projectsQuery.data ?? [];
    return departmentsQuery.data?.map((department) => {
      const departmentProjects = projects.filter((project) => project.department?._id === department._id);
      const activeProjects = departmentProjects.filter((project) => project.status !== 'completed').length;
      const memberCount = departmentProjects.reduce((count, project) => count + (project.memberIds?.length ?? 0), 0);
      return {
        ...department,
        projectCount: departmentProjects.length,
        activeProjects,
        memberCount,
      };
    }) ?? [];
  }, [departmentsQuery.data, projectsQuery.data]);

  const filteredProjects = useMemo(() => {
    const projects = projectsQuery.data ?? [];
    if (activeDepartment === 'all') {
      return projects;
    }
    return projects.filter((project) => project.department?._id === activeDepartment);
  }, [activeDepartment, projectsQuery.data]);

  if (projectsQuery.isLoading || departmentsQuery.isLoading || employeesQuery.isLoading) {
    return <LoadingState label="Loading project workspaces..." />;
  }

  if (projectsQuery.isError || departmentsQuery.isError || employeesQuery.isError) {
    return <ErrorState label="Project workspaces could not be loaded." />;
  }

  const selectedMembers = new Set(projectForm.watch('memberIds'));
  const projectError = createProjectMutation.isError ? getApiErrorMessage(createProjectMutation.error, 'Project could not be created.') : null;
  const updateError = addUpdateMutation.isError ? getApiErrorMessage(addUpdateMutation.error, 'Project update could not be submitted.') : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Department workspaces</h3>
            <p className="text-sm text-white/55">Each department now has a project workspace with team coverage, active initiatives, and assigned managers.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveDepartment('all')}
              className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${activeDepartment === 'all' ? 'border-primary bg-primary/15 text-white' : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'}`}
            >
              <p className="text-xs uppercase tracking-[0.25em] text-secondary">All Departments</p>
              <p className="mt-3 text-2xl font-semibold text-white">{projectsQuery.data?.length ?? 0}</p>
              <p className="mt-1 text-sm text-white/55">Visible projects across the company</p>
            </button>
            {departmentSummaries.map((department) => (
              <button
                key={department._id}
                type="button"
                onClick={() => setActiveDepartment(department._id)}
                className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${activeDepartment === department._id ? 'border-primary bg-primary/15 text-white' : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'}`}
              >
                <p className="text-xs uppercase tracking-[0.25em] text-secondary">{department.code}</p>
                <p className="mt-2 text-lg font-semibold text-white">{department.name}</p>
                <p className="mt-2 text-sm text-white/55">{department.activeProjects} active projects • {department.memberCount} assigned members</p>
              </button>
            ))}
          </div>
        </Card>
        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Project status updates</h3>
            <p className="text-sm text-white/55">Employees and managers can push project progress directly from their portal.</p>
          </div>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={updateForm.handleSubmit((values) => addUpdateMutation.mutate(values))}>
            <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...updateForm.register('projectId')}>
              <option value="">Select project</option>
              {(projectsQuery.data ?? []).map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...updateForm.register('projectStatus')}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="onHold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
            <div className="md:col-span-2">
              <Textarea rows={4} placeholder="What moved forward today?" {...updateForm.register('summary')} />
            </div>
            <div className="md:col-span-2">
              <Textarea rows={3} placeholder="Blockers, dependencies, or escalation items" {...updateForm.register('blockers')} />
            </div>
            <Input type="number" min={0} max={100} placeholder="Progress %" {...updateForm.register('progress')} />
            <div className="md:col-span-2">
              <Button type="submit" disabled={addUpdateMutation.isPending}>
                {addUpdateMutation.isPending ? 'Submitting update...' : 'Submit project update'}
              </Button>
            </div>
          </form>
          {addUpdateMutation.isSuccess ? <p className="text-sm text-emerald-300">Project update saved and visible to managers immediately.</p> : null}
          {updateError ? <p className="text-sm text-rose-300">{updateError}</p> : null}
        </Card>
      </div>

      {canManageProjects ? (
        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Create and assign project workspace</h3>
            <p className="text-sm text-white/55">Super Admin, HR, and managers can create project workspaces, assign leads, and connect employees to delivery work.</p>
          </div>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={projectForm.handleSubmit((values) => createProjectMutation.mutate(values))}>
            <Input placeholder="Project name" {...projectForm.register('name')} />
            <Input placeholder="Project code" {...projectForm.register('code')} />
            <Input placeholder="Client name" {...projectForm.register('clientName')} />
            <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...projectForm.register('department')}>
              <option value="">Select department</option>
              {(departmentsQuery.data ?? []).map((department) => (
                <option key={department._id} value={department._id}>
                  {department.name}
                </option>
              ))}
            </select>
            <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...projectForm.register('managerId')}>
              <option value="">Assign manager</option>
              {(employeesQuery.data ?? []).filter((employee) => employee.designation.toLowerCase().includes('manager') || employee.designation.toLowerCase().includes('lead')).map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.firstName} {employee.lastName} • {employee.designation}
                </option>
              ))}
            </select>
            <Input type="number" min={0} max={100} placeholder="Initial progress %" {...projectForm.register('progress')} />
            <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...projectForm.register('status')}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="onHold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
            <select className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white" {...projectForm.register('health')}>
              <option value="green">Green</option>
              <option value="amber">Amber</option>
              <option value="red">Red</option>
            </select>
            <Input type="datetime-local" {...projectForm.register('startDate')} />
            <Input type="datetime-local" {...projectForm.register('endDate')} />
            <div className="xl:col-span-3">
              <Textarea rows={4} placeholder="Scope, delivery goals, and ownership details" {...projectForm.register('description')} />
            </div>
            <div className="xl:col-span-3 space-y-3">
              <p className="text-sm font-medium text-white">Assign team members</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(employeesQuery.data ?? []).map((employee) => {
                  const checked = selectedMembers.has(employee._id);
                  return (
                    <label key={employee._id} className={`flex cursor-pointer items-start gap-3 rounded-[1.2rem] border px-4 py-3 transition ${checked ? 'border-primary bg-primary/12' : 'border-white/10 bg-white/5 hover:bg-white/8'}`}>
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-[#7F63F4]"
                        checked={checked}
                        onChange={() => {
                          const currentMembers = projectForm.getValues('memberIds');
                          const nextMembers = checked ? currentMembers.filter((memberId) => memberId !== employee._id) : [...currentMembers, employee._id];
                          projectForm.setValue('memberIds', nextMembers, { shouldValidate: true });
                        }}
                      />
                      <div>
                        <p className="font-medium text-white">{employee.firstName} {employee.lastName}</p>
                        <p className="text-sm text-white/55">{employee.designation}</p>
                        <p className="text-xs text-white/40">{employee.department?.name ?? 'Unassigned department'}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="xl:col-span-3">
              <Button type="submit" disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending ? 'Creating workspace...' : 'Create project workspace'}
              </Button>
            </div>
          </form>
          {createProjectMutation.isSuccess ? <p className="text-sm text-emerald-300">Project workspace created and assigned successfully.</p> : null}
          {projectError ? <p className="text-sm text-rose-300">{projectError}</p> : null}
        </Card>
      ) : null}

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Live project workspaces</h3>
          <p className="text-sm text-white/55">Department-aligned delivery work with assigned managers and employee progress updates.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredProjects.map((project) => (
            <Card key={project._id} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-secondary">{project.code}</p>
                  <h4 className="mt-2 text-xl font-semibold text-white">{project.name}</h4>
                  <p className="mt-2 text-sm text-white/55">{project.clientName} • {project.department?.name ?? 'Department not linked'}</p>
                </div>
                <Badge className={healthTone[project.health]}>{project.health}</Badge>
              </div>
              <p className="text-sm text-white/68">{project.description}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/40">Manager</p>
                  <p className="mt-2 font-medium text-white">
                    {project.managerId ? `${project.managerId.firstName} ${project.managerId.lastName}` : 'Not assigned'}
                  </p>
                  <p className="text-sm text-white/50">{project.managerId?.designation ?? 'Pending assignment'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/40">Delivery window</p>
                  <p className="mt-2 font-medium text-white">{formatDate(project.startDate)}</p>
                  <p className="text-sm text-white/50">{project.endDate ? `Ends ${formatDate(project.endDate)}` : 'Open timeline'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-white/55">
                  <span>Status</span>
                  <span>{project.status} • {project.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">Assigned team</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(project.memberIds ?? []).map((member) => (
                    <span key={member._id} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/75">
                      {member.firstName} {member.lastName}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">Recent updates</p>
                {project.updates?.length ? (
                  project.updates.slice(-2).reverse().map((update) => (
                    <div key={update._id} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{update.employeeId.firstName} {update.employeeId.lastName}</p>
                        <Badge>{update.progress}%</Badge>
                      </div>
                      <p className="mt-2 text-sm text-white/68">{update.summary}</p>
                      {update.blockers ? <p className="mt-2 text-sm text-amber-200">Blockers: {update.blockers}</p> : null}
                      <p className="mt-2 text-xs text-white/40">{formatDate(update.submittedAt)}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                    No updates submitted yet.
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
