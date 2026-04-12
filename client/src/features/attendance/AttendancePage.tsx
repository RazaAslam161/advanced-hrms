import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { DataTable } from '../../components/DataTable';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { getApiErrorMessage } from '../../lib/utils';

const defaultGeo = { lat: 31.4697, lng: 74.2728, timestamp: new Date().toISOString() };
interface AttendanceRow {
  _id: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  totalHours: number;
  status: string;
}

const resolveGeoLocation = async () =>
  new Promise<{ lat: number; lng: number }>((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: defaultGeo.lat, lng: defaultGeo.lng });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => resolve({ lat: defaultGeo.lat, lng: defaultGeo.lng }),
      { enableHighAccuracy: true, timeout: 5000 },
    );
  });

export const AttendancePage = () => {
  const queryClient = useQueryClient();

  const dashboardQuery = useQuery({
    queryKey: ['attendance-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/attendance/dashboard');
      return data.data;
    },
  });

  const recordsQuery = useQuery({
    queryKey: ['attendance-records'],
    queryFn: async () => {
      const { data } = await api.get('/attendance');
      return data.data as AttendanceRow[];
    },
  });

  const checkMutation = useMutation({
    mutationFn: async (type: 'check-in' | 'check-out') => {
      const geo = await resolveGeoLocation();
      await api.post(`/attendance/${type}`, { ...geo, timestamp: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
    },
  });

  if (dashboardQuery.isLoading || recordsQuery.isLoading) {
    return <LoadingState label="Loading attendance operations..." />;
  }

  if (dashboardQuery.isError || recordsQuery.isError) {
    return <ErrorState label="Attendance information could not be loaded." />;
  }

  const mutationError = checkMutation.isError ? getApiErrorMessage(checkMutation.error, 'Attendance action could not be completed.') : null;

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Real-time attendance board</h3>
          <p className="text-sm text-white/55">
            {dashboardQuery.data.totalCheckedIn} employees currently clocked in, {dashboardQuery.data.totalCheckedOut} checked out today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => checkMutation.mutate('check-in')} disabled={checkMutation.isPending}>
            Check In
          </Button>
          <Button variant="outline" onClick={() => checkMutation.mutate('check-out')} disabled={checkMutation.isPending}>
            Check Out
          </Button>
        </div>
      </Card>
      {checkMutation.isSuccess && <p className="text-sm text-emerald-600">Attendance status updated successfully.</p>}
      {mutationError && <p className="text-sm text-red-500">{mutationError}</p>}
      <DataTable<AttendanceRow>
        title="Attendance Records"
        items={recordsQuery.data ?? []}
        columns={[
          { key: 'date', header: 'Date', render: (item) => new Date(item.date).toLocaleDateString() },
          { key: 'checkIn', header: 'Check In', render: (item) => (item.checkIn ? new Date(item.checkIn).toLocaleTimeString() : '-') },
          { key: 'checkOut', header: 'Check Out', render: (item) => (item.checkOut ? new Date(item.checkOut).toLocaleTimeString() : '-') },
          { key: 'totalHours', header: 'Hours' },
          { key: 'status', header: 'Status' },
        ]}
      />
    </div>
  );
};
