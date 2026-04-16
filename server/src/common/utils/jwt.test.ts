import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { createApp } from '../../app';

describe('JWT fallback keys', () => {
  const originalCwd = process.cwd();
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPrivateKey = process.env.JWT_PRIVATE_KEY;
  const originalPublicKey = process.env.JWT_PUBLIC_KEY;
  let tempDirToClean: string | null = null;

  afterEach(() => {
    process.chdir(originalCwd);
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_PRIVATE_KEY = originalPrivateKey;
    process.env.JWT_PUBLIC_KEY = originalPublicKey;
    jest.resetModules();
    if (tempDirToClean) {
      fs.rmSync(tempDirToClean, { recursive: true, force: true });
      tempDirToClean = null;
    }
  });

  it('reuses the local fallback keypair across module reloads in development', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-jwt-'));
    tempDirToClean = tempDir;
    process.chdir(tempDir);
    process.env.NODE_ENV = 'development';
    process.env.JWT_PRIVATE_KEY = '';
    process.env.JWT_PUBLIC_KEY = '';

    jest.resetModules();
    const jwtOne = require('./jwt') as typeof import('./jwt');
    const refreshToken = jwtOne.signRefreshToken({
      userId: 'user-1',
      email: 'zia.aslam@metalabstech.com',
      role: 'superAdmin',
      permissions: ['auth.register'],
      tokenVersion: 0,
      jti: 'refresh-1',
    });

    jest.resetModules();
    const jwtTwo = require('./jwt') as typeof import('./jwt');
    const payload = jwtTwo.verifyRefreshToken(refreshToken);

    expect(payload.userId).toBe('user-1');
    expect(payload.email).toBe('zia.aslam@metalabstech.com');
    expect(fs.existsSync(path.join(tempDir, '.runtime', 'keys', 'jwt-dev-private.pem'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.runtime', 'keys', 'jwt-dev-public.pem'))).toBe(true);
  });

  it('falls back to an in-memory keypair when the runtime key directory cannot be written', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-jwt-ro-'));
    tempDirToClean = tempDir;
    process.chdir(tempDir);
    process.env.NODE_ENV = 'development';
    process.env.JWT_PRIVATE_KEY = '';
    process.env.JWT_PUBLIC_KEY = '';

    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {
      throw Object.assign(new Error('read-only file system'), { code: 'EROFS' });
    });

    jest.resetModules();
    const jwtModule = require('./jwt') as typeof import('./jwt');
    const refreshToken = jwtModule.signRefreshToken({
      userId: 'user-2',
      email: 'audit.safe@metalabstech.com',
      role: 'employee',
      permissions: ['attendance.read'],
      tokenVersion: 1,
      jti: 'refresh-2',
    });
    const payload = jwtModule.verifyRefreshToken(refreshToken);

    expect(payload.userId).toBe('user-2');

    mkdirSpy.mockRestore();
  });
});

describe('auth refresh token error handling', () => {
  it('returns 401 for invalid refresh cookies instead of a server error', async () => {
    const response = await request(createApp())
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refreshToken=invalid.token.value']);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Refresh token is invalid or expired');
  });

  it('treats logout as idempotent when the refresh cookie is invalid', async () => {
    const response = await request(createApp())
      .post('/api/v1/auth/logout')
      .set('Cookie', ['refreshToken=invalid.token.value']);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
