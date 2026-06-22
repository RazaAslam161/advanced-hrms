import { Schema, model } from 'mongoose';
import { roles } from '../../common/constants/roles';

export const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: roles, required: true, index: true },
    permissions: [{ type: String, required: true }],
    isActive: { type: Boolean, default: true, index: true },
    lastLogin: { type: Date },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    mustChangePassword: { type: Boolean, default: false },
    tempPasswordIssuedAt: { type: Date },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const authSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jti: { type: String, required: true, unique: true, index: true },
    tokenHash: { type: String, required: true },
    userAgent: { type: String },
    ipAddress: { type: String },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date },
    replacedByToken: { type: String },
  },
  { timestamps: true },
);

authSessionSchema.index({ userId: 1, expiresAt: 1 });

export const UserModel = model('User', userSchema);
export const AuthSessionModel = model('AuthSession', authSessionSchema);
