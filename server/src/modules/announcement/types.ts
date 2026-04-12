import type { Types } from 'mongoose';

export interface IAnnouncement {
  title: string;
  content: string;
  authorId: Types.ObjectId;
  audience: 'all' | 'department';
  department?: Types.ObjectId;
  published: boolean;
}
