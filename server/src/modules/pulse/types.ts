import type { Types } from 'mongoose';

export interface IPulseSurvey {
  title: string;
  questions: string[];
  active: boolean;
}
