import { env } from './env';

export interface StorageTarget {
  key: string;
  url: string;
  provider: 'local' | 's3';
}

export const getStorageProvider = (): 'local' | 's3' => env.FILE_STORAGE_DRIVER;
