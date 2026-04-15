import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import type { StorageTarget } from '../../config/s3';
import { env } from '../../config/env';
import { getStorageProvider } from '../../config/s3';

export const persistUpload = async (
  file: Express.Multer.File,
  directory: string,
  optimizeImage = false,
): Promise<StorageTarget> => {
  const uploadRoot = path.resolve(env.UPLOAD_DIR, directory);
  await fs.mkdir(uploadRoot, { recursive: true });

  const extension = path.extname(file.originalname) || '.bin';
  const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '-').toLowerCase()}`;
  const fullPath = path.resolve(uploadRoot, filename);

  if (optimizeImage && file.mimetype.startsWith('image/')) {
    await sharp(file.buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).toFile(fullPath);
  } else {
    await fs.writeFile(fullPath, file.buffer);
  }

  return {
    key: `${directory}/${filename}`,
    url: `/uploads/${directory}/${filename}`,
    provider: getStorageProvider(),
  };
};
