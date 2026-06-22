import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { validate } from '../../common/middleware/validate';
import {
  addKeyResult,
  createCycle,
  createObjective,
  deleteCycle,
  createPip,
  createReview,
  listCycles,
  listObjectives,
  listPips,
  listReviews,
  performanceDashboard,
  submitFeedback,
  updateCycle,
  upsertKpiConfig,
} from './controller';
import { feedbackSchema, objectiveSchema, pipSchema, reviewCycleSchema, reviewCycleUpdateSchema, reviewSchema } from './validators';

const router = Router();

router.use(authenticate);
router.get('/dashboard', authorize(['superAdmin', 'admin', 'manager'], ['performance.read']), performanceDashboard);
router.get('/cycles', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['performance.read']), listCycles);
router.post('/cycles', authorize(['superAdmin', 'admin'], ['performance.manage']), validate({ body: reviewCycleSchema }), createCycle);
router.patch('/cycles/:id', authorize(['superAdmin', 'admin'], ['performance.manage']), validate({ body: reviewCycleUpdateSchema }), updateCycle);
router.delete('/cycles/:id', authorize(['superAdmin', 'admin'], ['performance.manage']), deleteCycle);
router.get('/objectives', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['performance.read']), listObjectives);
router.post('/objectives', authorize(['superAdmin', 'admin', 'manager'], ['performance.manage']), validate({ body: objectiveSchema }), createObjective);
router.post('/objectives/:objectiveId/key-results', authorize(['superAdmin', 'admin', 'manager'], ['performance.manage']), addKeyResult);
router.put('/kpis/:employeeId', authorize(['superAdmin', 'admin', 'manager'], ['performance.manage']), upsertKpiConfig);
router.post('/feedback', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['performance.feedback']), validate({ body: feedbackSchema }), submitFeedback);
router.get('/reviews', authorize(['superAdmin', 'admin', 'manager'], ['performance.read']), listReviews);
router.post('/reviews', authorize(['superAdmin', 'admin', 'manager'], ['performance.review']), validate({ body: reviewSchema }), createReview);
router.get('/pips', authorize(['superAdmin', 'admin', 'manager'], ['performance.read']), listPips);
router.post('/pips', authorize(['superAdmin', 'admin', 'manager'], ['performance.manage']), validate({ body: pipSchema }), createPip);

export { router as performanceRouter };
