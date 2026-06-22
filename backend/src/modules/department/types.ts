import type { Types } from 'mongoose';

export interface IDepartment {
  name: string;
  code: string;
  description?: string;
  head?: Types.ObjectId;
  parentDepartment?: Types.ObjectId;
  status: 'active' | 'inactive';
  isDeleted: boolean;
  deletedAt?: Date;
}
