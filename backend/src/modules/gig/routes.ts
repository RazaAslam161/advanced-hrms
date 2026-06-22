import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { validate } from '../../common/middleware/validate';
import { applyToGig, createGig, deleteGig, listGigs, updateGig } from './controller';
import { gigSchema } from './validators';

const router = Router();

router.use(authenticate);
router.get('/', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['gigs.read']), listGigs);
router.post('/', authorize(['superAdmin', 'admin', 'manager'], ['gigs.create']), validate({ body: gigSchema }), createGig);
router.patch('/:id', authorize(['superAdmin', 'admin', 'manager'], ['gigs.manage']), validate({ body: gigSchema.partial() }), updateGig);
router.delete('/:id', authorize(['superAdmin', 'admin', 'manager'], ['gigs.manage']), deleteGig);
router.post('/:id/apply', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['gigs.read']), applyToGig);

export { router as gigRouter };
