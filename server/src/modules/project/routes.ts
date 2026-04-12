import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { validate } from '../../common/middleware/validate';
import { addProjectUpdate, createProject, listProjects, updateProject } from './controller';
import { projectSchema, projectUpdateSchema } from './validators';

const router = Router();

router.use(authenticate);
router.get('/', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['projects.read']), listProjects);
router.post('/', authorize(['superAdmin', 'admin', 'manager'], ['projects.create']), validate({ body: projectSchema }), createProject);
router.patch('/:id', authorize(['superAdmin', 'admin', 'manager'], ['projects.update']), validate({ body: projectSchema.partial() }), updateProject);
router.post('/:id/updates', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['projects.status']), validate({ body: projectUpdateSchema }), addProjectUpdate);

export { router as projectRouter };
