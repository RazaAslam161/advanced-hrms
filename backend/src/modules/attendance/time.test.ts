import { getMinutesInTimezone, resolveAttendanceStatus, resolveOvertimeHours } from './time';

describe('attendance time helpers', () => {
  it('reads local office minutes in Asia/Karachi', () => {
    const value = getMinutesInTimezone(new Date('2026-06-18T10:30:00+05:00'), 'Asia/Karachi');
    expect(value).toBe(10 * 60 + 30);
  });

  it('marks check-in after grace period as late', () => {
    const result = resolveAttendanceStatus({
      minutesIn: 10 * 60 + 16,
      shiftStartMinutes: 10 * 60,
      gracePeriodMinutes: 10,
    });

    expect(result.status).toBe('late');
    expect(result.lateMinutes).toBe(16);
  });

  it('keeps check-in inside grace period as present', () => {
    const result = resolveAttendanceStatus({
      minutesIn: 10 * 60 + 8,
      shiftStartMinutes: 10 * 60,
      gracePeriodMinutes: 10,
    });

    expect(result.status).toBe('present');
    expect(result.lateMinutes).toBe(0);
  });

  it('calculates overtime after shift end', () => {
    expect(
      resolveOvertimeHours({
        minutesOut: 18 * 60 + 45,
        shiftEndMinutes: 18 * 60,
      }),
    ).toBe(0.75);
  });
});
