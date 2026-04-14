import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import { PerformanceService } from './service';

export const createCycle = asyncHandler(async (req: Request, res: Response) => {
  const cycle = await PerformanceService.createCycle(req.body);
  res.status(201).json(sendSuccess('Review cycle created successfully', cycle));
});

export const listCycles = asyncHandler(async (_req: Request, res: Response) => {
  const cycles = await PerformanceService.listCycles();
  res.json(sendSuccess('Review cycles fetched successfully', cycles));
});

export const updateCycle = asyncHandler(async (req: Request, res: Response) => {
  const cycle = await PerformanceService.updateCycle(String(req.params.id), req.body);
  res.json(sendSuccess('Review cycle updated successfully', cycle));
});

export const deleteCycle = asyncHandler(async (req: Request, res: Response) => {
  const cycle = await PerformanceService.removeCycle(String(req.params.id));
  res.json(sendSuccess('Review cycle deleted successfully', cycle));
});

export const createObjective = asyncHandler(async (req: Request, res: Response) => {
  const objective = await PerformanceService.createObjective(req.body);
  res.status(201).json(sendSuccess('Objective created successfully', objective));
});

export const listObjectives = asyncHandler(async (req: Request, res: Response) => {
  const objectives = await PerformanceService.listObjectives(req.query.employeeId as string | undefined);
  res.json(sendSuccess('Objectives fetched successfully', objectives));
});

export const upsertKpiConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await PerformanceService.upsertKpiConfig(String(req.params.employeeId), req.body.metrics);
  res.json(sendSuccess('KPI configuration saved successfully', config));
});

export const submitFeedback = asyncHandler(async (req: Request, res: Response) => {
  const feedback = await PerformanceService.submitFeedback(req.body);
  res.status(201).json(sendSuccess('Feedback submitted successfully', feedback));
});

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const review = await PerformanceService.createReview(req.body);
  res.status(201).json(sendSuccess('Performance review created successfully', review));
});

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const reviews = await PerformanceService.listReviews(req.query.cycleId as string | undefined);
  res.json(sendSuccess('Performance reviews fetched successfully', reviews));
});

export const createPip = asyncHandler(async (req: Request, res: Response) => {
  const pip = await PerformanceService.createPip(req.body);
  res.status(201).json(sendSuccess('Performance improvement plan created successfully', pip));
});

export const listPips = asyncHandler(async (_req: Request, res: Response) => {
  const pips = await PerformanceService.listPips();
  res.json(sendSuccess('Performance improvement plans fetched successfully', pips));
});

export const performanceDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const dashboard = await PerformanceService.dashboard();
  res.json(sendSuccess('Performance dashboard fetched successfully', dashboard));
});

export const addKeyResult = asyncHandler(async (req: Request, res: Response) => {
  const keyResult = await PerformanceService.addKeyResult(String(req.params.objectiveId), req.body);
  res.status(201).json(sendSuccess('Key result added successfully', keyResult));
});
