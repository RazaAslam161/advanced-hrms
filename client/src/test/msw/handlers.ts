import { rest } from 'msw';
import type { Employee, User } from '../../types';
import {
  defaultActivity,
  defaultNotificationPreferences,
  defaultProfile,
  defaultSessions,
  makeApiResponse,
  makeEmployee,
  testDepartments,
  testUsers,
} from '../fixtures';

const apiBaseUrl = 'http://localhost:4001/api/v1';

interface LeaveRequestRecord {
  _id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  employeeId?: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: { name: string };
  };
}

interface MockApiState {
  currentUser: User;
  currentProfile: Employee;
  employees: Employee[];
  departments: typeof testDepartments;
  leaveRequests: LeaveRequestRecord[];
  leaveBalances: {
    balances: Record<string, number>;
    used: Record<string, number>;
  };
  notificationPreferences: typeof defaultNotificationPreferences;
  sessions: typeof defaultSessions;
  activity: typeof defaultActivity;
  nextEmployeeNumber: number;
}

const buildDefaultState = (): MockApiState => ({
  currentUser: testUsers.employee,
  currentProfile: {
    ...defaultProfile,
    role: 'employee',
  },
  employees: [
    makeEmployee({
      _id: 'employee-1',
      employeeId: 'MLT-2026-0001',
      firstName: 'Aiman',
      lastName: 'Anwar',
      email: 'employee.portal@metalabstech.com',
      role: 'employee',
    }),
  ],
  departments: [...testDepartments],
  leaveRequests: [
    {
      _id: 'leave-1',
      leaveType: 'casual',
      startDate: '2026-04-20T09:00:00.000Z',
      endDate: '2026-04-20T18:00:00.000Z',
      days: 1,
      status: 'pendingManager',
      employeeId: {
        _id: 'employee-1',
        firstName: 'Aiman',
        lastName: 'Anwar',
        employeeId: 'MLT-2026-0001',
        department: { name: 'Engineering' },
      },
    },
  ],
  leaveBalances: {
    balances: {
      casual: 10,
      sick: 8,
      annual: 14,
      unpaid: 0,
      maternity: 90,
      paternity: 30,
    },
    used: {
      casual: 1,
      sick: 0,
      annual: 0,
      unpaid: 0,
      maternity: 0,
      paternity: 0,
    },
  },
  notificationPreferences: defaultNotificationPreferences,
  sessions: defaultSessions,
  activity: defaultActivity,
  nextEmployeeNumber: 2,
});

export const mockApiState: MockApiState = buildDefaultState();

export const resetMockApiState = () => {
  Object.assign(mockApiState, buildDefaultState());
};

const resolveRoleUser = (email: string) => {
  const match = Object.values(testUsers).find((user) => user.email === email);
  return match ?? null;
};

export const handlers = [
  rest.post(`${apiBaseUrl}/auth/login`, async (req, res, ctx) => {
    const { email, password } = await req.json<{ email: string; password: string }>();
    const matchedUser = resolveRoleUser(email);

    if (!matchedUser || password !== 'Meta@12345') {
      return res(ctx.status(401), ctx.json({ success: false, message: 'Invalid email or password' }));
    }

    mockApiState.currentUser = matchedUser;
    mockApiState.currentProfile = {
      ...defaultProfile,
      _id: `${matchedUser.role}-profile`,
      employeeId: matchedUser.role === 'employee' ? 'MLT-2026-0001' : 'MLT-2026-0002',
      firstName: matchedUser.firstName,
      lastName: matchedUser.lastName,
      email: matchedUser.email,
      role: matchedUser.role,
      designation:
        matchedUser.role === 'superAdmin'
          ? 'Chief Executive Officer'
          : matchedUser.role === 'admin'
            ? 'Head of HR'
            : matchedUser.role === 'manager'
              ? 'Delivery Manager'
              : matchedUser.role === 'recruiter'
                ? 'Talent Acquisition Specialist'
                : 'MERN Stack Engineer',
    };

    return res(
      ctx.status(200),
      ctx.cookie('refreshToken', 'test-refresh-token'),
      ctx.json(
        makeApiResponse(
          {
            accessToken: `token-${matchedUser.role}`,
            user: matchedUser,
          },
          'Login successful',
        ),
      ),
    );
  }),
  rest.post(`${apiBaseUrl}/auth/logout`, (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(makeApiResponse({ loggedOut: true }, 'Logout successful'))),
  ),
  rest.get(`${apiBaseUrl}/auth/me/sessions`, (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(makeApiResponse(mockApiState.sessions, 'Sessions fetched successfully'))),
  ),
  rest.get(`${apiBaseUrl}/auth/me/activity`, (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(makeApiResponse(mockApiState.activity, 'Account activity fetched successfully'))),
  ),
  rest.get(`${apiBaseUrl}/employees/me/activity`, (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(makeApiResponse(mockApiState.activity, 'Employee activity fetched successfully'))),
  ),
  rest.get(`${apiBaseUrl}/employees`, (req, res, ctx) => {
    const limit = Number(req.url.searchParams.get('limit') ?? mockApiState.employees.length);
    const page = Number(req.url.searchParams.get('page') ?? 1);
    const items = mockApiState.employees.slice(0, limit);
    return res(
      ctx.status(200),
      ctx.json(
        makeApiResponse(items, 'Employees fetched successfully', {
          page,
          limit,
          total: mockApiState.employees.length,
          totalPages: Math.max(1, Math.ceil(mockApiState.employees.length / limit)),
        }),
      ),
    );
  }),
  rest.post(`${apiBaseUrl}/employees`, async (req, res, ctx) => {
    const payload = await req.json<{
      firstName: string;
      lastName: string;
      email: string;
      role: Employee['role'];
      department?: string;
      designation: string;
      employmentType: string;
      joiningDate: string;
      status: string;
      salary: Employee['salary'];
    }>();

    const employeeNumber = String(mockApiState.nextEmployeeNumber).padStart(4, '0');
    mockApiState.nextEmployeeNumber += 1;

    const createdEmployee = makeEmployee({
      _id: `employee-${employeeNumber}`,
      employeeId: `MLT-2026-${employeeNumber}`,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      role: payload.role ?? 'employee',
      designation: payload.designation,
      employmentType: payload.employmentType,
      joiningDate: payload.joiningDate,
      status: payload.status,
      department: mockApiState.departments.find((department) => department._id === payload.department) ?? undefined,
      salary: payload.salary,
    });

    mockApiState.employees.unshift(createdEmployee);

    return res(
      ctx.status(201),
      ctx.json(
        makeApiResponse(
          {
            employee: createdEmployee,
            credentials: {
              email: createdEmployee.email,
              role: createdEmployee.role ?? 'employee',
              generatedPassword: 'MetaTX!12345',
            },
          },
          'Employee created successfully',
        ),
      ),
    );
  }),
  rest.get(`${apiBaseUrl}/employees/directory`, (_req, res, ctx) =>
    res(
      ctx.status(200),
      ctx.json(
        makeApiResponse(
          mockApiState.employees.map((employee) => ({
            _id: employee._id,
            employeeId: employee.employeeId,
            firstName: employee.firstName,
            lastName: employee.lastName,
          })),
          'Employee directory fetched successfully',
        ),
      ),
    ),
  ),
  rest.get(`${apiBaseUrl}/employees/me`, (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(makeApiResponse(mockApiState.currentProfile, 'Employee profile fetched successfully'))),
  ),
  rest.get(`${apiBaseUrl}/departments`, (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(makeApiResponse(mockApiState.departments, 'Departments fetched successfully'))),
  ),
  rest.get(`${apiBaseUrl}/leave/balances`, (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(makeApiResponse(mockApiState.leaveBalances, 'Leave balances fetched successfully'))),
  ),
  rest.get(`${apiBaseUrl}/leave`, (_req, res, ctx) =>
    res(ctx.status(200), ctx.json(makeApiResponse(mockApiState.leaveRequests, 'Leave requests fetched successfully'))),
  ),
  rest.post(`${apiBaseUrl}/leave/apply`, async (req, res, ctx) => {
    const payload = await req.json<{
      leaveType: string;
      startDate: string;
      endDate: string;
      halfDay: boolean;
      reason: string;
    }>();

    const newRequest: LeaveRequestRecord = {
      _id: `leave-${mockApiState.leaveRequests.length + 1}`,
      leaveType: payload.leaveType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      days: payload.halfDay ? 0.5 : 1,
      status: 'pendingManager',
      employeeId: {
        _id: mockApiState.currentProfile._id,
        firstName: mockApiState.currentProfile.firstName,
        lastName: mockApiState.currentProfile.lastName,
        employeeId: mockApiState.currentProfile.employeeId,
        department: mockApiState.currentProfile.department ? { name: mockApiState.currentProfile.department.name } : undefined,
      },
    };

    mockApiState.leaveRequests.unshift(newRequest);

    return res(ctx.status(201), ctx.json(makeApiResponse(newRequest, 'Leave request submitted successfully')));
  }),
  rest.patch(`${apiBaseUrl}/leave/:id/approve`, async (req, res, ctx) => {
    const payload = await req.json<{ status: 'approved' | 'rejected' }>();
    const target = mockApiState.leaveRequests.find((item) => item._id === req.params.id);
    if (!target) {
      return res(ctx.status(404), ctx.json({ success: false, message: 'Leave request not found' }));
    }

    target.status = payload.status === 'approved' ? 'approved' : 'rejected';
    return res(ctx.status(200), ctx.json(makeApiResponse(target, 'Leave request updated successfully')));
  }),
  rest.get(`${apiBaseUrl}/notifications/preferences/me`, (_req, res, ctx) =>
    res(
      ctx.status(200),
      ctx.json(makeApiResponse(mockApiState.notificationPreferences, 'Notification preferences fetched successfully')),
    ),
  ),
];
