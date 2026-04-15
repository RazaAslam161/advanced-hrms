import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { uploadRateLimiter } from '../../common/middleware/rateLimiter';
import { singleUpload } from '../../common/middleware/upload';
import { validate } from '../../common/middleware/validate';
import {
  createJob,
  deleteJob,
  createOffer,
  getJob,
  getOfferPdf,
  getOnboarding,
  listApplications,
  listJobs,
  moveApplication,
  publicCareerDetail,
  publicCareers,
  scheduleInterview,
  submitApplication,
  updateJob,
  updateOnboarding,
} from './controller';
import { applicationSchema, applicationStageSchema, interviewSchema, jobPostSchema, offerSchema } from './validators';

const router = Router();
const publicRouter = Router();

publicRouter.get('/careers', publicCareers);
publicRouter.get('/careers/:slug', publicCareerDetail);
publicRouter.post('/applications', uploadRateLimiter, singleUpload('resume'), validate({ body: applicationSchema }), submitApplication);

router.use(authenticate);
router.get('/jobs', authorize(['superAdmin', 'admin', 'recruiter'], ['recruitment.read']), listJobs);
router.get('/jobs/:id', authorize(['superAdmin', 'admin', 'recruiter'], ['recruitment.read']), getJob);
router.post('/jobs', authorize(['superAdmin', 'admin', 'recruiter'], ['recruitment.manage']), validate({ body: jobPostSchema }), createJob);
router.patch('/jobs/:id', authorize(['superAdmin', 'admin', 'recruiter'], ['recruitment.manage']), validate({ body: jobPostSchema.partial() }), updateJob);
router.delete('/jobs/:id', authorize(['superAdmin', 'admin', 'recruiter'], ['recruitment.manage']), deleteJob);
router.get('/applications', authorize(['superAdmin', 'admin', 'recruiter'], ['recruitment.read']), listApplications);
router.patch('/applications/:id/stage', authorize(['superAdmin', 'admin', 'recruiter'], ['recruitment.pipeline']), validate({ body: applicationStageSchema }), moveApplication);
router.post('/interviews', authorize(['superAdmin', 'admin', 'recruiter'], ['recruitment.manage']), validate({ body: interviewSchema }), scheduleInterview);
router.post('/offers', authorize(['superAdmin', 'admin', 'recruiter'], ['recruitment.manage']), validate({ body: offerSchema }), createOffer);
router.get('/offers/:id/pdf', authorize(['superAdmin', 'admin', 'recruiter'], ['recruitment.read']), getOfferPdf);
router.get('/onboarding/:applicationId', authorize(['superAdmin', 'admin', 'recruiter'], ['recruitment.read']), getOnboarding);
router.put('/onboarding/:applicationId', authorize(['superAdmin', 'admin', 'recruiter'], ['recruitment.manage']), updateOnboarding);

export { router as recruitmentRouter, publicRouter as recruitmentPublicRouter };
