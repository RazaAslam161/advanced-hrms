import { Schema, model } from 'mongoose';

const reviewCycleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    ratingScale: [{ type: Number, default: 1 }],
    status: { type: String, enum: ['draft', 'active', 'completed'], default: 'draft', index: true },
  },
  { timestamps: true },
);

const objectiveSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    progress: { type: Number, default: 0 },
    status: { type: String, enum: ['onTrack', 'atRisk', 'behind', 'complete'], default: 'onTrack' },
  },
  { timestamps: true },
);

const keyResultSchema = new Schema(
  {
    objectiveId: { type: Schema.Types.ObjectId, ref: 'Objective', required: true, index: true },
    title: { type: String, required: true },
    targetValue: { type: Number, required: true },
    currentValue: { type: Number, default: 0 },
    unit: { type: String, default: '%' },
  },
  { timestamps: true },
);

const kpiConfigSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    metrics: [{ key: String, label: String, target: Number, actual: Number, weight: Number }],
    sourceSystem: { type: String, default: 'manual' },
  },
  { timestamps: true },
);

const feedbackSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'ReviewCycle', required: true, index: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    category: { type: String, enum: ['self', 'manager', 'peer', 'skip-level'], required: true },
    anonymous: { type: Boolean, default: false },
    strengths: { type: String, required: true },
    opportunities: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
  },
  { timestamps: true },
);

const performanceReviewSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'ReviewCycle', required: true, index: true },
    summary: { type: String, required: true },
    overallRating: { type: Number, min: 1, max: 5, required: true, index: true },
    calibrationBand: { type: String, enum: ['low', 'mid', 'high'], default: 'mid' },
    status: { type: String, enum: ['draft', 'submitted', 'calibrated'], default: 'draft', index: true },
  },
  { timestamps: true },
);

const pipSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    goals: [{ type: String, required: true }],
    supportActions: [{ type: String, required: true }],
    status: { type: String, enum: ['active', 'completed', 'closed'], default: 'active', index: true },
  },
  { timestamps: true },
);

export const ReviewCycleModel = model('ReviewCycle', reviewCycleSchema);
export const ObjectiveModel = model('Objective', objectiveSchema);
export const KeyResultModel = model('KeyResult', keyResultSchema);
export const KPIConfigModel = model('KPIConfig', kpiConfigSchema);
export const FeedbackModel = model('Feedback', feedbackSchema);
export const PerformanceReviewModel = model('PerformanceReview', performanceReviewSchema);
export const PIPModel = model('PIP', pipSchema);
