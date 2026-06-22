import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { validate } from '../../common/middleware/validate';
import {
  createDepartment,
  deleteDepartment,
  getOrgChart,
  listDepartments,
  updateDepartment,
} from './controller';
import { departmentBodySchema } from './validators';

const router = Router();

router.use(authenticate);
router.get('/', authorize(['superAdmin', 'admin', 'manager'], ['departments.read']), listDepartments);
router.get('/org-chart', authorize(['superAdmin', 'admin', 'manager'], ['departments.orgchart']), getOrgChart);
router.post('/', authorize(['superAdmin', 'admin'], ['departments.create']), validate({ body: departmentBodySchema }), createDepartment);
router.patch('/:id', authorize(['superAdmin', 'admin'], ['departments.update']), validate({ body: departmentBodySchema.partial() }), updateDepartment);
router.delete('/:id', authorize(['superAdmin', 'admin'], ['departments.delete']), deleteDepartment);

export { router as departmentRouter };
