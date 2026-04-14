import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import type { AuthenticatedRequest } from '../../common/types/http';
import { GigService } from './service';

export const listGigs = asyncHandler(async (_req: Request, res: Response) => {
  const gigs = await GigService.list();
  res.json(sendSuccess('Internal gigs fetched successfully', gigs));
});

export const createGig = asyncHandler(async (req: Request, res: Response) => {
  const gig = await GigService.create(req.body);
  res.status(201).json(sendSuccess('Gig created successfully', gig));
});

export const updateGig = asyncHandler(async (req: Request, res: Response) => {
  const gig = await GigService.update(String(req.params.id), req.body);
  res.json(sendSuccess('Gig updated successfully', gig));
});

export const deleteGig = asyncHandler(async (req: Request, res: Response) => {
  const gig = await GigService.remove(String(req.params.id));
  res.json(sendSuccess('Gig deleted successfully', gig));
});

export const applyToGig = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const gig = await GigService.apply(String(req.params.id), req.user!.userId);
  res.json(sendSuccess('Gig interest recorded successfully', gig));
});
