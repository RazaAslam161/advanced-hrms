import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { validate } from '../../common/middleware/validate';
import { applyLeave, approveLeave, getBalances, leaveAnalytics, leaveCalendar, listLeaves, listPolicies } from './controller';
import { leaveApplySchema, leaveDecisionSchema } from './validators';

const router = Router();

router.use(authenticate);
router.get('/policies', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['leave.read']), listPolicies);
router.get('/balances', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['leave.read']), getBalances);
router.get('/calendar', authorize(['superAdmin', 'admin', 'manager'], ['leave.read']), leaveCalendar);
router.get('/analytics', authorize(['superAdmin', 'admin', 'manager'], ['leave.read']), leaveAnalytics);
router.get('/', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['leave.read']), listLeaves);
router.post('/apply', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['leave.apply']), validate({ body: leaveApplySchema }), applyLeave);
router.patch('/:id/approve', authorize(['superAdmin', 'admin', 'manager'], ['leave.approve']), validate({ body: leaveDecisionSchema }), approveLeave);

export { router as leaveRouter };
