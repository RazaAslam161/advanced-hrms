import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import type { AuthenticatedRequest } from '../../common/types/http';
import { EmployeeService } from './service';

export const employeeDirectory = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const directory = await EmployeeService.directory();
  res.json(sendSuccess('Employee directory fetched successfully', directory));
});

export const getMyEmployeeProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const employee = await EmployeeService.getByUserId(req.user!.userId);
  res.json(sendSuccess('Employee profile fetched successfully', employee));
});

export const listEmployees = asyncHandler(async (req: Request, res: Response) => {
  const result = await EmployeeService.list(req.query as Record<string, string>);
  res.json(sendSuccess('Employees fetched successfully', result.items, result.pagination));
});

export const getEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employee = await EmployeeService.getById(String(req.params.id));
  res.json(sendSuccess('Employee fetched successfully', employee));
});

export const createEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const employee = await EmployeeService.create(req.body, req.user?.userId);
  res.status(201).json(sendSuccess('Employee created successfully', employee));
});

export const updateEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const employee = await EmployeeService.update(String(req.params.id), req.body, req.user?.userId);
  res.json(sendSuccess('Employee updated successfully', employee));
});

export const deleteEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const employee = await EmployeeService.remove(String(req.params.id), req.user?.userId);
  res.json(sendSuccess('Employee archived successfully', employee));
});

export const uploadEmployeeAvatar = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const employee = await EmployeeService.uploadAvatar(String(req.params.id), req.file!, req.user?.userId);
  res.json(sendSuccess('Employee avatar uploaded successfully', employee));
});

export const uploadEmployeeDocument = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const employee = await EmployeeService.uploadDocument(String(req.params.id), req.file!, req.body, req.user?.userId);
  res.json(sendSuccess('Employee document uploaded successfully', employee));
});

export const getEmployeeTimeline = asyncHandler(async (req: Request, res: Response) => {
  const timeline = await EmployeeService.timeline(String(req.params.id));
  res.json(sendSuccess('Employee timeline fetched successfully', timeline));
});

export const bulkImportEmployees = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await EmployeeService.bulkImport(req.file!, req.user?.userId);
  res.json(sendSuccess('Employee import processed successfully', result));
});
