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
  lateMinutes?: number;
  overtimeHours?: number;
  status: string;
  employeeId?: {
    employeeId: string;
    firstName: string;
    lastName: string;
    designation?: string;
    department?: { _id: string; name: string; code: string };
  };
}

const formatClockTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

const formatOfficeTime = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

const formatLateMinutes = (minutes?: number) => (minutes && minutes > 0 ? `${minutes} min late` : '-');

const formatOvertimeHours = (hours?: number) => (hours && hours > 0 ? `${hours} hr OT` : '-');

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

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const checkMutation = useMutation({
    mutationFn: async (type: 'check-in' | 'check-out') => {
      const geo = await resolveGeoLocation();
      const { data } = await api.post(`/attendance/${type}`, { ...geo, timestamp: new Date().toISOString() });
      return data.data as AttendanceRow;
    },
    onSuccess: (record, type) => {
      setActionMessage(
        type === 'check-in'
          ? record.status === 'late'
            ? `Checked in as late (${record.lateMinutes ?? 0} minutes after 10:00 AM office start).`
            : 'Checked in on time.'
          : (record.overtimeHours ?? 0) > 0
            ? `Checked out with ${record.overtimeHours} hour(s) overtime after 6:00 PM.`
            : 'Checked out successfully.',
      );
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
  const canCheckAttendance = user?.role !== 'superAdmin' && (user?.permissions?.includes('attendance.checkin') ?? false);
  const officeShift = dashboardQuery.data?.officeShift as
    | { startTime: string; endTime: string; gracePeriodMinutes: number }
    | undefined;

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--color-heading)]">Real-time attendance board</h3>
          <p className="text-sm theme-muted">
            {dashboardQuery.data.totalCheckedIn} employees currently clocked in, {dashboardQuery.data.totalCheckedOut} checked out today.
          </p>
          {officeShift ? (
            <p className="mt-2 text-xs theme-muted">
              Office hours: {formatOfficeTime(officeShift.startTime)} – {formatOfficeTime(officeShift.endTime)} (PKT). Late arrival is
              auto-marked after {officeShift.gracePeriodMinutes} min grace. Overtime is auto-calculated after checkout.
            </p>
          ) : null}
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

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className="mb-2 text-xs uppercase tracking-[0.22em] text-secondary">Month</p>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="field-select"
          />
        </div>
        {user?.role !== 'employee' ? (
          <div className="flex-1">
            <p className="mb-2 text-xs uppercase tracking-[0.22em] text-secondary">Department</p>
            <select
              value={selectedDepartment}
              onChange={(event) => setSelectedDepartment(event.target.value)}
              className="field-select"
            >
              <option value="all">All departments</option>
              {(departmentsQuery.data ?? []).map((department) => (
                <option key={department._id} value={department._id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </Card>

      {actionMessage ? <p className="text-sm text-emerald-300">{actionMessage}</p> : null}
      {mutationError && <p className="text-sm text-rose-300">{mutationError}</p>}

      <DataTable<AttendanceRow>
        title="Attendance Records"
        items={recordsQuery.data ?? []}
        columns={[
          { key: 'employee', header: 'Employee', render: (item) => (item.employeeId ? `${item.employeeId.firstName} ${item.employeeId.lastName}` : 'Current user') },
          { key: 'department', header: 'Department', render: (item) => item.employeeId?.department?.name ?? '-' },
          { key: 'date', header: 'Date', render: (item) => new Date(item.date).toLocaleDateString() },
          { key: 'checkIn', header: 'Check In', render: (item) => (item.checkIn ? formatClockTime(item.checkIn) : '-') },
          { key: 'checkOut', header: 'Check Out', render: (item) => (item.checkOut ? formatClockTime(item.checkOut) : '-') },
          { key: 'lateMinutes', header: 'Late', render: (item) => formatLateMinutes(item.lateMinutes) },
          { key: 'overtimeHours', header: 'Overtime', render: (item) => formatOvertimeHours(item.overtimeHours) },
          { key: 'totalHours', header: 'Hours' },
          { key: 'status', header: 'Status' },
        ]}
      />
    </div>
  );
};
