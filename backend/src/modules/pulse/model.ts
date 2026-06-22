import { Schema, model } from 'mongoose';

const pulseSurveySchema = new Schema(
  {
    title: { type: String, required: true },
    questions: [{ type: String, required: true }],
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

const pulseResponseSchema = new Schema(
  {
    surveyId: { type: Schema.Types.ObjectId, ref: 'PulseSurvey', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    answers: [{ question: String, rating: Number, comment: String }],
    sentimentScore: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const recognitionSchema = new Schema(
  {
    fromEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    toEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    message: { type: String, required: true },
    badge: { type: String, required: true },
  },
  { timestamps: true },
);

export const PulseSurveyModel = model('PulseSurvey', pulseSurveySchema);
export const PulseResponseModel = model('PulseResponse', pulseResponseSchema);
export const RecognitionModel = model('Recognition', recognitionSchema);
