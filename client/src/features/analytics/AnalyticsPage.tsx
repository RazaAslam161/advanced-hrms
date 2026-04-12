import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { getApiErrorMessage, triggerBrowserDownload } from '../../lib/utils';

export const AnalyticsPage = () => {
  const [moduleName, setModuleName] = useState('employees');
  const chartsQuery = useQuery({
    queryKey: ['analytics-page-charts'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/charts');
      return data.data;
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (moduleName: string) => {
      const response = await api.post(
        '/analytics/reports',
        {
          module: moduleName,
          format: 'excel',
        },
        { responseType: 'blob' },
      );
      triggerBrowserDownload(response.data, `${moduleName}-report.xlsx`);
    },
  });

  const reportError = reportMutation.isError ? getApiErrorMessage(reportMutation.error, 'Report generation failed.') : null;

  if (chartsQuery.isLoading) {
    return <LoadingState label="Loading analytics suite..." />;
  }

  if (chartsQuery.isError) {
    return <ErrorState label="Analytics charts could not be loaded." />;
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-3 md:flex-row md:items-center">
        <Input value={moduleName} placeholder="Module to export (employees, leave, payroll...)" onChange={(event) => setModuleName(event.target.value)} />
        <Button disabled={reportMutation.isPending} onClick={() => reportMutation.mutate(moduleName.trim().toLowerCase() || 'employees')}>
          {reportMutation.isPending ? 'Generating...' : 'Generate Report'}
        </Button>
      </Card>
      {reportMutation.isSuccess && <p className="text-sm text-emerald-600">Report download started successfully.</p>}
      {reportError && <p className="text-sm text-red-500">{reportError}</p>}
      <Card className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Department distribution</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartsQuery.data.departmentDistribution}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="name" stroke="#a8a2c5" />
              <YAxis stroke="#a8a2c5" />
              <Tooltip />
              <Bar dataKey="value" fill="#7F63F4" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
