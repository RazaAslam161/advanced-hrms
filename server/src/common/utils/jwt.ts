import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '../constants/roles';
import { env } from '../../config/env';

let generatedKeyPair: { privateKey: string; publicKey: string } | null = null;

const getKeyPair = (): { privateKey: string; publicKey: string } => {
  if (env.JWT_PRIVATE_KEY && env.JWT_PUBLIC_KEY) {
    return {
      privateKey: env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      publicKey: env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n'),
    };
  }

  if (!generatedKeyPair) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    });
    generatedKeyPair = { privateKey, publicKey };
  }

  return generatedKeyPair;
};

export interface JwtUserPayload {
  userId: string;
  email: string;
  role: Role;
  permissions: string[];
  sessionId?: string;
}

export interface RefreshTokenPayload extends JwtUserPayload {
  jti: string;
}

export const signAccessToken = (payload: JwtUserPayload): string => {
  const { privateKey } = getKeyPair();
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  });
};

export const signRefreshToken = (payload: RefreshTokenPayload): string => {
  const { privateKey } = getKeyPair();
  const { jti, ...tokenPayload } = payload;
  return jwt.sign(tokenPayload, privateKey, {
    algorithm: 'RS256',
    expiresIn: env.REFRESH_TOKEN_TTL as SignOptions['expiresIn'],
    jwtid: jti,
  });
};

export const verifyAccessToken = (token: string): JwtUserPayload => {
  const { publicKey } = getKeyPair();
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as JwtUserPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const { publicKey } = getKeyPair();
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as RefreshTokenPayload;
};
