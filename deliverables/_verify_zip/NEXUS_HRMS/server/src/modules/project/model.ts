import { Schema, model } from 'mongoose';

const projectUpdateSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    summary: { type: String, required: true },
    blockers: { type: String },
    progress: { type: Number, min: 0, max: 100, required: true },
    projectStatus: {
      type: String,
      enum: ['planning', 'active', 'onHold', 'completed'],
      default: 'active',
    },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, required: true, trim: true, unique: true, index: true },
    clientName: { type: String, required: true, trim: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'Employee', index: true }],
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['planning', 'active', 'onHold', 'completed'],
      default: 'planning',
      index: true,
    },
    health: {
      type: String,
      enum: ['green', 'amber', 'red'],
      default: 'green',
      index: true,
    },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date },
    updates: [projectUpdateSchema],
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

projectSchema.index({ name: 1, clientName: 1 });

export const ProjectModel = model('Project', projectSchema);
