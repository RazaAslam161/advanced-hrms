import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { DataTable } from '../../components/DataTable';
import { ErrorState, LoadingState } from '../../components/AsyncState';
import { getApiErrorMessage } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import type { Department } from '../../types';

const defaultGeo = { lat: 31.4697, lng: 74.2728, timestamp: new Date().toISOString() };

interface AttendanceRow {
  _id: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  totalHours: number;
  status: string;
  employeeId?: {
    employeeId: string;
    firstName: string;
    lastName: string;
    designation?: string;
    department?: { _id: string; name: string; code: string };
  };
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
  const user = useAuthStore((state) => state.user);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const monthRange = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const baseDate = new Date(year, (month || 1) - 1, 1);
    return {
      startDate: startOfMonth(baseDate).toISOString(),
      endDate: endOfMonth(baseDate).toISOString(),
    };
  }, [selectedMonth]);

  const dashboardQuery = useQuery({
    queryKey: ['attendance-dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/attendance/dashboard');
      return data.data;
    },
  });

  const departmentsQuery = useQuery({
    queryKey: ['attendance-departments'],
    queryFn: async () => {
      const { data } = await api.get('/departments', { params: { limit: 100 } });
      return data.data as Department[];
    },
    enabled: user?.role !== 'employee',
  });

  const recordsQuery = useQuery({
    queryKey: ['attendance-records', selectedMonth, selectedDepartment],
    queryFn: async () => {
      const { data } = await api.get('/attendance', {
        params: {
          startDate: monthRange.startDate,
          endDate: monthRange.endDate,
          department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        },
      });
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

  if (dashboardQuery.isLoading || recordsQuery.isLoading || departmentsQuery.isLoading) {
    return <LoadingState label="Loading attendance operations..." />;
  }

  if (dashboardQuery.isError || recordsQuery.isError || departmentsQuery.isError) {
    return <ErrorState label="Attendance information could not be loaded." />;
  }

  const mutationError = checkMutation.isError ? getApiErrorMessage(checkMutation.error, 'Attendance action could not be completed.') : null;
  const canCheckAttendance = user?.role !== 'superAdmin' && user?.permissions.includes('attendance.checkin');

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Real-time attendance board</h3>
          <p className="text-sm text-white/55">
            {dashboardQuery.data.totalCheckedIn} employees currently clocked in, {dashboardQuery.data.totalCheckedOut} checked out today.
          </p>
        </div>
        {canCheckAttendance ? (
          <div className="flex gap-3">
            <Button onClick={() => checkMutation.mutate('check-in')} disabled={checkMutation.isPending}>
              Check In
            </Button>
            <Button variant="outline" onClick={() => checkMutation.mutate('check-out')} disabled={checkMutation.isPending}>
              Check Out
            </Button>
          </div>
        ) : (
          <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/55">
            Super Admin uses this page for oversight only.
          </div>
        )}
      </Card>

      <Card className="grid gap-3 md:grid-cols-3">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.22em] text-secondary">Month</p>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white"
          />
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.22em] text-secondary">Department</p>
          <select
            value={selectedDepartment}
            onChange={(event) => setSelectedDepartment(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white"
          >
            <option value="all">All departments</option>
            {(departmentsQuery.data ?? []).map((department) => (
              <option key={department._id} value={department._id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/60">
          Use the month and department filters above for a cleaner attendance view across the company.
        </div>
      </Card>

      {checkMutation.isSuccess && <p className="text-sm text-emerald-300">Attendance status updated successfully.</p>}
      {mutationError && <p className="text-sm text-rose-300">{mutationError}</p>}

      <DataTable<AttendanceRow>
        title="Attendance Records"
        items={recordsQuery.data ?? []}
        columns={[
          { key: 'employee', header: 'Employee', render: (item) => (item.employeeId ? `${item.employeeId.firstName} ${item.employeeId.lastName}` : 'Current user') },
          { key: 'department', header: 'Department', render: (item) => item.employeeId?.department?.name ?? '-' },
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
