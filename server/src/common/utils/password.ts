import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const hashPassword = async (plainText: string): Promise<string> => bcrypt.hash(plainText, SALT_ROUNDS);

export const comparePassword = async (plainText: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plainText, hash);
