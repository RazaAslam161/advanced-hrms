import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import type { AuthenticatedRequest } from '../../common/types/http';
import { PulseService } from './service';

export const createSurvey = asyncHandler(async (req: Request, res: Response) => {
  const survey = await PulseService.createSurvey(req.body);
  res.status(201).json(sendSuccess('Pulse survey created successfully', survey));
});

export const listSurveys = asyncHandler(async (_req: Request, res: Response) => {
  const surveys = await PulseService.listSurveys();
  res.json(sendSuccess('Pulse surveys fetched successfully', surveys));
});

export const submitPulseResponse = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const response = await PulseService.respond(req.user!.userId, req.body);
  res.status(201).json(sendSuccess('Pulse response submitted successfully', response));
});

export const pulseAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const analytics = await PulseService.analytics();
  res.json(sendSuccess('Pulse analytics fetched successfully', analytics));
});

export const createRecognition = asyncHandler(async (req: Request, res: Response) => {
  const recognition = await PulseService.createRecognition(req.body);
  res.status(201).json(sendSuccess('Recognition shared successfully', recognition));
});

export const listRecognition = asyncHandler(async (_req: Request, res: Response) => {
  const items = await PulseService.listRecognition();
  res.json(sendSuccess('Recognition feed fetched successfully', items));
});
