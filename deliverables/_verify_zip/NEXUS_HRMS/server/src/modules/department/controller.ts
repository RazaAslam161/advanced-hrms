import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import { DepartmentService } from './service';

export const listDepartments = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.list(req.query as { search?: string; page?: string; limit?: string });
  res.json(sendSuccess('Departments fetched successfully', result.items, result.pagination));
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await DepartmentService.create(req.body);
  res.status(201).json(sendSuccess('Department created successfully', department));
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await DepartmentService.update(String(req.params.id), req.body);
  res.json(sendSuccess('Department updated successfully', department));
});

export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await DepartmentService.remove(String(req.params.id));
  res.json(sendSuccess('Department archived successfully', department));
});

export const getOrgChart = asyncHandler(async (_req: Request, res: Response) => {
  const chart = await DepartmentService.getOrgChart();
  res.json(sendSuccess('Department org chart fetched successfully', chart));
});
