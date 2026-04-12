import { Schema, model } from 'mongoose';

const gigSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    skillTags: [{ type: String }],
    status: { type: String, enum: ['open', 'inProgress', 'completed', 'closed'], default: 'open', index: true },
    applicants: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
  },
  { timestamps: true },
);

export const GigModel = model('Gig', gigSchema);
