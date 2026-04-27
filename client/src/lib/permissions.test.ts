import { hasPermission, hasAnyPermission, allPermissionOptions, permissionGroups } from './permissions';

describe('permissionGroups', () => {
  it('contains expected top-level groups', () => {
    const keys = Object.keys(permissionGroups);
    expect(keys).toContain('auth');
    expect(keys).toContain('employees');
    expect(keys).toContain('payroll');
    expect(keys).toContain('attendance');
  });

  it('employees group contains required permissions', () => {
    expect(permissionGroups.employees).toContain('employees.read');
    expect(permissionGroups.employees).toContain('employees.create');
    expect(permissionGroups.employees).toContain('employees.delete');
  });
});

describe('allPermissionOptions', () => {
  it('is a flat array containing all permission strings', () => {
    expect(Array.isArray(allPermissionOptions)).toBe(true);
    expect(allPermissionOptions.length).toBeGreaterThan(0);
  });

  it('includes permissions from every group', () => {
    expect(allPermissionOptions).toContain('employees.read');
    expect(allPermissionOptions).toContain('payroll.process');
    expect(allPermissionOptions).toContain('analytics.reports');
  });

  it('does not contain duplicates', () => {
    const unique = new Set(allPermissionOptions);
    expect(unique.size).toBe(allPermissionOptions.length);
  });
});

describe('hasPermission', () => {
  it('returns true when the permission is in the list', () => {
    expect(hasPermission(['employees.read', 'payroll.read'], 'employees.read')).toBe(true);
  });

  it('returns false when the permission is NOT in the list', () => {
    expect(hasPermission(['employees.read'], 'payroll.process')).toBe(false);
  });

  it('returns false when the permissions array is empty', () => {
    expect(hasPermission([], 'employees.read')).toBe(false);
  });

  it('returns false when permissions is undefined', () => {
    expect(hasPermission(undefined, 'employees.read')).toBe(false);
  });
});

describe('hasAnyPermission', () => {
  it('returns true when at least one required permission is present', () => {
    expect(hasAnyPermission(['employees.read', 'attendance.read'], ['payroll.process', 'attendance.read'])).toBe(true);
  });

  it('returns false when none of the required permissions are present', () => {
    expect(hasAnyPermission(['employees.read'], ['payroll.process', 'analytics.reports'])).toBe(false);
  });

  it('returns false when the user permissions array is empty', () => {
    expect(hasAnyPermission([], ['employees.read', 'payroll.read'])).toBe(false);
  });

  it('returns false when permissions is undefined', () => {
    expect(hasAnyPermission(undefined, ['employees.read'])).toBe(false);
  });

  it('returns false when required permissions array is empty', () => {
    expect(hasAnyPermission(['employees.read'], [])).toBe(false);
  });

  it('returns true when all required permissions are present', () => {
    expect(hasAnyPermission(['employees.read', 'payroll.read', 'leave.read'], ['employees.read', 'payroll.read'])).toBe(true);
  });
});
