import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import type { AuthenticatedRequest } from '../../common/types/http';
import { AttendanceService } from './service';

export const checkIn = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const record = await AttendanceService.checkIn(req.user!.userId, req.body);
  res.json(sendSuccess('Check-in recorded successfully', record));
});

export const checkOut = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const record = await AttendanceService.checkOut(req.user!.userId, req.body);
  res.json(sendSuccess('Check-out recorded successfully', record));
});

export const listAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const records = await AttendanceService.list(req.query as Record<string, string>, req.user);
  res.json(sendSuccess('Attendance records fetched successfully', records));
});

export const attendanceDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const dashboard = await AttendanceService.dashboard(req.user);
  res.json(sendSuccess('Attendance dashboard fetched successfully', dashboard));
});

export const monthlyAttendanceReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const report = await AttendanceService.monthlyReport(String(req.params.employeeId), String(req.query.month ?? ''), req.user);
  res.json(sendSuccess('Monthly attendance report fetched successfully', report));
});

export const createShift = asyncHandler(async (req: Request, res: Response) => {
  const shift = await AttendanceService.createShift(req.body);
  res.status(201).json(sendSuccess('Shift created successfully', shift));
});

export const listShifts = asyncHandler(async (_req: Request, res: Response) => {
  const shifts = await AttendanceService.listShifts();
  res.json(sendSuccess('Shifts fetched successfully', shifts));
});

export const updateShift = asyncHandler(async (req: Request, res: Response) => {
  const shift = await AttendanceService.updateShift(String(req.params.id), req.body);
  res.json(sendSuccess('Shift updated successfully', shift));
});

export const requestOvertime = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const request = await AttendanceService.requestOvertime(req.user!.userId, req.body);
  res.status(201).json(sendSuccess('Overtime request submitted successfully', request));
});

export const approveOvertime = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const request = await AttendanceService.approveOvertime(String(req.params.id), req.user!.userId, req.body.status);
  res.json(sendSuccess('Overtime request updated successfully', request));
});
