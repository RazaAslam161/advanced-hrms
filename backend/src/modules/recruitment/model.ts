import { Schema, model } from 'mongoose';

const jobPostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    location: { type: String, required: true },
    employmentType: { type: String, required: true },
    description: { type: String, required: true },
    openings: { type: Number, default: 1 },
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'draft', index: true },
  },
  { timestamps: true },
);

const applicationSchema = new Schema(
  {
    jobPostId: { type: Schema.Types.ObjectId, ref: 'JobPost', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, index: true },
    phone: { type: String },
    resumeUrl: { type: String },
    resumeKey: { type: String },
    coverLetter: { type: String },
    stage: {
      type: String,
      enum: ['Applied', 'Screening', 'Interview', 'Assessment', 'Offer', 'Hired', 'Rejected'],
      default: 'Applied',
      index: true,
    },
    score: { type: Number, default: 0 },
    source: { type: String, default: 'careers' },
  },
  { timestamps: true },
);

const interviewSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 60 },
    interviewer: { type: String, required: true },
    meetingLink: { type: String },
    notes: { type: String },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  },
  { timestamps: true },
);

const offerLetterSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    salary: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'sent', 'accepted', 'declined'], default: 'draft', index: true },
  },
  { timestamps: true },
);

const onboardingChecklistSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    items: [{ title: String, completed: Boolean }],
    owner: { type: String, default: 'HR' },
    status: { type: String, enum: ['pending', 'inProgress', 'completed'], default: 'pending' },
  },
  { timestamps: true },
);

export const JobPostModel = model('JobPost', jobPostSchema);
export const ApplicationModel = model('Application', applicationSchema);
export const InterviewModel = model('Interview', interviewSchema);
export const OfferLetterModel = model('OfferLetter', offerLetterSchema);
export const OnboardingChecklistModel = model('OnboardingChecklist', onboardingChecklistSchema);
