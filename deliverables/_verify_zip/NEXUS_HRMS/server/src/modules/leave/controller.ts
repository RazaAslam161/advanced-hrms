import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import type { AuthenticatedRequest } from '../../common/types/http';
import { LeaveService } from './service';

export const listPolicies = asyncHandler(async (_req: Request, res: Response) => {
  const policies = await LeaveService.policies();
  res.json(sendSuccess('Leave policies fetched successfully', policies));
});

export const getBalances = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const balances = await LeaveService.balancesForUser(req.user!.userId);
  res.json(sendSuccess('Leave balances fetched successfully', balances));
});

export const applyLeave = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const request = await LeaveService.apply(req.user!, req.body);
  res.status(201).json(sendSuccess('Leave request submitted successfully', request));
});

export const listLeaves = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const records = await LeaveService.list(req.query as Record<string, string>, req.user);
  res.json(sendSuccess('Leave requests fetched successfully', records));
});

export const approveLeave = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const record = await LeaveService.approve(String(req.params.id), req.user!, req.body);
  res.json(sendSuccess('Leave request updated successfully', record));
});

export const leaveCalendar = asyncHandler(async (req: Request, res: Response) => {
  const calendar = await LeaveService.calendar(req.query as Record<string, string>);
  res.json(sendSuccess('Leave calendar fetched successfully', calendar));
});

export const leaveAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const analytics = await LeaveService.analytics();
  res.json(sendSuccess('Leave analytics fetched successfully', analytics));
});
