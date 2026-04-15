import type { Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import type { AuthenticatedRequest } from '../../common/types/http';
import { ProjectService } from './service';

export const listProjects = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const projects = await ProjectService.list(req.user!);
  res.json(sendSuccess('Projects fetched successfully', projects));
});

export const createProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const project = await ProjectService.create(req.body);
  res.status(201).json(sendSuccess('Project created successfully', project));
});

export const updateProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const project = await ProjectService.update(String(req.params.id), req.body);
  res.json(sendSuccess('Project updated successfully', project));
});

export const deleteProject = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const project = await ProjectService.remove(String(req.params.id));
  res.json(sendSuccess('Project deleted successfully', project));
});

export const addProjectUpdate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const project = await ProjectService.addUpdate(String(req.params.id), req.user!, req.body);
  res.json(sendSuccess('Project status updated successfully', project));
});
