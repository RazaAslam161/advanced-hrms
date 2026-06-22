import crypto from 'crypto';
import { hashPassword } from '../../common/utils/password';
import type { Role } from '../../common/constants/roles';
import type { IntegrationHarness } from './harness';

interface UserFactoryInput {
  role?: Role;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  permissions?: string[];
  department?: string;
  designation?: string;
}

interface DepartmentFactoryInput {
  name?: string;
  code?: string;
  status?: 'active' | 'inactive';
}

interface EmployeeFactoryInput {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  departmentId?: string;
  designation?: string;
}

const sequence = () => crypto.randomUUID().slice(0, 8);

export const createDepartment = async (ctx: IntegrationHarness, input: DepartmentFactoryInput = {}) => {
  const suffix = sequence().toUpperCase();
  return ctx.modules.DepartmentModel.create({
    name: input.name ?? `Department ${suffix}`,
    code: input.code ?? `D${suffix.slice(0, 4)}`,
    status: input.status ?? 'active',
  });
};

export const createUserWithEmployee = async (ctx: IntegrationHarness, input: UserFactoryInput = {}) => {
  const suffix = sequence();
  const email = input.email ?? `user.${suffix}@metalabstech.test`;
  const password = input.password ?? 'Meta@12345';
  const role = input.role ?? 'employee';

  const registration = await ctx.modules.AuthService.register({
    email,
    password,
    role,
    permissions: input.permissions,
    firstName: input.firstName ?? 'Test',
    lastName: input.lastName ?? `User${suffix.slice(0, 4)}`,
    department: input.department,
    designation: input.designation ?? `${role} designation`,
  });

  const user = await ctx.modules.UserModel.findOne({ email }).orFail();
  const employee = await ctx.modules.EmployeeModel.findOne({ userId: user._id }).orFail();

  return {
    user,
    employee,
    password,
    registration,
  };
};

export const createDirectUser = async (ctx: IntegrationHarness, input: UserFactoryInput = {}) => {
  const suffix = sequence();
  const password = input.password ?? 'Meta@12345';
  return ctx.modules.UserModel.create({
    email: input.email ?? `direct.${suffix}@metalabstech.test`,
    password: await hashPassword(password),
    role: input.role ?? 'employee',
    permissions: input.permissions ?? ['notifications.read'],
    firstName: input.firstName ?? 'Direct',
    lastName: input.lastName ?? `User${suffix.slice(0, 4)}`,
    isActive: true,
  });
};

export const createEmployeeAccount = async (ctx: IntegrationHarness, input: EmployeeFactoryInput = {}) => {
  return createUserWithEmployee(ctx, {
    role: input.role ?? 'employee',
    email: input.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
    department: input.departmentId,
    designation: input.designation ?? 'Software Engineer',
  });
};
