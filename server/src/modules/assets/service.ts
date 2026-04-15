import fs from 'fs/promises';
import path from 'path';
import { env } from '../../config/env';
import { AppError } from '../../common/utils/appError';
import type { JwtUserPayload } from '../../common/utils/jwt';
import { EmployeeModel } from '../employee/model';

const privilegedRoles = new Set(['superAdmin', 'admin']);

const normalizeAssetKey = (key: string) => {
  const normalized = path.posix.normalize(key).replace(/^\/+/, '');
  if (!normalized.startsWith('private/') || normalized.includes('..')) {
    throw new AppError('Asset not found', 404);
  }

  return normalized;
};

const canAccessDocument = async (key: string, user: JwtUserPayload) => {
  if (privilegedRoles.has(user.role)) {
    return true;
  }

  const employee = await EmployeeModel.findOne({
    userId: user.userId,
    isDeleted: false,
    'documents.key': key,
  })
    .select('_id')
    .lean();

  return Boolean(employee);
};

export class AssetService {
  static async resolvePrivateAssetPath(key: string, user: JwtUserPayload) {
    const normalizedKey = normalizeAssetKey(key);

    if (normalizedKey.startsWith('private/resumes/')) {
      if (!['superAdmin', 'admin', 'recruiter'].includes(user.role)) {
        throw new AppError('You do not have access to this asset', 403);
      }
    } else if (normalizedKey.startsWith('private/imports/')) {
      if (!privilegedRoles.has(user.role)) {
        throw new AppError('You do not have access to this asset', 403);
      }
    } else if (normalizedKey.startsWith('private/documents/')) {
      if (!(await canAccessDocument(normalizedKey, user))) {
        throw new AppError('You do not have access to this asset', 403);
      }
    } else {
      throw new AppError('Asset not found', 404);
    }

    const absoluteUploadRoot = path.resolve(env.UPLOAD_DIR);
    const absolutePath = path.resolve(absoluteUploadRoot, normalizedKey);
    if (!absolutePath.startsWith(absoluteUploadRoot)) {
      throw new AppError('Asset not found', 404);
    }

    try {
      await fs.access(absolutePath);
    } catch {
      throw new AppError('Asset not found', 404);
    }

    return absolutePath;
  }
}
