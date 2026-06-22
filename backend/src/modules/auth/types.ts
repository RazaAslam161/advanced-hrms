import type { InferSchemaType, Types } from 'mongoose';
import type { Role } from '../../common/constants/roles';

export interface IUser {
  email: string;
  password: string;
  role: Role;
  permissions: string[];
  isActive: boolean;
  lastLogin?: Date;
  mfaEnabled: boolean;
  mfaSecret?: string;
  firstName: string;
  lastName: string;
  mustChangePassword: boolean;
  tempPasswordIssuedAt?: Date;
}

export interface IAuthSession {
  userId: Types.ObjectId;
  jti: string;
  tokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByToken?: string;
}

export type UserLean = InferSchemaType<typeof import('./model').userSchema>;
