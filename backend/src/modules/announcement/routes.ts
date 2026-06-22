import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { validate } from '../../common/middleware/validate';
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  listAnnouncementsAdmin,
  markAnnouncementRead,
  updateAnnouncement,
} from './controller';
import { announcementSchema } from './validators';

const router = Router();

router.use(authenticate);
router.get('/', authorize(['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], ['announcements.read']), listAnnouncements);
router.get('/manage', authorize(['superAdmin', 'admin'], ['announcements.manage']), listAnnouncementsAdmin);
router.post('/', authorize(['superAdmin', 'admin'], ['announcements.publish']), validate({ body: announcementSchema }), createAnnouncement);
router.patch('/:id', authorize(['superAdmin', 'admin'], ['announcements.manage']), validate({ body: announcementSchema.partial() }), updateAnnouncement);
router.delete('/:id', authorize(['superAdmin', 'admin'], ['announcements.manage']), deleteAnnouncement);
router.post('/:id/read', authorize(['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], ['announcements.read']), markAnnouncementRead);

export { router as announcementRouter };
