import { AppError } from '../../common/utils/appError';
import { EmployeeModel } from '../employee/model';
import { PulseResponseModel, PulseSurveyModel, RecognitionModel } from './model';

const deriveSentimentScore = (ratings: number[]) => {
  if (ratings.length === 0) {
    return 0;
  }
  return Number((((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) - 3) / 2).toFixed(2));
};

export class PulseService {
  static async createSurvey(payload: Record<string, unknown>) {
    return PulseSurveyModel.create(payload);
  }

  static async listSurveys() {
    return PulseSurveyModel.find().sort({ createdAt: -1 }).lean();
  }

  static async respond(userId: string, payload: { surveyId: string; answers: Array<{ question: string; rating: number; comment?: string }> }) {
    const employee = await EmployeeModel.findOne({ userId });
    if (!employee) {
      throw new AppError('Employee profile not found', 404);
    }

    return PulseResponseModel.create({
      surveyId: payload.surveyId,
      employeeId: employee._id,
      answers: payload.answers,
      sentimentScore: deriveSentimentScore(payload.answers.map((item) => item.rating)),
    });
  }

  static async analytics() {
    const responses = await PulseResponseModel.find().lean();
    const averageSentiment =
      responses.length === 0
        ? 0
        : Number((responses.reduce((sum, item) => sum + item.sentimentScore, 0) / responses.length).toFixed(2));

    return {
      totalResponses: responses.length,
      averageSentiment,
      heatmap: responses.map((item) => ({
        surveyId: item.surveyId,
        employeeId: item.employeeId,
        sentimentScore: item.sentimentScore,
      })),
    };
  }

  static async createRecognition(payload: Record<string, unknown>) {
    return RecognitionModel.create(payload);
  }

  static async listRecognition() {
    return RecognitionModel.find()
      .populate('fromEmployeeId', 'employeeId firstName lastName')
      .populate('toEmployeeId', 'employeeId firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }
}
