import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import type { AuthenticatedRequest } from '../../common/types/http';
import { AnnouncementService } from './service';

export const listAnnouncements = asyncHandler(async (_req: Request, res: Response) => {
  const announcements = await AnnouncementService.list();
  res.json(sendSuccess('Announcements fetched successfully', announcements));
});

export const listAnnouncementsAdmin = asyncHandler(async (_req: Request, res: Response) => {
  const announcements = await AnnouncementService.adminList();
  res.json(sendSuccess('All announcements fetched successfully', announcements));
});

export const createAnnouncement = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const announcement = await AnnouncementService.create(req.user!.userId, req.body);
  res.status(201).json(sendSuccess('Announcement created successfully', announcement));
});

export const updateAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const announcement = await AnnouncementService.update(String(req.params.id), req.body);
  res.json(sendSuccess('Announcement updated successfully', announcement));
});

export const markAnnouncementRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const announcement = await AnnouncementService.markRead(String(req.params.id), req.user!.userId);
  res.json(sendSuccess('Announcement marked as read', announcement));
});
