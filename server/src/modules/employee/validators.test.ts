import { registerSchema } from '../auth/validators';
import { employeeBodySchema, employeeSelfProfileSchema } from './validators';

describe('optional relation field normalization', () => {
  it('normalizes blank employee relationship fields to undefined', () => {
    const payload = employeeBodySchema.parse({
      firstName: 'Raza',
      lastName: 'Aslam',
      email: 'raza@example.com',
      role: 'employee',
      department: '',
      designation: 'Engineer',
      reportingTo: '',
      employmentType: 'full-time',
      joiningDate: new Date('2026-04-14T00:00:00.000Z').toISOString(),
      salary: {
        basic: 100000,
        houseRent: 0,
        medical: 0,
        transport: 0,
        currency: 'PKR',
        bonus: 0,
      },
      emergencyContacts: [],
      skills: [],
      timezone: 'Asia/Karachi',
      workLocation: 'onsite',
      country: 'Pakistan',
      status: 'active',
    });

    expect(payload.department).toBeUndefined();
    expect(payload.reportingTo).toBeUndefined();
  });

  it('normalizes blank register department to undefined', () => {
    const payload = registerSchema.parse({
      email: 'raza@example.com',
      role: 'employee',
      firstName: 'Raza',
      lastName: 'Aslam',
      department: '',
      designation: 'Engineer',
    });

    expect(payload.department).toBeUndefined();
  });

  it('accepts a valid self-service profile update payload', () => {
    const payload = employeeSelfProfileSchema.parse({
      firstName: 'Raza',
      lastName: 'Aslam',
      displayName: '',
      email: 'raza@example.com',
      phone: '',
      timezone: 'Asia/Karachi',
      workLocation: 'hybrid',
      country: 'Pakistan',
      emergencyContacts: [
        {
          name: 'Ali Aslam',
          relation: 'Brother',
          phone: '+92-300-0000000',
        },
      ],
    });

    expect(payload.displayName).toBeUndefined();
    expect(payload.phone).toBeUndefined();
    expect(payload.emergencyContacts).toHaveLength(1);
  });
});
