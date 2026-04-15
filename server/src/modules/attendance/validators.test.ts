import { attendanceActionSchema, shiftSchema, overtimeRequestSchema, geoSchema } from './validators';

describe('attendance validators', () => {
  describe('geoSchema', () => {
    it('accepts valid lat/lng numbers', () => {
      const result = geoSchema.safeParse({ lat: 33.72, lng: 73.04 });
      expect(result.success).toBe(true);
    });

    it('rejects missing lat', () => {
      const result = geoSchema.safeParse({ lng: 73.04 });
      expect(result.success).toBe(false);
    });
  });

  describe('attendanceActionSchema', () => {
    const validAction = {
      lat: 33.72,
      lng: 73.04,
      timestamp: '2026-04-15T08:00:00.000Z',
    };

    it('accepts a valid clock-in/out action', () => {
      const result = attendanceActionSchema.safeParse(validAction);
      expect(result.success).toBe(true);
    });

    it('rejects a non-ISO-datetime timestamp', () => {
      const result = attendanceActionSchema.safeParse({ ...validAction, timestamp: 'today' });
      expect(result.success).toBe(false);
    });

    it('rejects non-numeric lat', () => {
      const result = attendanceActionSchema.safeParse({ ...validAction, lat: 'north' });
      expect(result.success).toBe(false);
    });
  });

  describe('shiftSchema', () => {
    const validShift = {
      name: 'Morning',
      code: 'MRN',
      startTime: '08:00',
      endTime: '17:00',
    };

    it('accepts a valid shift definition', () => {
      const result = shiftSchema.safeParse(validShift);
      expect(result.success).toBe(true);
    });

    it('defaults gracePeriodMinutes to 10', () => {
      const parsed = shiftSchema.parse(validShift);
      expect(parsed.gracePeriodMinutes).toBe(10);
    });

    it('defaults workDays to Mon-Fri', () => {
      const parsed = shiftSchema.parse(validShift);
      expect(parsed.workDays).toEqual([1, 2, 3, 4, 5]);
    });

    it('defaults overtimeThresholdHours to 8', () => {
      const parsed = shiftSchema.parse(validShift);
      expect(parsed.overtimeThresholdHours).toBe(8);
    });

    it('defaults isDefault to false', () => {
      const parsed = shiftSchema.parse(validShift);
      expect(parsed.isDefault).toBe(false);
    });

    it('rejects a startTime without HH:MM format', () => {
      const result = shiftSchema.safeParse({ ...validShift, startTime: '8:00' });
      expect(result.success).toBe(false);
    });

    it('rejects a name shorter than 2 characters', () => {
      const result = shiftSchema.safeParse({ ...validShift, name: 'M' });
      expect(result.success).toBe(false);
    });

    it('rejects a workDay value outside 0-6', () => {
      const result = shiftSchema.safeParse({ ...validShift, workDays: [1, 2, 7] });
      expect(result.success).toBe(false);
    });

    it('accepts a negative gracePeriodMinutes boundary of exactly 0', () => {
      const result = shiftSchema.safeParse({ ...validShift, gracePeriodMinutes: 0 });
      expect(result.success).toBe(true);
    });
  });

  describe('overtimeRequestSchema', () => {
    it('accepts a valid overtime request', () => {
      const result = overtimeRequestSchema.safeParse({
        attendanceId: 'att-id-1',
        hours: 2,
        reason: 'Project deadline',
      });
      expect(result.success).toBe(true);
    });

    it('rejects hours below minimum of 0.5', () => {
      const result = overtimeRequestSchema.safeParse({ attendanceId: 'att-id-1', hours: 0.25, reason: 'Extra work done' });
      expect(result.success).toBe(false);
    });

    it('rejects a reason shorter than 5 characters', () => {
      const result = overtimeRequestSchema.safeParse({ attendanceId: 'att-id-1', hours: 1, reason: 'ok' });
      expect(result.success).toBe(false);
    });
  });
});
