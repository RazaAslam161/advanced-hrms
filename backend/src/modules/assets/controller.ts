import type { Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import type { AuthenticatedRequest } from '../../common/types/http';
import { AssetService } from './service';

export const downloadPrivateAsset = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const assetPath = await AssetService.resolvePrivateAssetPath(String(req.params.key), req.user!);
  res.sendFile(assetPath);
});
