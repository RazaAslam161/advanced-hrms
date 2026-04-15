import { faker } from '@faker-js/faker';
import { subMonths, addDays, eachWeekOfInterval, endOfMonth, startOfMonth } from 'date-fns';
import { connectDatabase } from '../config/db';
import { logger } from '../common/utils/logger';
import { hashPassword } from '../common/utils/password';
import { UserModel, AuthSessionModel } from '../modules/auth/model';
import { resolveRolePermissions } from '../modules/auth/service';
import { DepartmentModel } from '../modules/department/model';
import { EmployeeActivityModel, EmployeeModel } from '../modules/employee/model';
import { AttendanceRecordModel, ShiftModel } from '../modules/attendance/model';
import { LeaveBalanceModel, LeavePolicyModel, LeaveRequestModel } from '../modules/leave/model';
import { PayrollRecordModel, PayrollRunModel } from '../modules/payroll/model';
import { computePayroll } from '../common/utils/tax';
import { ReviewCycleModel, PerformanceReviewModel } from '../modules/performance/model';
import { JobPostModel, ApplicationModel } from '../modules/recruitment/model';
import { NotificationModel } from '../modules/notification/model';
import { AnnouncementModel } from '../modules/announcement/model';
import { PulseSurveyModel, PulseResponseModel } from '../modules/pulse/model';
import { GigModel } from '../modules/gig/model';
import { AuditLogModel } from '../modules/analytics/model';
import { ProjectModel } from '../modules/project/model';

const departments = [
  { name: 'Engineering', code: 'ENG' },
  { name: 'Design', code: 'DSN' },
  { name: 'QA', code: 'QAT' },
  { name: 'DevOps', code: 'DOP' },
  { name: 'Marketing', code: 'MKT' },
  { name: 'HR', code: 'HRS' },
];

const pakistaniFirstNames = [
  'Ahsan',
  'Aiman',
  'Ali',
  'Areeba',
  'Bilal',
  'Dania',
  'Farhan',
  'Fatima',
  'Hamza',
  'Hina',
  'Hira',
  'Hussain',
  'Ibrahim',
  'Kashif',
  'Maham',
  'Maryam',
  'Muneeb',
  'Nimra',
  'Rida',
  'Saad',
  'Saba',
  'Sarah',
  'Talha',
  'Usman',
  'Zain',
  'Zara',
  'Zeeshan',
];

const pakistaniLastNames = [
  'Ahmed',
  'Akram',
  'Ali',
  'Anwar',
  'Aslam',
  'Aziz',
  'Butt',
  'Chaudhry',
  'Farooq',
  'Hussain',
  'Iqbal',
  'Javed',
  'Khan',
  'Malik',
  'Nawaz',
  'Qureshi',
  'Rafiq',
  'Raza',
  'Saeed',
  'Shah',
  'Sheikh',
  'Tariq',
  'Yousaf',
  'Zafar',
];

const pakistaniCities = ['Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Faisalabad', 'Multan'];

const emergencyRelations = ['Brother', 'Sister', 'Mother', 'Father', 'Spouse'];

const departmentDesignations: Record<string, string[]> = {
  Engineering: ['MERN Stack Engineer', 'Backend Engineer', 'Frontend Engineer', 'Tech Lead'],
  Design: ['Product Designer', 'UI/UX Designer', 'Visual Designer', 'Brand Designer'],
  QA: ['QA Engineer', 'SQA Analyst', 'Automation Tester', 'Test Lead'],
  DevOps: ['DevOps Engineer', 'Cloud Engineer', 'Platform Engineer', 'Site Reliability Engineer'],
  Marketing: ['Digital Marketing Executive', 'Content Strategist', 'SEO Specialist', 'Growth Marketer'],
  HR: ['HR Executive', 'People Operations Specialist', 'Talent Acquisition Specialist', 'HR Business Partner'],
};

const namedSeedProfiles = {
  superAdmin: {
    firstName: 'Zia',
    lastName: 'Aslam',
    email: 'zia.aslam@metalabstech.com',
    designation: 'Chief Executive Officer',
    country: 'Pakistan' as const,
  },
  admin: {
    firstName: 'Ayesha',
    lastName: 'Khan',
    email: 'hr.portal@metalabstech.com',
    designation: 'Head of HR',
    country: 'Pakistan' as const,
  },
  manager: {
    firstName: 'Usman',
    lastName: 'Malik',
    email: 'manager.portal@metalabstech.com',
    designation: 'Delivery Manager',
    country: 'Pakistan' as const,
  },
  employee: {
    firstName: 'Aiman',
    lastName: 'Anwar',
    email: 'employee.portal@metalabstech.com',
    designation: 'MERN Stack Engineer',
    country: 'Pakistan' as const,
  },
  recruiter: {
    firstName: 'Sarah',
    lastName: 'Qureshi',
    email: 'recruiter.portal@metalabstech.com',
    designation: 'Talent Acquisition Specialist',
    country: 'Pakistan' as const,
  },
};

const defaultLeavePolicies = [
  { leaveType: 'casual', annualAllowance: 10, carryForward: true, maxCarryForwardDays: 5 },
  { leaveType: 'sick', annualAllowance: 8, carryForward: false, maxCarryForwardDays: 0 },
  { leaveType: 'annual', annualAllowance: 14, carryForward: true, maxCarryForwardDays: 7 },
  { leaveType: 'unpaid', annualAllowance: 0, carryForward: false, maxCarryForwardDays: 0 },
  { leaveType: 'maternity', annualAllowance: 90, carryForward: false, maxCarryForwardDays: 0 },
  { leaveType: 'paternity', annualAllowance: 30, carryForward: false, maxCarryForwardDays: 0 },
];

const buildPakistaniName = (index: number) => {
  const firstName = pakistaniFirstNames[index % pakistaniFirstNames.length];
  const lastName = pakistaniLastNames[(index * 3) % pakistaniLastNames.length];
  return { firstName, lastName };
};

const buildLocalPhoneNumber = (country: 'Pakistan' | 'UAE', index: number) =>
  country === 'UAE'
    ? `+97152${String(6500000 + index).slice(-7)}`
    : `+923${String(100000000 + index).slice(-8)}`;

const clearDatabase = async () => {
  await Promise.all([
    UserModel.deleteMany({}),
    AuthSessionModel.deleteMany({}),
    DepartmentModel.deleteMany({}),
    EmployeeModel.deleteMany({}),
    EmployeeActivityModel.deleteMany({}),
    AttendanceRecordModel.deleteMany({}),
    ShiftModel.deleteMany({}),
    LeavePolicyModel.deleteMany({}),
    LeaveBalanceModel.deleteMany({}),
    LeaveRequestModel.deleteMany({}),
    PayrollRunModel.deleteMany({}),
    PayrollRecordModel.deleteMany({}),
    ReviewCycleModel.deleteMany({}),
    PerformanceReviewModel.deleteMany({}),
    JobPostModel.deleteMany({}),
    ApplicationModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    AnnouncementModel.deleteMany({}),
    PulseSurveyModel.deleteMany({}),
    PulseResponseModel.deleteMany({}),
    GigModel.deleteMany({}),
    ProjectModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
  ]);
};

const syncCollections = async () => {
  await Promise.all([
    UserModel.syncIndexes(),
    DepartmentModel.syncIndexes(),
    EmployeeModel.syncIndexes(),
    EmployeeActivityModel.syncIndexes(),
    ShiftModel.syncIndexes(),
    AttendanceRecordModel.syncIndexes(),
    LeavePolicyModel.syncIndexes(),
    LeaveBalanceModel.syncIndexes(),
    LeaveRequestModel.syncIndexes(),
    PayrollRunModel.syncIndexes(),
    PayrollRecordModel.syncIndexes(),
    ReviewCycleModel.syncIndexes(),
    PerformanceReviewModel.syncIndexes(),
    JobPostModel.syncIndexes(),
    ApplicationModel.syncIndexes(),
    NotificationModel.syncIndexes(),
    AnnouncementModel.syncIndexes(),
    PulseSurveyModel.syncIndexes(),
    PulseResponseModel.syncIndexes(),
    GigModel.syncIndexes(),
    ProjectModel.syncIndexes(),
    AuditLogModel.syncIndexes(),
  ]);
};

const createUserAndEmployee = async (
  role: 'superAdmin' | 'admin' | 'manager' | 'employee' | 'recruiter',
  department: { _id: { toString(): string }; name: string },
  index: number,
) => {
  const namedProfile =
    (role === 'superAdmin' && index === 0 && namedSeedProfiles.superAdmin) ||
    (role === 'admin' && index === 1 && namedSeedProfiles.admin) ||
    (role === 'manager' && index === 3 && namedSeedProfiles.manager) ||
    (role === 'employee' && index === 8 && namedSeedProfiles.employee) ||
    (role === 'recruiter' && index === 59 && namedSeedProfiles.recruiter) ||
    null;
  const derivedName = buildPakistaniName(index);
  const firstName = namedProfile?.firstName ?? derivedName.firstName;
  const lastName = namedProfile?.lastName ?? derivedName.lastName;
  const country: 'Pakistan' | 'UAE' =
    namedProfile?.country ??
    (role === 'superAdmin' || role === 'admin'
      ? faker.helpers.arrayElement(['Pakistan', 'UAE'])
      : faker.helpers.arrayElement(['Pakistan', 'Pakistan', 'Pakistan', 'Pakistan', 'UAE']));
  const city = country === 'Pakistan' ? faker.helpers.arrayElement(pakistaniCities) : 'Dubai';
  const email =
    namedProfile?.email ?? `${role}.${firstName}.${lastName}.${index}@nexus.dev`.replace(/\s+/g, '').toLowerCase();

  const user = await UserModel.create({
    email,
    password: await hashPassword('Meta@12345'),
    role,
    permissions: resolveRolePermissions(role),
    isActive: true,
    firstName,
    lastName,
  });

  const employee = await EmployeeModel.create({
    userId: user._id,
    employeeId: `MLT-2026-${String(index + 1).padStart(4, '0')}`,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    email,
    department: department._id.toString(),
    designation:
      namedProfile?.designation ??
      (role === 'superAdmin'
        ? 'Chief Executive Officer'
        : role === 'admin'
          ? faker.helpers.arrayElement(['HR Manager', 'Finance & People Lead'])
          : role === 'manager'
            ? faker.helpers.arrayElement(['Engineering Manager', 'Delivery Manager', 'People Manager'])
            : role === 'recruiter'
              ? 'Talent Acquisition Specialist'
              : faker.helpers.arrayElement(departmentDesignations[department.name] ?? ['Software Engineer'])),
    employmentType: 'full-time',
    joiningDate: faker.date.between({ from: subMonths(new Date(), 18), to: new Date() }),
    salary: {
      basic: country === 'Pakistan' ? faker.number.int({ min: 90000, max: 280000 }) : faker.number.int({ min: 6500, max: 18000 }),
      houseRent: country === 'Pakistan' ? faker.number.int({ min: 12000, max: 65000 }) : faker.number.int({ min: 1000, max: 3000 }),
      medical: country === 'Pakistan' ? faker.number.int({ min: 5000, max: 18000 }) : faker.number.int({ min: 300, max: 1200 }),
      transport: country === 'Pakistan' ? faker.number.int({ min: 5000, max: 18000 }) : faker.number.int({ min: 400, max: 1500 }),
      currency: country === 'UAE' ? 'AED' : 'PKR',
      bonus: country === 'Pakistan' ? faker.number.int({ min: 0, max: 40000 }) : faker.number.int({ min: 0, max: 2500 }),
    },
    emergencyContacts: [
      {
        name: `${buildPakistaniName(index + 200).firstName} ${buildPakistaniName(index + 200).lastName}`,
        relation: faker.helpers.arrayElement(emergencyRelations),
        phone: buildLocalPhoneNumber(country, index + 500),
      },
    ],
    skills: [
      { skill: 'React', level: faker.number.int({ min: 2, max: 5 }), verified: true },
      { skill: 'Communication', level: faker.number.int({ min: 2, max: 5 }), verified: true },
    ],
    timezone: country === 'UAE' ? 'Asia/Dubai' : 'Asia/Karachi',
    workLocation: country === 'UAE' ? faker.helpers.arrayElement(['onsite', 'hybrid']) : faker.helpers.arrayElement(['onsite', 'remote', 'hybrid']),
    country,
    status: 'active',
  });

  await EmployeeActivityModel.create({
    employeeId: employee._id,
    actorId: user._id,
    action: 'employee.created',
    summary: `${employee.displayName} onboarded for ${department.name} in ${city}.`,
    metadata: {
      city,
      country,
      department: department.name,
      portalRole: role,
    },
  });

  return { user, employee };
};

type SeededPerson = Awaited<ReturnType<typeof createUserAndEmployee>>;

const seed = async () => {
  await connectDatabase();
  await clearDatabase();
  await syncCollections();

  await LeavePolicyModel.insertMany(defaultLeavePolicies);
  const createdDepartments = await DepartmentModel.insertMany(departments.map((department) => ({ ...department, status: 'active', isDeleted: false })));
  await ShiftModel.create({
    name: 'General Shift',
    code: 'GEN',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodMinutes: 10,
    workDays: [1, 2, 3, 4, 5],
    overtimeThresholdHours: 8,
    isDefault: true,
  });

  const seededPeople: SeededPerson[] = [];

  seededPeople.push(await createUserAndEmployee('superAdmin', createdDepartments[5], 0));
  for (let index = 0; index < 2; index += 1) {
    seededPeople.push(await createUserAndEmployee('admin', createdDepartments[5], seededPeople.length));
  }
  for (let index = 0; index < 5; index += 1) {
    seededPeople.push(await createUserAndEmployee('manager', createdDepartments[index % createdDepartments.length], seededPeople.length));
  }
  for (let index = 0; index < 50; index += 1) {
    seededPeople.push(await createUserAndEmployee('employee', createdDepartments[index % createdDepartments.length], seededPeople.length));
  }
  for (let index = 0; index < 2; index += 1) {
    seededPeople.push(await createUserAndEmployee('recruiter', createdDepartments[5], seededPeople.length));
  }

  const employees = seededPeople.map((item) => item.employee);
  const engineeringDepartment = createdDepartments.find((item) => item.code === 'ENG')!;
  const managerEmployee = seededPeople.find((item) => item.user.email === namedSeedProfiles.manager.email)!.employee;
  const employeePortalUser = seededPeople.find((item) => item.user.email === namedSeedProfiles.employee.email)!.employee;
  const projectMembers = employees.filter((item) => String(item.department) === String(engineeringDepartment._id)).slice(0, 6);
  const reviewCycle = await ReviewCycleModel.create({
    name: 'FY26 H1 Review',
    startDate: subMonths(new Date(), 3),
    endDate: new Date(),
    ratingScale: [1, 2, 3, 4, 5],
    status: 'active',
  });

  for (const employee of employees) {
    await LeaveBalanceModel.create({
      employeeId: employee._id,
      year: new Date().getFullYear(),
      balances: { casual: 10, sick: 8, annual: 14, unpaid: 0, maternity: 90, paternity: 30 },
      used: { casual: faker.number.int({ min: 0, max: 4 }), sick: faker.number.int({ min: 0, max: 2 }), annual: faker.number.int({ min: 0, max: 5 }), unpaid: 0, maternity: 0, paternity: 0 },
    });

    await PerformanceReviewModel.create({
      employeeId: employee._id,
      cycleId: reviewCycle._id,
      summary: faker.lorem.paragraph(),
      overallRating: faker.number.int({ min: 2, max: 5 }),
      calibrationBand: faker.helpers.arrayElement(['low', 'mid', 'high']),
      status: 'submitted',
    });
  }

  for (let offset = 0; offset < 6; offset += 1) {
    const monthDate = subMonths(new Date(), offset);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const payrollRun = await PayrollRunModel.create({
      month: monthDate.toLocaleString('en-US', { month: 'long' }),
      year: monthDate.getFullYear(),
      status: 'approved',
      processedBy: seededPeople[0].user._id,
      approvedBy: seededPeople[1].user._id,
    });

    for (const employee of employees) {
      const attendanceWeeks = eachWeekOfInterval({ start: monthStart, end: monthEnd });
      for (const weekStart of attendanceWeeks) {
        for (let day = 0; day < 5; day += 1) {
          const date = addDays(weekStart, day);
          if (date < monthStart || date > monthEnd) {
            continue;
          }
          const checkIn = new Date(date);
          checkIn.setHours(9, faker.number.int({ min: 0, max: 20 }), 0, 0);
          const checkOut = new Date(date);
          checkOut.setHours(18, faker.number.int({ min: 0, max: 30 }), 0, 0);
          await AttendanceRecordModel.create({
            employeeId: employee._id,
            date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            checkIn,
            checkOut,
            totalHours: 8 + faker.number.float({ min: 0, max: 2, fractionDigits: 2 }),
            status: checkIn.getMinutes() > 10 ? 'late' : 'present',
          });
        }
      }

      const salary = computePayroll(
        {
          basic: employee.salary.basic,
          houseRent: employee.salary.houseRent,
          medical: employee.salary.medical,
          transport: employee.salary.transport,
          bonus: employee.salary.bonus,
          deductions: 0,
          advances: 0,
          providentFund: employee.country === 'UAE' ? 0 : Math.round(employee.salary.basic * 0.08),
          loanDeduction: 0,
        },
        employee.country === 'UAE' ? 'UAE' : 'Pakistan',
      );

      await PayrollRecordModel.create({
        payrollRunId: payrollRun._id,
        employeeId: employee._id,
        month: payrollRun.month,
        year: payrollRun.year,
        currency: employee.salary.currency,
        country: employee.country,
        salary,
        status: 'approved',
      });
    }
  }

  for (const employee of employees.slice(0, 20)) {
    const leaveType = faker.helpers.arrayElement(['casual', 'sick', 'annual']);
    await LeaveRequestModel.create({
      employeeId: employee._id,
      leaveType,
      startDate: faker.date.recent({ days: 90 }),
      endDate: faker.date.recent({ days: 80 }),
      days: faker.number.int({ min: 1, max: 3 }),
      halfDay: false,
      sandwichApplied: false,
      reason: faker.lorem.sentence(),
      status: faker.helpers.arrayElement(['pendingManager', 'pendingHR', 'approved']),
    });
  }

  const jobPosts = await JobPostModel.insertMany([
    {
      title: 'Senior MERN Engineer',
      slug: 'senior-mern-engineer',
      department: createdDepartments[0]._id,
      location: 'Lahore / Hybrid',
      employmentType: 'Full-time',
      description: faker.lorem.paragraphs(2),
      openings: 2,
      status: 'published',
    },
    {
      title: 'Product Designer',
      slug: 'product-designer',
      department: createdDepartments[1]._id,
      location: 'Remote',
      employmentType: 'Full-time',
      description: faker.lorem.paragraphs(2),
      openings: 1,
      status: 'published',
    },
  ]);

  for (let index = 0; index < 18; index += 1) {
    await ApplicationModel.create({
      jobPostId: jobPosts[index % jobPosts.length]._id,
      name: `${buildPakistaniName(index + 100).firstName} ${buildPakistaniName(index + 100).lastName}`,
      email: `candidate.${buildPakistaniName(index + 100).firstName}.${buildPakistaniName(index + 100).lastName}.${index}@mail.com`
        .replace(/\s+/g, '')
        .toLowerCase(),
      phone: buildLocalPhoneNumber('Pakistan', index + 700),
      coverLetter: faker.lorem.paragraph(),
      stage: faker.helpers.arrayElement(['Applied', 'Screening', 'Interview', 'Assessment', 'Offer']),
      score: faker.number.int({ min: 60, max: 96 }),
    });
  }

  await PulseSurveyModel.create({
    title: 'Weekly team mood',
    questions: ['How energized do you feel this week?', 'How clear are your priorities?', 'How supported do you feel by your team?'],
    active: true,
  });

  await AnnouncementModel.create({
    title: 'Welcome to NEXUS HRMS',
    content: 'The new Meta Labs Tech HR workspace is now live for people operations, engagement, and analytics.',
    authorId: seededPeople[0].user._id,
    audience: 'all',
    published: true,
    publishedAt: new Date(),
  });

  await GigModel.create({
    title: 'Internal AI Copilot Pilot',
    description: 'Join a cross-functional side project to test internal AI workflows across engineering and HR.',
    ownerId: seededPeople[3].employee._id,
    department: createdDepartments[0]._id,
    skillTags: ['AI', 'Node.js', 'Product Thinking'],
    status: 'open',
  });

  await ProjectModel.create({
    name: 'Client Workforce Portal Revamp',
    code: 'MLT-HRMS-01',
    clientName: 'Meta Labs Tech Internal',
    department: engineeringDepartment._id,
    managerId: managerEmployee._id,
    memberIds: projectMembers.map((item) => item._id),
    description: 'Modernize the internal workforce portal for HR, payroll, project delivery, and employee self-service.',
    status: 'active',
    health: 'green',
    progress: 68,
    startDate: subMonths(new Date(), 2),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    updates: [
      {
        employeeId: employeePortalUser._id,
        summary: 'Completed employee dashboard refinements and connected project status updates to the self-service workspace.',
        blockers: '',
        progress: 68,
        projectStatus: 'active',
        submittedAt: new Date(),
      },
    ],
  });

  logger.info('Seed completed successfully');
  logger.info('Super admin credentials: zia.aslam@metalabstech.com / Meta@12345');
  logger.info('HR portal credentials: hr.portal@metalabstech.com / Meta@12345');
  logger.info('Manager portal credentials: manager.portal@metalabstech.com / Meta@12345');
  logger.info('Employee portal credentials: employee.portal@metalabstech.com / Meta@12345');
  logger.info('Recruiter portal credentials: recruiter.portal@metalabstech.com / Meta@12345');
  process.exit(0);
};

void seed().catch((error) => {
  logger.error(error.stack || error.message);
  process.exit(1);
});
