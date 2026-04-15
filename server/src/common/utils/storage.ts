import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import type { StorageTarget } from '../../config/s3';
import { env } from '../../config/env';
import { getStorageProvider } from '../../config/s3';
import { AppError } from './appError';

const privateDirectories = new Set(['documents', 'resumes', 'imports']);

type DetectedFileType =
  | { extension: '.jpg'; category: 'image' }
  | { extension: '.png'; category: 'image' }
  | { extension: '.webp'; category: 'image' }
  | { extension: '.pdf'; category: 'pdf' }
  | { extension: '.xlsx' | '.docx'; category: 'zip-office' }
  | { extension: '.doc'; category: 'ole-office' };

const startsWithBytes = (buffer: Buffer, bytes: number[]) => bytes.every((value, index) => buffer[index] === value);

const detectFileType = (buffer: Buffer, originalname: string, mimetype: string): DetectedFileType | null => {
  const extension = path.extname(originalname).toLowerCase();

  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) {
    return mimetype === 'image/jpeg' ? { extension: '.jpg', category: 'image' } : null;
  }

  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47])) {
    return mimetype === 'image/png' ? { extension: '.png', category: 'image' } : null;
  }

  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return mimetype === 'image/webp' ? { extension: '.webp', category: 'image' } : null;
  }

  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return mimetype === 'application/pdf' ? { extension: '.pdf', category: 'pdf' } : null;
  }

  if (startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04]) || startsWithBytes(buffer, [0x50, 0x4b, 0x05, 0x06])) {
    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
      extension === '.xlsx'
    ) {
      return { extension: '.xlsx', category: 'zip-office' };
    }

    if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
      extension === '.docx'
    ) {
      return { extension: '.docx', category: 'zip-office' };
    }

    return null;
  }

  if (startsWithBytes(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return mimetype === 'application/msword' && extension === '.doc' ? { extension: '.doc', category: 'ole-office' } : null;
  }

  return null;
};

const resolveAssetVisibility = (directory: string): 'public' | 'private' =>
  privateDirectories.has(directory) ? 'private' : 'public';

const buildAssetUrl = (key: string, visibility: 'public' | 'private') =>
  visibility === 'public' ? `/uploads/${key}` : `/api/v1/assets/${key}`;

export const resolveStoredAssetPath = (key: string): string => path.resolve(env.UPLOAD_DIR, key);

export const persistBuffer = async (
  buffer: Buffer,
  originalname: string,
  mimetype: string,
  directory: string,
  optimizeImage = false,
): Promise<StorageTarget> => {
  const detectedType = detectFileType(buffer, originalname, mimetype);
  if (!detectedType) {
    throw new AppError('File contents do not match the declared file type', 400);
  }

  const visibility = resolveAssetVisibility(directory);
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${detectedType.extension}`;
  const key = `${visibility}/${directory}/${filename}`;
  const fullPath = resolveStoredAssetPath(key);

  await fs.mkdir(path.dirname(fullPath), { recursive: true });

  if (optimizeImage && detectedType.category === 'image') {
    await sharp(buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).toFile(fullPath);
  } else {
    await fs.writeFile(fullPath, buffer);
  }

  return {
    key,
    url: buildAssetUrl(key, visibility),
    provider: getStorageProvider(),
  };
};

export const persistUpload = async (
  file: Express.Multer.File,
  directory: string,
  optimizeImage = false,
): Promise<StorageTarget> => {
  return persistBuffer(file.buffer, file.originalname, file.mimetype, directory, optimizeImage);
};
