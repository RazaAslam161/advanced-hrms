import { Schema, model } from 'mongoose';

const departmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, required: true, uppercase: true, unique: true, index: true },
    description: { type: String },
    head: { type: Schema.Types.ObjectId, ref: 'Employee' },
    parentDepartment: { type: Schema.Types.ObjectId, ref: 'Department' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true },
);

export const DepartmentModel = model('Department', departmentSchema);
