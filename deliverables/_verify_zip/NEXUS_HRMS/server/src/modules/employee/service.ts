import path from 'path';
import fs from 'fs/promises';
import { env } from '../../config/env';
import { UserModel } from '../auth/model';
import { hashPassword } from '../../common/utils/password';
import { AppError } from '../../common/utils/appError';
import { paginatedFetch } from '../../common/utils/query';
import { persistUpload } from '../../common/utils/storage';
import { createAuditLog } from '../../common/utils/audit';
import { createWorkbookBuffer, loadWorkbookFromBuffer } from '../../common/utils/excel';
import { generateTemporaryPassword, resolveRolePermissions } from '../auth/service';
import { EmployeeActivityModel, EmployeeModel } from './model';
import type { Role } from '../../common/constants/roles';

const generateEmployeeId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year}-12-31T23:59:59.999Z`);
  const count = await EmployeeModel.countDocuments({ createdAt: { $gte: start, $lte: end } });
  return `MLT-${year}-${String(count + 1).padStart(4, '0')}`;
};

const logActivity = async (employeeId: string, action: string, summary: string, actorId?: string) => {
  await EmployeeActivityModel.create({
    employeeId,
    actorId,
    action,
    summary,
    occurredAt: new Date(),
  });
};

const resolveLocalUploadPath = (assetUrl?: string) => {
  if (!assetUrl?.startsWith('/uploads/')) {
    return null;
  }

  const relativePath = assetUrl.replace('/uploads/', '');
  return path.resolve(env.UPLOAD_DIR, relativePath);
};

const removeStoredAsset = async (assetUrl?: string) => {
  const fullPath = resolveLocalUploadPath(assetUrl);
  if (!fullPath) {
    return;
  }

  try {
    await fs.unlink(fullPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
};

export class EmployeeService {
  static async directory() {
    return EmployeeModel.find({ isDeleted: false, status: { $in: ['active', 'probation'] } })
      .select('employeeId firstName lastName designation department country')
      .populate('department', 'name code')
      .sort({ firstName: 1, lastName: 1 })
      .lean();
  }

  static async getByUserId(userId: string) {
    const employee = await EmployeeModel.findOne({ userId, isDeleted: false })
      .populate('department', 'name code')
      .populate('reportingTo', 'employeeId firstName lastName designation')
      .lean();

    if (!employee) {
      throw new AppError('Employee profile not found', 404);
    }

    return employee;
  }

  static async updateSelf(
    userId: string,
    payload: {
      firstName: string;
      lastName: string;
      displayName?: string;
      email: string;
      phone?: string;
      timezone: string;
      workLocation: string;
      country: string;
      emergencyContacts: Array<{ name: string; relation: string; phone: string }>;
    },
  ) {
    const employee = await EmployeeModel.findOne({ userId, isDeleted: false });
    if (!employee) {
      throw new AppError('Employee profile not found', 404);
    }

    const normalizedEmail = payload.email.toLowerCase();
    const existingUser = await UserModel.findOne({ email: normalizedEmail, _id: { $ne: employee.userId } });
    if (existingUser) {
      throw new AppError('A user with this email already exists', 409);
    }

    employee.firstName = payload.firstName;
    employee.lastName = payload.lastName;
    employee.displayName = payload.displayName;
    employee.email = normalizedEmail;
    employee.phone = payload.phone;
    employee.timezone = payload.timezone;
    employee.workLocation = payload.workLocation as 'onsite' | 'remote' | 'hybrid';
    employee.country = payload.country;
    employee.set('emergencyContacts', payload.emergencyContacts);
    await employee.save();

    await UserModel.updateOne(
      { _id: employee.userId },
      {
        email: normalizedEmail,
        firstName: payload.firstName,
        lastName: payload.lastName,
      },
    );

    await logActivity(employee.id, 'settings.profile.updated', 'Personal profile details updated', userId);
    await createAuditLog({
      actorId: userId,
      module: 'settings',
      action: 'profile.update',
      entityType: 'Employee',
      entityId: employee.id,
    });

    return this.getByUserId(userId);
  }

  static async list(query: {
    page?: string;
    limit?: string;
    search?: string;
    department?: string;
    status?: string;
    type?: string;
  }) {
    const filter = {
      isDeleted: false,
      ...(query.department ? { department: query.department } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { employmentType: query.type } : {}),
      ...(query.search
        ? {
            $or: [
              { firstName: { $regex: query.search, $options: 'i' } },
              { lastName: { $regex: query.search, $options: 'i' } },
              { employeeId: { $regex: query.search, $options: 'i' } },
              { email: { $regex: query.search, $options: 'i' } },
            ],
          }
        : {}),
    };

    return paginatedFetch({
      model: EmployeeModel,
      filter,
      pageInput: query.page,
      limitInput: query.limit,
      populate: [
        { path: 'department', select: 'name code' },
        { path: 'reportingTo', select: 'employeeId firstName lastName designation' },
      ],
    });
  }

  static async getById(id: string) {
    const employee = await EmployeeModel.findOne({ _id: id, isDeleted: false })
      .populate('department', 'name code')
      .populate('reportingTo', 'employeeId firstName lastName designation')
      .populate('userId', 'email role permissions isActive')
      .lean();

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    return employee;
  }

  static async create(payload: Record<string, unknown>, actorId?: string) {
    const existingUser = await UserModel.findOne({ email: String(payload.email).toLowerCase() });
    if (existingUser) {
      throw new AppError('A user with this email already exists', 409);
    }

    const role = (payload.role as Role | undefined) ?? 'employee';
    const permissions = resolveRolePermissions(role, payload.permissions as string[] | undefined);
    const generatedPassword = !payload.password ? generateTemporaryPassword() : undefined;
    const password = String(payload.password ?? generatedPassword);

    const department = typeof payload.department === 'string' && payload.department.trim() ? payload.department : undefined;
    const reportingTo = typeof payload.reportingTo === 'string' && payload.reportingTo.trim() ? payload.reportingTo : undefined;

    const user = await UserModel.create({
      email: String(payload.email).toLowerCase(),
      password: await hashPassword(password),
      role,
      permissions,
      firstName: payload.firstName,
      lastName: payload.lastName,
      mustChangePassword: !payload.password,
      tempPasswordIssuedAt: !payload.password ? new Date() : undefined,
    });

    const employee = await EmployeeModel.create({
      ...payload,
      email: String(payload.email).toLowerCase(),
      department,
      reportingTo,
      userId: user._id,
      employeeId: await generateEmployeeId(),
      joiningDate: new Date(String(payload.joiningDate)),
      probationEndDate: payload.probationEndDate ? new Date(String(payload.probationEndDate)) : undefined,
    });

    await logActivity(employee.id, 'employee.created', 'Employee profile created', actorId);
    await createAuditLog({ actorId, module: 'employee', action: 'create', entityType: 'Employee', entityId: employee.id });
    return {
      employee,
      credentials: {
        email: user.email,
        role: user.role,
        generatedPassword,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  static async update(id: string, payload: Record<string, unknown>, actorId?: string) {
    const department =
      typeof payload.department === 'string' ? (payload.department.trim() ? payload.department : undefined) : payload.department;
    const reportingTo =
      typeof payload.reportingTo === 'string' ? (payload.reportingTo.trim() ? payload.reportingTo : undefined) : payload.reportingTo;

    const employee = await EmployeeModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        ...payload,
        department,
        reportingTo,
        probationEndDate: payload.probationEndDate ? new Date(String(payload.probationEndDate)) : undefined,
      },
      { new: true },
    );

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const userUpdates: Record<string, unknown> = {};
    if (payload.email) {
      userUpdates.email = String(payload.email).toLowerCase();
    }
    if (payload.firstName) {
      userUpdates.firstName = payload.firstName;
    }
    if (payload.lastName) {
      userUpdates.lastName = payload.lastName;
    }
    if (payload.role) {
      const role = payload.role as Role;
      userUpdates.role = role;
      userUpdates.permissions = resolveRolePermissions(role, payload.permissions as string[] | undefined);
    } else if (payload.permissions) {
      userUpdates.permissions = payload.permissions;
    }
    if (payload.status) {
      userUpdates.isActive = payload.status !== 'inactive' && payload.status !== 'terminated';
    }

    if (Object.keys(userUpdates).length > 0) {
      await UserModel.updateOne({ _id: employee.userId }, userUpdates);
    }

    await logActivity(id, 'employee.updated', 'Employee profile updated', actorId);
    await createAuditLog({ actorId, module: 'employee', action: 'update', entityType: 'Employee', entityId: employee.id });
    return employee;
  }

  static async remove(id: string, actorId?: string) {
    const employee = await EmployeeModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date(), status: 'inactive' },
      { new: true },
    );
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    await UserModel.updateOne({ _id: employee.userId }, { isActive: false });
    await logActivity(id, 'employee.deleted', 'Employee profile archived', actorId);
    await createAuditLog({ actorId, module: 'employee', action: 'archive', entityType: 'Employee', entityId: employee.id });
    return employee;
  }

  static async uploadAvatar(id: string, file: Express.Multer.File, actorId?: string) {
    const employee = await EmployeeModel.findOne({ _id: id, isDeleted: false });
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const asset = await persistUpload(file, 'avatars', true);
    employee.avatar = asset.url;
    await employee.save();
    await logActivity(id, 'employee.avatar', 'Avatar updated', actorId);
    return employee;
  }

  static async uploadMyAvatar(userId: string, file: Express.Multer.File) {
    const employee = await EmployeeModel.findOne({ userId, isDeleted: false });
    if (!employee) {
      throw new AppError('Employee profile not found', 404);
    }

    const previousAvatar = employee.avatar;
    const asset = await persistUpload(file, 'avatars', true);
    employee.avatar = asset.url;
    await employee.save();
    await removeStoredAsset(previousAvatar ?? undefined);
    await logActivity(employee.id, 'settings.avatar.updated', 'Profile photo updated', userId);
    await createAuditLog({
      actorId: userId,
      module: 'settings',
      action: 'avatar.update',
      entityType: 'Employee',
      entityId: employee.id,
    });

    return this.getByUserId(userId);
  }

  static async removeMyAvatar(userId: string) {
    const employee = await EmployeeModel.findOne({ userId, isDeleted: false });
    if (!employee) {
      throw new AppError('Employee profile not found', 404);
    }

    const previousAvatar = employee.avatar;
    employee.avatar = undefined;
    await employee.save();
    await removeStoredAsset(previousAvatar ?? undefined);
    await logActivity(employee.id, 'settings.avatar.removed', 'Profile photo removed', userId);
    await createAuditLog({
      actorId: userId,
      module: 'settings',
      action: 'avatar.remove',
      entityType: 'Employee',
      entityId: employee.id,
    });

    return this.getByUserId(userId);
  }

  static async uploadDocument(
    id: string,
    file: Express.Multer.File,
    metadata: { type: string; expiresAt?: string },
    actorId?: string,
  ) {
    const employee = await EmployeeModel.findOne({ _id: id, isDeleted: false });
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    const asset = await persistUpload(file, 'documents', false);
    employee.documents.push({
      type: metadata.type,
      url: asset.url,
      key: asset.key,
      expiresAt: metadata.expiresAt ? new Date(metadata.expiresAt) : undefined,
      uploadedAt: new Date(),
    });
    await employee.save();
    await logActivity(id, 'employee.document', `Document uploaded: ${metadata.type}`, actorId);
    return employee;
  }

  static async timeline(id: string) {
    return EmployeeActivityModel.find({ employeeId: id }).sort({ occurredAt: -1 }).lean();
  }

  static async myTimeline(userId: string) {
    const employee = await EmployeeModel.findOne({ userId, isDeleted: false }).select('_id').lean();
    if (!employee) {
      throw new AppError('Employee profile not found', 404);
    }

    return EmployeeActivityModel.find({ employeeId: employee._id }).sort({ occurredAt: -1 }).limit(20).lean();
  }

  static async bulkImport(file: Express.Multer.File, actorId?: string) {
    const workbook = await loadWorkbookFromBuffer(file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new AppError('Workbook does not contain a worksheet', 400);
    }

    const rows = sheet.getRows(2, sheet.rowCount - 1) ?? [];
    const errors: Array<{ row: number; message: string }> = [];
    let imported = 0;

    for (const row of rows) {
      const payload = {
        firstName: String(row.getCell(1).value ?? '').trim(),
        lastName: String(row.getCell(2).value ?? '').trim(),
        email: String(row.getCell(3).value ?? '').trim(),
        designation: String(row.getCell(4).value ?? '').trim(),
        employmentType: String(row.getCell(5).value ?? 'full-time').trim(),
        joiningDate: new Date(String(row.getCell(6).value ?? new Date())).toISOString(),
        salary: {
          basic: Number(row.getCell(7).value ?? 0),
          houseRent: Number(row.getCell(8).value ?? 0),
          medical: Number(row.getCell(9).value ?? 0),
          transport: Number(row.getCell(10).value ?? 0),
          currency: String(row.getCell(11).value ?? 'PKR').trim(),
          bonus: Number(row.getCell(12).value ?? 0),
        },
        timezone: String(row.getCell(13).value ?? 'Asia/Karachi').trim(),
        workLocation: String(row.getCell(14).value ?? 'onsite').trim(),
        country: String(row.getCell(15).value ?? 'Pakistan').trim(),
        status: 'active',
        emergencyContacts: [],
        skills: [],
        password: 'Meta@12345',
      };

      if (!payload.firstName || !payload.lastName || !payload.email || !payload.designation) {
        errors.push({ row: row.number, message: 'Missing required employee fields' });
        continue;
      }

      try {
        await this.create(payload, actorId);
        imported += 1;
      } catch (error) {
        errors.push({ row: row.number, message: (error as Error).message });
      }
    }

    let errorReportUrl: string | null = null;
    if (errors.length > 0) {
      const report = await createWorkbookBuffer((workbookInstance) => {
        const reportSheet = workbookInstance.addWorksheet('Errors');
        reportSheet.addRow(['Row', 'Message']);
        errors.forEach((entry) => reportSheet.addRow([entry.row, entry.message]));
      });

      const reportsDir = path.resolve(process.cwd(), 'uploads', 'imports');
      await fs.mkdir(reportsDir, { recursive: true });
      const filename = `employee-import-errors-${Date.now()}.xlsx`;
      await fs.writeFile(path.join(reportsDir, filename), report);
      errorReportUrl = `/uploads/imports/${filename}`;
    }

    return { imported, failed: errors.length, errors, errorReportUrl };
  }
}
