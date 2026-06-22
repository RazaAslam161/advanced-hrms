export const DEFAULT_OFFICE_TIMEZONE = 'Asia/Karachi';

export const parseTimeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export const getMinutesInTimezone = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
};

export const resolveAttendanceStatus = ({
  minutesIn,
  shiftStartMinutes,
  gracePeriodMinutes,
}: {
  minutesIn: number;
  shiftStartMinutes: number;
  gracePeriodMinutes: number;
}) => {
  const lateThreshold = shiftStartMinutes + gracePeriodMinutes;
  if (minutesIn > lateThreshold) {
    return { status: 'late' as const, lateMinutes: minutesIn - shiftStartMinutes };
  }

  return { status: 'present' as const, lateMinutes: 0 };
};

export const resolveOvertimeHours = ({
  minutesOut,
  shiftEndMinutes,
}: {
  minutesOut: number;
  shiftEndMinutes: number;
}) => {
  if (minutesOut <= shiftEndMinutes) {
    return 0;
  }

  return Number(((minutesOut - shiftEndMinutes) / 60).toFixed(2));
};
