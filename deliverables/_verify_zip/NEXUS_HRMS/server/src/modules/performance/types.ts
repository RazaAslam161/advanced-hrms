import type { Types } from 'mongoose';

export interface IReviewCycle {
  name: string;
  startDate: Date;
  endDate: Date;
  ratingScale: number[];
  status: 'draft' | 'active' | 'completed';
}
