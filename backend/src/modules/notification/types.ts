import type { Types } from 'mongoose';

export interface INotification {
  userId?: Types.ObjectId;
  title: string;
  message: string;
  type: 'leave' | 'payroll' | 'review' | 'announcement' | 'system';
  channels: Array<'in-app' | 'email'>;
  read: boolean;
}
