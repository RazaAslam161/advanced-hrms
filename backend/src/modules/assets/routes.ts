import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { downloadPrivateAsset } from './controller';

const router = Router();

router.get('/:key(*)', authenticate, downloadPrivateAsset);

export { router as assetsRouter };
