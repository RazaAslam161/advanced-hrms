import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { addDays } from 'date-fns';
import { v4 as uuid } from 'uuid';
import { AppError } from '../../common/utils/appError';
import { comparePassword, hashPassword } from '../../common/utils/password';
import { allPermissions } from '../../common/constants/permissions';
import { createAuditLog } from '../../common/utils/audit';
import { AuthSessionModel, UserModel } from './model';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../common/utils/jwt';
import type { Role } from '../../common/constants/roles';
import { EmployeeModel } from '../employee/model';
import { AuditLogModel } from '../analytics/model';

export const roleDefaults: Record<Role, string[]> = {
  superAdmin: allPermissions,
  admin: [
    'auth.register',
    'employees.read',
    'employees.create',
    'employees.update',
    'employees.delete',
    'employees.import',
    'departments.read',
    'departments.create',
    'departments.update',
    'departments.delete',
    'attendance.read',
    'attendance.checkin',
    'attendance.checkout',
    'attendance.manage',
    'leave.read',
    'leave.apply',
    'leave.approve',
    'leave.manage',
    'projects.read',
    'projects.create',
    'projects.update',
    'projects.assign',
    'projects.status',
    'payroll.read',
    'payroll.process',
    'payroll.approve',
    'recruitment.read',
    'recruitment.manage',
    'analytics.read',
    'analytics.reports',
    'notifications.read',
    'announcements.publish',
    'announcements.manage',
    'pulse.manage',
    'gigs.read',
    'gigs.create',
    'gigs.manage',
    'performance.manage',
  ],
  manager: [
    'employees.read',
    'departments.read',
    'departments.orgchart',
    'attendance.read',
    'attendance.checkin',
    'attendance.checkout',
    'leave.read',
    'leave.apply',
    'leave.approve',
    'projects.read',
    'projects.create',
    'projects.update',
    'projects.assign',
    'projects.status',
    'payroll.read',
    'performance.read',
    'performance.review',
    'notifications.read',
    'announcements.read',
    'gigs.read',
    'gigs.create',
    'gigs.manage',
  ],
  recruiter: ['recruitment.read', 'recruitment.manage', 'notifications.read', 'announcements.read'],
  employee: [
    'attendance.checkin',
    'attendance.checkout',
    'attendance.read',
    'leave.apply',
    'leave.read',
    'payroll.read',
    'projects.read',
    'projects.status',
    'notifications.read',
    'announcements.read',
    'pulse.respond',
    'gigs.read',
  ],
};

const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');
export const generateTemporaryPassword = (): string => {
  const segment = crypto.randomBytes(4).toString('hex');
  return `Meta${segment.slice(0, 2).toUpperCase()}!${segment.slice(2)}9`;
};

export const resolveRolePermissions = (role: Role, permissions?: string[]) => (permissions?.length ? permissions : roleDefaults[role]);

const isJwtVerificationError = (error: unknown) =>
  error instanceof Error && ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name);

const defaultDesignationByRole: Record<Role, string> = {
  superAdmin: 'Super Admin',
  admin: 'HR Admin',
  manager: 'Team Manager',
  employee: 'Employee',
  recruiter: 'Recruiter',
};

const generateEmployeeId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year}-12-31T23:59:59.999Z`);
  const count = await EmployeeModel.countDocuments({ createdAt: { $gte: start, $lte: end } });
  return `MLT-${year}-${String(count + 1).padStart(4, '0')}`;
};

const ensureEmployeeProfile = async (
  user: {
    _id?: { toString(): string } | string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  },
  input?: {
    department?: string;
    designation?: string;
  },
) => {
  const userId = typeof user._id === 'string' ? user._id : user._id?.toString();
  if (!userId) {
    return;
  }

  const existingEmployee = await EmployeeModel.findOne({ userId });
  if (existingEmployee) {
    return;
  }

  const department = typeof input?.department === 'string' && input.department.trim() ? input.department : undefined;

  await EmployeeModel.create({
    userId,
    employeeId: await generateEmployeeId(),
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    department,
    designation: input?.designation ?? defaultDesignationByRole[user.role],
    employmentType: 'full-time',
    joiningDate: new Date(),
    salary: {
      basic: 0,
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
};

const serializeUser = (user: {
  id?: string;
  _id?: { toString(): string } | string;
  email: string;
  role: Role;
  permissions: string[];
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLogin?: Date | null;
  mustChangePassword: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) => ({
  id: user.id ?? (typeof user._id === 'string' ? user._id : user._id?.toString() ?? ''),
  email: user.email,
  role: user.role,
  permissions: user.permissions,
  firstName: user.firstName,
  lastName: user.lastName,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
  mustChangePassword: user.mustChangePassword,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const serializeSession = (session: {
  id?: string;
  _id?: { toString(): string } | string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt?: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
}) => ({
  id: session.id ?? (typeof session._id === 'string' ? session._id : session._id?.toString() ?? ''),
  userAgent: session.userAgent ?? null,
  ipAddress: session.ipAddress ?? null,
  createdAt: session.createdAt,
  expiresAt: session.expiresAt,
  revokedAt: session.revokedAt ?? null,
  active: !session.revokedAt && session.expiresAt > new Date(),
});

export class AuthService {
  static async register(input: {
    email: string;
    password?: string;
    role: Role;
    permissions?: string[];
    firstName: string;
    lastName: string;
    department?: string;
    designation?: string;
  }) {
    const existing = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      throw new AppError('A user with this email already exists', 409);
    }

    const generatedPassword = !input.password ? generateTemporaryPassword() : undefined;
    const password = input.password ?? generatedPassword!;

    const user = await UserModel.create({
      email: input.email.toLowerCase(),
      password: await hashPassword(password),
      role: input.role,
      permissions: resolveRolePermissions(input.role, input.permissions),
      firstName: input.firstName,
      lastName: input.lastName,
      mustChangePassword: !input.password,
      tempPasswordIssuedAt: !input.password ? new Date() : undefined,
    });

    await ensureEmployeeProfile(user, { department: input.department, designation: input.designation });
    await createAuditLog({
      actorId: user.id,
      module: 'auth',
      action: 'register',
      entityType: 'User',
      entityId: user.id,
    });

    return {
      user: serializeUser(user),
      generatedPassword,
    };
  }

  static async login(input: {
    email: string;
    password: string;
    mfaToken?: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const user = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (!user || !(await comparePassword(input.password, user.password))) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is inactive', 403);
    }

    await ensureEmployeeProfile(user);

    if (user.mfaEnabled) {
      if (!input.mfaToken) {
        throw new AppError('MFA token is required', 401);
      }

      const validMfa = speakeasy.totp.verify({
        secret: user.mfaSecret ?? '',
        encoding: 'base32',
        token: input.mfaToken,
      });

      if (!validMfa) {
        throw new AppError('Invalid MFA token', 401);
      }
    }

    const jti = uuid();
    const refreshToken = signRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      jti,
    });

    await AuthSessionModel.create({
      userId: user._id,
      jti,
      tokenHash: hashToken(refreshToken),
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      expiresAt: addDays(new Date(), 7),
    });

    user.lastLogin = new Date();
    await user.save();
    await createAuditLog({
      actorId: user.id,
      module: 'auth',
      action: 'login',
      entityType: 'User',
      entityId: user.id,
      metadata: {
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    return {
      accessToken: signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      }),
      refreshToken,
      user: { ...serializeUser(user), mfaEnabled: user.mfaEnabled },
    };
  }

  static async refresh(token: string) {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (error) {
      if (isJwtVerificationError(error)) {
        throw new AppError('Refresh token is invalid or expired', 401);
      }
      throw error;
    }

    const session = await AuthSessionModel.findOne({ jti: payload.jti, revokedAt: { $exists: false } });
    if (!session || session.tokenHash !== hashToken(token)) {
      throw new AppError('Refresh session is invalid', 401);
    }

    const user = await UserModel.findById(payload.userId);
    if (!user) {
      throw new AppError('User no longer exists', 404);
    }

    session.revokedAt = new Date();
    const newJti = uuid();
    const refreshToken = signRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      jti: newJti,
    });
    session.replacedByToken = newJti;
    await session.save();

    await AuthSessionModel.create({
      userId: user._id,
      jti: newJti,
      tokenHash: hashToken(refreshToken),
      expiresAt: addDays(new Date(), 7),
    });

    return {
      accessToken: signAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      }),
      refreshToken,
      user: { ...serializeUser(user), mfaEnabled: user.mfaEnabled },
    };
  }

  static async logout(token: string): Promise<void> {
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (error) {
      if (isJwtVerificationError(error)) {
        return;
      }
      throw error;
    }

    await AuthSessionModel.updateOne({ jti: payload.jti }, { revokedAt: new Date() });
  }

  static async setupMfa(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const secret = speakeasy.generateSecret({
      issuer: 'NEXUS HRMS',
      name: user.email,
    });

    user.mfaSecret = secret.base32;
    user.mfaEnabled = false;
    await user.save();

    return {
      base32: secret.base32,
      otpauthUrl: secret.otpauth_url ?? '',
      qrCode: await QRCode.toDataURL(secret.otpauth_url ?? ''),
    };
  }

  static async verifyMfa(userId: string, token: string) {
    const user = await UserModel.findById(userId);
    if (!user || !user.mfaSecret) {
      throw new AppError('MFA setup not found', 404);
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
    });

    if (!verified) {
      throw new AppError('Invalid MFA token', 400);
    }

    user.mfaEnabled = true;
    await user.save();

    return { mfaEnabled: true };
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) {
      throw new AppError('Current password is incorrect', 400);
    }

    user.password = await hashPassword(newPassword);
    user.mustChangePassword = false;
    user.tempPasswordIssuedAt = undefined;
    await user.save();
    await createAuditLog({
      actorId: userId,
      module: 'auth',
      action: 'password.change',
      entityType: 'User',
      entityId: user.id,
    });

    return { updated: true };
  }

  static async listUsers() {
    const users = await UserModel.find()
      .select('email role permissions firstName lastName isActive lastLogin mustChangePassword createdAt updatedAt')
      .sort({ createdAt: -1 });

    return users.map((user) => serializeUser(user));
  }

  static async resetPassword(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const generatedPassword = generateTemporaryPassword();
    user.password = await hashPassword(generatedPassword);
    user.mustChangePassword = true;
    user.tempPasswordIssuedAt = new Date();
    await user.save();
    await createAuditLog({
      actorId: userId,
      module: 'auth',
      action: 'password.reset',
      entityType: 'User',
      entityId: user.id,
    });

    return {
      userId: user.id,
      email: user.email,
      generatedPassword,
    };
  }

  static async updateUserAccess(
    userId: string,
    input: {
      permissions?: string[];
      isActive?: boolean;
    },
  ) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (typeof input.isActive === 'boolean') {
      user.isActive = input.isActive;
      await EmployeeModel.updateOne(
        { userId: user._id },
        {
          status: input.isActive ? 'active' : 'inactive',
        },
      );
    }

    if (input.permissions) {
      user.permissions = Array.from(new Set(input.permissions));
    }

    await user.save();

    return serializeUser(user);
  }

  static async transferSuperAdmin(currentUserId: string, currentPassword: string, targetUserId: string) {
    const [currentUser, targetUser] = await Promise.all([UserModel.findById(currentUserId), UserModel.findById(targetUserId)]);

    if (!currentUser || !targetUser) {
      throw new AppError('User not found', 404);
    }

    if (currentUser.role !== 'superAdmin') {
      throw new AppError('Only the Super Admin can transfer company authority', 403);
    }

    const valid = await comparePassword(currentPassword, currentUser.password);
    if (!valid) {
      throw new AppError('Current password is incorrect', 400);
    }

    currentUser.role = 'admin';
    currentUser.permissions = roleDefaults.admin;

    targetUser.role = 'superAdmin';
    targetUser.permissions = allPermissions;
    targetUser.mustChangePassword = true;
    targetUser.tempPasswordIssuedAt = new Date();

    await Promise.all([currentUser.save(), targetUser.save()]);
    await createAuditLog({
      actorId: currentUserId,
      module: 'auth',
      action: 'super-admin.transfer',
      entityType: 'User',
      entityId: targetUser.id,
      metadata: {
        previousSuperAdmin: currentUser.email,
        newSuperAdmin: targetUser.email,
      },
    });

    return {
      previousSuperAdmin: {
        id: currentUser.id,
        email: currentUser.email,
      },
      newSuperAdmin: {
        id: targetUser.id,
        email: targetUser.email,
      },
    };
  }

  static async listMySessions(userId: string) {
    const sessions = await AuthSessionModel.find({ userId }).sort({ createdAt: -1 }).limit(12).lean();
    return sessions.map((session) => serializeSession(session));
  }

  static async logoutAll(userId: string) {
    await AuthSessionModel.updateMany({ userId, revokedAt: { $exists: false } }, { revokedAt: new Date() });
    await createAuditLog({
      actorId: userId,
      module: 'auth',
      action: 'logout-all',
      entityType: 'User',
      entityId: userId,
    });

    return { loggedOut: true };
  }

  static async listMyActivity(userId: string) {
    return AuditLogModel.find({ actorId: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
  }
}
