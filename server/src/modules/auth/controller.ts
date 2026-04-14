import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import type { AuthenticatedRequest } from '../../common/types/http';
import { AuthService } from './service';

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);
  res.status(201).json(sendSuccess('User registered successfully', result));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.login({
    ...req.body,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
  res.json(sendSuccess('Login successful', { accessToken: result.accessToken, user: result.user }));
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken as string | undefined;
  if (!token) {
    res.status(401).json({ success: false, message: 'Refresh token cookie is missing' });
    return;
  }

  const result = await AuthService.refresh(token);
  res.cookie('refreshToken', result.refreshToken, refreshCookieOptions);
  res.json(sendSuccess('Token refreshed', { accessToken: result.accessToken, user: result.user }));
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken as string | undefined;
  if (token) {
    await AuthService.logout(token);
  }
  res.clearCookie('refreshToken');
  res.json(sendSuccess('Logout successful', { loggedOut: true }));
});

export const setupMfa = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await AuthService.setupMfa(req.user!.userId);
  res.json(sendSuccess('MFA setup initialized', result));
});

export const verifyMfa = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await AuthService.verifyMfa(req.user!.userId, req.body.token);
  res.json(sendSuccess('MFA enabled successfully', result));
});

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await AuthService.changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);
  res.json(sendSuccess('Password updated successfully', result));
});

export const listMySessions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const sessions = await AuthService.listMySessions(req.user!.userId);
  res.json(sendSuccess('Sessions fetched successfully', sessions));
});

export const listMyActivity = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const activity = await AuthService.listMyActivity(req.user!.userId);
  res.json(sendSuccess('Account activity fetched successfully', activity));
});

export const logoutAll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await AuthService.logoutAll(req.user!.userId);
  res.clearCookie('refreshToken');
  res.json(sendSuccess('Logged out from all devices successfully', result));
});

export const listUsers = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const users = await AuthService.listUsers();
  res.json(sendSuccess('Users fetched successfully', users));
});

export const resetPassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await AuthService.resetPassword(String(req.params.id));
  res.json(sendSuccess('Temporary password issued successfully', result));
});

export const updateUserAccess = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await AuthService.updateUserAccess(String(req.params.id), req.body);
  res.json(sendSuccess('User access updated successfully', result));
});

export const transferSuperAdmin = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await AuthService.transferSuperAdmin(req.user!.userId, req.body.currentPassword, req.body.targetUserId);
  res.json(sendSuccess('Super Admin authority transferred successfully', result));
});
