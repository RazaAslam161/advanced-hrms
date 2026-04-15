import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { authRateLimiter } from '../../common/middleware/rateLimiter';
import { validate } from '../../common/middleware/validate';
import {
  changePassword,
  listMyActivity,
  listMySessions,
  listUsers,
  login,
  logout,
  logoutAll,
  refresh,
  register,
  resetPassword,
  setupMfa,
  transferSuperAdmin,
  updateUserAccess,
  verifyMfa,
} from './controller';
import { changePasswordSchema, loginSchema, mfaVerifySchema, registerSchema, transferSuperAdminSchema, userAccessSchema } from './validators';

const router = Router();

router.post('/register', authRateLimiter, authenticate, authorize(['superAdmin', 'admin'], ['auth.register']), validate({ body: registerSchema }), register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), login);
router.post('/refresh', authRateLimiter, refresh);
router.post('/logout', logout);
router.post('/mfa/setup', authenticate, setupMfa);
router.post('/mfa/verify', authenticate, validate({ body: mfaVerifySchema }), verifyMfa);
router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), changePassword);
router.get('/me/sessions', authenticate, listMySessions);
router.get('/me/activity', authenticate, listMyActivity);
router.post('/logout-all', authenticate, logoutAll);
router.get('/users', authenticate, authorize(['superAdmin', 'admin'], ['auth.register']), listUsers);
router.post('/users/:id/reset-password', authenticate, authorize(['superAdmin', 'admin'], ['auth.register']), resetPassword);
router.patch('/users/:id', authenticate, authorize(['superAdmin', 'admin'], ['auth.register']), validate({ body: userAccessSchema }), updateUserAccess);
router.post('/transfer-super-admin', authenticate, authorize(['superAdmin'], []), validate({ body: transferSuperAdminSchema }), transferSuperAdmin);

export { router as authRouter };
