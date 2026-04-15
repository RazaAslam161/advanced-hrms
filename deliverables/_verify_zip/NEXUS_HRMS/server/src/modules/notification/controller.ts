import type { Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import type { AuthenticatedRequest } from '../../common/types/http';
import { NotificationService } from './service';

export const listNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const notifications = await NotificationService.list(req.user!.userId);
  const unreadCount = await NotificationService.unreadCount(req.user!.userId);
  res.json(sendSuccess('Notifications fetched successfully', { notifications, unreadCount }));
});

export const markNotification = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const notification = await NotificationService.mark(String(req.params.id), req.body.read);
  res.json(sendSuccess('Notification updated successfully', notification));
});

export const getNotificationPreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const preferences = await NotificationService.getPreferences(req.user!.userId);
  res.json(sendSuccess('Notification preferences fetched successfully', preferences));
});

export const updateNotificationPreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const preferences = await NotificationService.updatePreferences(req.user!.userId, req.body);
  res.json(sendSuccess('Notification preferences updated successfully', preferences));
});
