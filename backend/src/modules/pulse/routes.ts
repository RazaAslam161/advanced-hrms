import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { validate } from '../../common/middleware/validate';
import {
  createRecognition,
  createSurvey,
  listRecognition,
  listSurveys,
  pulseAnalytics,
  submitPulseResponse,
} from './controller';
import { pulseResponseSchema, pulseSurveySchema, recognitionSchema } from './validators';

const router = Router();

router.use(authenticate);
router.get('/surveys', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['pulse.read']), listSurveys);
router.post('/surveys', authorize(['superAdmin', 'admin'], ['pulse.manage']), validate({ body: pulseSurveySchema }), createSurvey);
router.post('/responses', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['pulse.respond']), validate({ body: pulseResponseSchema }), submitPulseResponse);
router.get('/analytics', authorize(['superAdmin', 'admin', 'manager'], ['pulse.read']), pulseAnalytics);
router.get('/recognition', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['pulse.read']), listRecognition);
router.post('/recognition', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['pulse.respond']), validate({ body: recognitionSchema }), createRecognition);

export { router as pulseRouter };
