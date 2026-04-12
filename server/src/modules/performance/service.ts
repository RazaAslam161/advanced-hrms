import { AppError } from '../../common/utils/appError';
import {
  FeedbackModel,
  KPIConfigModel,
  KeyResultModel,
  ObjectiveModel,
  PIPModel,
  PerformanceReviewModel,
  ReviewCycleModel,
} from './model';

export class PerformanceService {
  static async createCycle(payload: Record<string, unknown>) {
    return ReviewCycleModel.create(payload);
  }

  static async listCycles() {
    return ReviewCycleModel.find().sort({ startDate: -1 }).lean();
  }

  static async createObjective(payload: Record<string, unknown>) {
    return ObjectiveModel.create(payload);
  }

  static async listObjectives(employeeId?: string) {
    const objectives = await ObjectiveModel.find(employeeId ? { employeeId } : {})
      .populate('employeeId', 'employeeId firstName lastName designation')
      .lean();

    const objectiveIds = objectives.map((objective) => objective._id);
    const keyResults = await KeyResultModel.find({ objectiveId: { $in: objectiveIds } }).lean();

    return objectives.map((objective) => ({
      ...objective,
      keyResults: keyResults.filter((keyResult) => keyResult.objectiveId.toString() === objective._id.toString()),
    }));
  }

  static async upsertKpiConfig(employeeId: string, metrics: Array<Record<string, unknown>>) {
    return KPIConfigModel.findOneAndUpdate({ employeeId }, { metrics }, { upsert: true, new: true });
  }

  static async submitFeedback(payload: Record<string, unknown>) {
    return FeedbackModel.create(payload);
  }

  static async createReview(payload: Record<string, unknown>) {
    return PerformanceReviewModel.create(payload);
  }

  static async listReviews(cycleId?: string) {
    return PerformanceReviewModel.find(cycleId ? { cycleId } : {})
      .populate('employeeId', 'employeeId firstName lastName department')
      .populate('cycleId', 'name startDate endDate')
      .lean();
  }

  static async createPip(payload: Record<string, unknown>) {
    return PIPModel.create({
      ...payload,
      startDate: new Date(String(payload.startDate)),
      endDate: new Date(String(payload.endDate)),
    });
  }

  static async listPips() {
    return PIPModel.find().populate('employeeId', 'employeeId firstName lastName designation').lean();
  }

  static async dashboard() {
    const [reviews, feedback, objectives, pips, kpis] = await Promise.all([
      PerformanceReviewModel.find().lean(),
      FeedbackModel.find().lean(),
      ObjectiveModel.find().lean(),
      PIPModel.find().lean(),
      KPIConfigModel.find().lean(),
    ]);

    const bellCurve = { low: 0, mid: 0, high: 0 };
    reviews.forEach((review) => {
      bellCurve[review.calibrationBand] += 1;
    });

    return {
      reviewCount: reviews.length,
      averageRating:
        reviews.length === 0 ? 0 : Number((reviews.reduce((sum, item) => sum + item.overallRating, 0) / reviews.length).toFixed(2)),
      feedbackCount: feedback.length,
      activePips: pips.filter((item) => item.status === 'active').length,
      okrProgress:
        objectives.length === 0 ? 0 : Number((objectives.reduce((sum, item) => sum + item.progress, 0) / objectives.length).toFixed(2)),
      bellCurve,
      configuredKpis: kpis.length,
    };
  }

  static async addKeyResult(objectiveId: string, payload: { title: string; targetValue: number; currentValue?: number; unit?: string }) {
    const objective = await ObjectiveModel.findById(objectiveId);
    if (!objective) {
      throw new AppError('Objective not found', 404);
    }
    return KeyResultModel.create({ objectiveId, ...payload });
  }
}
