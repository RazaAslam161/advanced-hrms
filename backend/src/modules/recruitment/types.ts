import type { Types } from 'mongoose';

export type PipelineStage = 'Applied' | 'Screening' | 'Interview' | 'Assessment' | 'Offer' | 'Hired' | 'Rejected';

export interface IJobPost {
  title: string;
  slug: string;
  department?: Types.ObjectId;
  location: string;
  employmentType: string;
  description: string;
  openings: number;
  status: 'draft' | 'published' | 'closed';
}
