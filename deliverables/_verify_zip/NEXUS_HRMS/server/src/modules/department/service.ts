import { AppError } from '../../common/utils/appError';
import { paginatedFetch } from '../../common/utils/query';
import { DepartmentModel } from './model';

export class DepartmentService {
  static async list(query: { search?: string; page?: string; limit?: string }) {
    const filter = {
      isDeleted: false,
      ...(query.search
        ? {
            $or: [
              { name: { $regex: query.search, $options: 'i' } },
              { code: { $regex: query.search, $options: 'i' } },
            ],
          }
        : {}),
    };

    return paginatedFetch({
      model: DepartmentModel,
      filter,
      pageInput: query.page,
      limitInput: query.limit,
      populate: [{ path: 'head', select: 'employeeId firstName lastName' }],
    });
  }

  static async create(payload: Record<string, unknown>) {
    return DepartmentModel.create(payload);
  }

  static async update(id: string, payload: Record<string, unknown>) {
    const department = await DepartmentModel.findOneAndUpdate({ _id: id, isDeleted: false }, payload, { new: true });
    if (!department) {
      throw new AppError('Department not found', 404);
    }
    return department;
  }

  static async remove(id: string) {
    const department = await DepartmentModel.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date(), status: 'inactive' },
      { new: true },
    );
    if (!department) {
      throw new AppError('Department not found', 404);
    }
    return department;
  }

  static async getOrgChart() {
    return DepartmentModel.find({ isDeleted: false })
      .select('name code parentDepartment head status')
      .populate('head', 'employeeId firstName lastName')
      .lean();
  }
}
