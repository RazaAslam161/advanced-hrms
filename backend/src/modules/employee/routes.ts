import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { uploadRateLimiter } from '../../common/middleware/rateLimiter';
import { singleUpload } from '../../common/middleware/upload';
import { validate } from '../../common/middleware/validate';
import {
  bulkImportEmployees,
  createEmployee,
  employeeDirectory,
  deleteEmployee,
  getEmployee,
  getMyEmployeeActivity,
  getMyEmployeeProfile,
  getEmployeeTimeline,
  listEmployees,
  removeMyEmployeeAvatar,
  updateMyEmployeeProfile,
  updateEmployee,
  uploadMyEmployeeAvatar,
  uploadEmployeeAvatar,
  uploadEmployeeDocument,
} from './controller';
import { employeeBodySchema, employeeDocumentSchema, employeeQuerySchema, employeeSelfProfileSchema } from './validators';

const router = Router();

router.use(authenticate);
router.get('/directory', authorize(['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], []), employeeDirectory);
router.get('/me', authorize(['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], []), getMyEmployeeProfile);
router.patch('/me', authorize(['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], []), validate({ body: employeeSelfProfileSchema }), updateMyEmployeeProfile);
router.get('/me/activity', authorize(['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], []), getMyEmployeeActivity);
router.post('/me/avatar', uploadRateLimiter, authorize(['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], []), singleUpload('file'), uploadMyEmployeeAvatar);
router.delete('/me/avatar', authorize(['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], []), removeMyEmployeeAvatar);
router.post('/bulk-import', uploadRateLimiter, authorize(['superAdmin', 'admin'], ['employees.import']), singleUpload('file'), bulkImportEmployees);
router.get('/', authorize(['superAdmin', 'admin', 'manager'], ['employees.read']), validate({ query: employeeQuerySchema }), listEmployees);
router.get('/:id', authorize(['superAdmin', 'admin', 'manager'], ['employees.read']), getEmployee);
router.get('/:id/timeline', authorize(['superAdmin', 'admin', 'manager'], ['employees.timeline']), getEmployeeTimeline);
router.post('/', authorize(['superAdmin', 'admin'], ['employees.create']), validate({ body: employeeBodySchema }), createEmployee);
router.patch('/:id', authorize(['superAdmin', 'admin'], ['employees.update']), validate({ body: employeeBodySchema.partial() }), updateEmployee);
router.delete('/:id', authorize(['superAdmin', 'admin'], ['employees.delete']), deleteEmployee);
router.post('/:id/avatar', uploadRateLimiter, authorize(['superAdmin', 'admin'], ['employees.upload']), singleUpload('file'), uploadEmployeeAvatar);
router.post('/:id/documents', uploadRateLimiter, authorize(['superAdmin', 'admin'], ['employees.upload']), singleUpload('file'), validate({ body: employeeDocumentSchema }), uploadEmployeeDocument);

export { router as employeeRouter };
