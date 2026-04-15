import { AppError } from '../../common/utils/appError';
import { EmployeeModel } from '../employee/model';
import { GigModel } from './model';

export class GigService {
  static async list() {
    return GigModel.find()
      .populate('ownerId', 'employeeId firstName lastName')
      .populate('department', 'name code')
      .populate('applicants', 'employeeId firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  static async create(payload: Record<string, unknown>) {
    return GigModel.create(payload);
  }

  static async update(id: string, payload: Record<string, unknown>) {
    const gig = await GigModel.findByIdAndUpdate(id, payload, { new: true });
    if (!gig) {
      throw new AppError('Gig not found', 404);
    }
    return gig;
  }

  static async remove(id: string) {
    const gig = await GigModel.findByIdAndDelete(id);
    if (!gig) {
      throw new AppError('Gig not found', 404);
    }
    return gig;
  }

  static async apply(gigId: string, userId: string) {
    const employee = await EmployeeModel.findOne({ userId, isDeleted: false });
    if (!employee) {
      throw new AppError('Employee profile not found', 404);
    }

    const gig = await GigModel.findById(gigId);
    if (!gig) {
      throw new AppError('Gig not found', 404);
    }

    if (!gig.applicants.some((applicant) => applicant.toString() === employee.id)) {
      gig.applicants.push(employee._id);
      await gig.save();
    }
    return gig;
  }
}
