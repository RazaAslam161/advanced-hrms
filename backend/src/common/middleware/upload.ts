import multer from 'multer';
import { AppError } from '../utils/appError';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowed.includes(file.mimetype)) {
      callback(new AppError('Unsupported file type', 400));
      return;
    }

    callback(null, true);
  },
});

export const singleUpload = (fieldName: string) => upload.single(fieldName);
