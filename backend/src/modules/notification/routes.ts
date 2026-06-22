import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { validate } from '../../common/middleware/validate';
import {
  getNotificationPreferences,
  listNotifications,
  markNotification,
  updateNotificationPreferences,
} from './controller';
import { notificationPreferenceSchema, notificationReadSchema } from './validators';

const router = Router();

router.use(authenticate);
router.get('/', authorize(['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], ['notifications.read']), listNotifications);
router.get('/preferences/me', authorize(['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], ['notifications.read']), getNotificationPreferences);
router.put('/preferences/me', authorize(['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], ['notifications.read']), validate({ body: notificationPreferenceSchema }), updateNotificationPreferences);
router.patch('/:id', authorize(['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], ['notifications.read']), validate({ body: notificationReadSchema }), markNotification);

export { router as notificationRouter };
