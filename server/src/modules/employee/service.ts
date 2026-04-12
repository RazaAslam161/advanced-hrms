import path from 'path';
import fs from 'fs/promises';
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
    const employee = await EmployeeModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        ...payload,
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
