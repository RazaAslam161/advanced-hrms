import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { DataTable } from '../../components/DataTable';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { useAuthStore } from '../../store/authStore';
import { hasAnyPermission } from '../../lib/permissions';
import { formatCurrency, getApiErrorMessage, triggerBrowserDownload } from '../../lib/utils';

const payrollRunSchema = z.object({
  month: z.string().min(3),
  year: z.coerce.number().min(2024),
});

interface PayrollRunRow {
  _id: string;
  month: string;
  year: number;
  status: string;
}

interface PayrollRecordRow {
  _id: string;
  month: string;
  year: number;
  status: string;
  currency: string;
  country: string;
  salary?: {
    grossSalary?: number;
    tax?: number;
    providentFund?: number;
    loanDeduction?: number;
    netSalary?: number;
  };
  employeeId?: {
    employeeId?: string;
    firstName?: string;
    lastName?: string;
  };
}

export const PayrollPage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canProcessPayroll = hasAnyPermission(user?.permissions, ['payroll.process', 'payroll.approve']);
  const form = useForm({
    resolver: zodResolver(payrollRunSchema),
    defaultValues: {
      month: new Date().toLocaleString('en-US', { month: 'long' }),
      year: new Date().getFullYear(),
    },
  });

  const runsQuery = useQuery({
    queryKey: ['payroll-runs'],
    queryFn: async () => {
      const { data } = await api.get('/payroll/runs');
      return data.data as PayrollRunRow[];
    },
    enabled: canProcessPayroll,
  });

  const recordsQuery = useQuery({
    queryKey: ['payroll-records'],
    queryFn: async () => {
      const { data } = await api.get('/payroll/records');
      return data.data as PayrollRecordRow[];
    },
  });

  const processMutation = useMutation({
    mutationFn: async (values: { month: string; year: number }) => {
      await api.post('/payroll/process', values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (runId: string) => {
      await api.patch(`/payroll/runs/${runId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-records'] });
    },
  });

  const payslipMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const response = await api.get(`/payroll/records/${recordId}/payslip`, { responseType: 'blob' });
      triggerBrowserDownload(response.data, `payslip-${recordId}.pdf`);
    },
  });

  if ((canProcessPayroll && runsQuery.isLoading) || recordsQuery.isLoading) {
    return <LoadingState label="Loading payroll workspace..." />;
  }

  if ((canProcessPayroll && runsQuery.isError) || recordsQuery.isError) {
    return <ErrorState label="Payroll data could not be loaded." />;
  }

  const mutationError =
    processMutation.isError || approveMutation.isError || payslipMutation.isError
      ? getApiErrorMessage(processMutation.error ?? approveMutation.error ?? payslipMutation.error, 'Payroll action could not be completed.')
      : null;

  return (
    <div className="space-y-6">
      {canProcessPayroll ? (
        <Card className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Process monthly payroll</h3>
          <form data-testid="payroll-run-form" className="flex flex-col gap-3 md:flex-row" onSubmit={form.handleSubmit((values) => processMutation.mutate(values))}>
            <Input placeholder="Month" {...form.register('month')} />
            <Input type="number" placeholder="Year" {...form.register('year')} />
            <Button data-testid="payroll-run-submit" type="submit" disabled={processMutation.isPending}>
              {processMutation.isPending ? 'Processing...' : 'Run Payroll'}
            </Button>
          </form>
          {processMutation.isSuccess && <p className="text-sm text-emerald-600">Payroll run created. Approve it once the records finish processing.</p>}
          {mutationError && <p className="text-sm text-red-500">{mutationError}</p>}
        </Card>
      ) : (
        <Card className="space-y-2">
          <h3 className="text-lg font-semibold text-white">My payroll</h3>
          <p className="text-sm text-white/55">Your self-service payslips, tax values, and monthly net salary are localized by employee currency.</p>
          {mutationError && <p className="text-sm text-red-500">{mutationError}</p>}
        </Card>
      )}
      <div className={`grid gap-6 ${canProcessPayroll ? 'xl:grid-cols-2' : ''}`}>
        {canProcessPayroll ? (
          <DataTable<PayrollRunRow>
            title="Payroll Runs"
            items={runsQuery.data ?? []}
            columns={[
              { key: 'month', header: 'Month' },
              { key: 'year', header: 'Year' },
              { key: 'status', header: 'Status' },
              {
                key: 'actions',
                header: 'Actions',
                render: (item) =>
                  item.status === 'pendingApproval' ? (
                    <Button variant="outline" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(item._id)}>
                      Approve Run
                    </Button>
                  ) : (
                    'Ready'
                  ),
              },
            ]}
          />
        ) : null}
        <DataTable
          title="Payroll Records"
          items={recordsQuery.data ?? []}
          columns={[
            {
              key: 'employeeId',
              header: 'Employee',
              render: (item) =>
                item.employeeId?.employeeId
                  ? `${item.employeeId.employeeId} - ${item.employeeId.firstName ?? ''} ${item.employeeId.lastName ?? ''}`.trim()
                  : 'Self-service record',
            },
            { key: 'month', header: 'Month' },
            { key: 'year', header: 'Year' },
            { key: 'status', header: 'Status' },
            { key: 'country', header: 'Country' },
            { key: 'salary', header: 'Net Salary', render: (item) => formatCurrency(item.salary?.netSalary ?? 0, item.currency ?? 'PKR') },
            { key: 'tax', header: 'Tax', render: (item) => formatCurrency(item.salary?.tax ?? 0, item.currency ?? 'PKR') },
            {
              key: 'actions',
              header: 'Actions',
              render: (item) => (
                <Button variant="outline" disabled={payslipMutation.isPending} onClick={() => payslipMutation.mutate(item._id)}>
                  Download Payslip
                </Button>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};
