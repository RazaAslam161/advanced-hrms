import { AppError } from '../../common/utils/appError';
import type { JwtUserPayload } from '../../common/utils/jwt';
import { EmployeeModel } from '../employee/model';
import { ProjectModel } from './model';

const getEmployeeForUser = async (userId: string) => {
  const employee = await EmployeeModel.findOne({ userId, isDeleted: false }).select('_id employeeId firstName lastName');
  if (!employee) {
    throw new AppError('Employee profile not found', 404);
  }
  return employee;
};

export class ProjectService {
  static async list(user: JwtUserPayload) {
    if (user.role === 'superAdmin' || user.role === 'admin') {
      return ProjectModel.find({ isDeleted: false })
        .populate('department', 'name code')
        .populate('managerId', 'employeeId firstName lastName designation')
        .populate('memberIds', 'employeeId firstName lastName designation')
        .populate('updates.employeeId', 'employeeId firstName lastName designation')
        .sort({ updatedAt: -1 })
        .lean();
    }

    const employee = await getEmployeeForUser(user.userId);

    if (user.role === 'manager') {
      return ProjectModel.find({
        isDeleted: false,
        $or: [{ managerId: employee._id }, { memberIds: employee._id }],
      })
        .populate('department', 'name code')
        .populate('managerId', 'employeeId firstName lastName designation')
        .populate('memberIds', 'employeeId firstName lastName designation')
        .populate('updates.employeeId', 'employeeId firstName lastName designation')
        .sort({ updatedAt: -1 })
        .lean();
    }

    return ProjectModel.find({
      isDeleted: false,
      memberIds: employee._id,
    })
      .populate('department', 'name code')
      .populate('managerId', 'employeeId firstName lastName designation')
      .populate('memberIds', 'employeeId firstName lastName designation')
      .populate('updates.employeeId', 'employeeId firstName lastName designation')
      .sort({ updatedAt: -1 })
      .lean();
  }

  static async create(payload: Record<string, unknown>) {
    const exists = await ProjectModel.findOne({ code: String(payload.code).toUpperCase() });
    if (exists) {
      throw new AppError('A project with this code already exists', 409);
    }

    return ProjectModel.create({
      ...payload,
      code: String(payload.code).toUpperCase(),
      startDate: new Date(String(payload.startDate)),
      endDate: payload.endDate ? new Date(String(payload.endDate)) : undefined,
    });
  }

  static async update(id: string, payload: Record<string, unknown>) {
    const project = await ProjectModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      Object.fromEntries(
        Object.entries({
          ...payload,
          code: payload.code ? String(payload.code).toUpperCase() : undefined,
          startDate: payload.startDate ? new Date(String(payload.startDate)) : undefined,
          endDate: payload.endDate ? new Date(String(payload.endDate)) : undefined,
        }).filter(([, value]) => value !== undefined),
      ),
      { new: true },
    );

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    return ProjectModel.findById(project._id)
      .populate('department', 'name code')
      .populate('managerId', 'employeeId firstName lastName designation')
      .populate('memberIds', 'employeeId firstName lastName designation')
      .populate('updates.employeeId', 'employeeId firstName lastName designation')
      .lean();
  }

  static async remove(id: string) {
    const project = await ProjectModel.findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true });
    if (!project) {
      throw new AppError('Project not found', 404);
    }
    return project;
  }

  static async addUpdate(projectId: string, user: JwtUserPayload, payload: { summary: string; blockers?: string; progress: number; projectStatus: string }) {
    const employee = await getEmployeeForUser(user.userId);
    const project = await ProjectModel.findOne({ _id: projectId, isDeleted: false });
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const allowed =
      user.role === 'superAdmin' ||
      user.role === 'admin' ||
      project.managerId.toString() === employee.id ||
      project.memberIds.some((memberId) => memberId.toString() === employee.id);

    if (!allowed) {
      throw new AppError('You are not assigned to this project', 403);
    }

    project.updates.push({
      employeeId: employee._id,
      summary: payload.summary,
      blockers: payload.blockers,
      progress: payload.progress,
      projectStatus: payload.projectStatus as 'planning' | 'active' | 'onHold' | 'completed',
      submittedAt: new Date(),
    } as never);
    project.progress = payload.progress;
    project.status = payload.projectStatus as 'planning' | 'active' | 'onHold' | 'completed';
    project.health = payload.blockers ? 'amber' : payload.progress >= 85 ? 'green' : project.health;
    await project.save();

    return ProjectModel.findById(projectId)
      .populate('department', 'name code')
      .populate('managerId', 'employeeId firstName lastName designation')
      .populate('memberIds', 'employeeId firstName lastName designation')
      .populate('updates.employeeId', 'employeeId firstName lastName designation')
      .lean();
  }
}
