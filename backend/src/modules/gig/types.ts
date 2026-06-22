import type { Types } from 'mongoose';

export interface IGig {
  title: string;
  description: string;
  department?: Types.ObjectId;
  ownerId: Types.ObjectId;
  skillTags: string[];
  status: 'open' | 'inProgress' | 'completed' | 'closed';
}
