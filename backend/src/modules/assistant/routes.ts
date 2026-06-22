import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { validate } from '../../common/middleware/validate';
import { chatWithAssistant, streamWithAssistant } from './controller';
import { assistantChatSchema } from './validators';

const router = Router();

router.use(authenticate);
router.post(
  '/chat',
  authorize(['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], []),
  validate({ body: assistantChatSchema }),
  chatWithAssistant,
);
router.post(
  '/stream',
  authorize(['superAdmin', 'admin', 'manager', 'employee', 'recruiter'], []),
  validate({ body: assistantChatSchema }),
  streamWithAssistant,
);

export { router as assistantRouter };
