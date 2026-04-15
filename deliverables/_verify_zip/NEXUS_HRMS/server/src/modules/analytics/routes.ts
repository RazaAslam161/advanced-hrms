import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { validate } from '../../common/middleware/validate';
import { analyticsCharts, analyticsDashboard, buildReport, naturalLanguageQuery } from './controller';
import { nlQuerySchema, reportBuilderSchema } from './validators';

const router = Router();

router.use(authenticate);
router.get('/dashboard', authorize(['superAdmin', 'admin', 'manager'], ['analytics.read']), analyticsDashboard);
router.get('/charts', authorize(['superAdmin', 'admin', 'manager'], ['analytics.read']), analyticsCharts);
router.post('/reports', authorize(['superAdmin', 'admin'], ['analytics.reports']), validate({ body: reportBuilderSchema }), buildReport);
router.post('/nl-query', authorize(['superAdmin', 'admin', 'manager'], ['analytics.read']), validate({ body: nlQuerySchema }), naturalLanguageQuery);

export { router as analyticsRouter };
