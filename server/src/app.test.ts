import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { createApp } from './app';
import { env } from './config/env';

describe('NEXUS API', () => {
  it('returns health payload', async () => {
    const response = await request(createApp()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('uptime');
  });

  it('rejects invalid login payloads before reaching the database', async () => {
    const response = await request(createApp()).post('/api/v1/auth/login').send({
      email: 'bad-email',
      password: '',
    });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
  });

  it('protects secured resources without a bearer token', async () => {
    const response = await request(createApp()).get('/api/v1/departments');
    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Authentication required');
  });

  it('serves uploaded assets with a cross-origin resource policy that allows portal rendering', async () => {
    const relativeAssetPath = path.join('public', 'avatars', 'test-avatar.png');
    const absoluteAssetPath = path.join(env.UPLOAD_DIR, relativeAssetPath);

    await fs.mkdir(path.dirname(absoluteAssetPath), { recursive: true });
    await fs.writeFile(absoluteAssetPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2uoAAAAASUVORK5CYII=', 'base64'));

    try {
      const response = await request(createApp()).get(`/uploads/${relativeAssetPath.replace(/\\/g, '/')}`);
      expect(response.status).toBe(200);
      expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
    } finally {
      await fs.rm(absoluteAssetPath, { force: true });
    }
  });

  it('does not expose private uploads over the public static path', async () => {
    const relativeAssetPath = path.join('private', 'resumes', 'secret.pdf');
    const absoluteAssetPath = path.join(env.UPLOAD_DIR, relativeAssetPath);

    await fs.mkdir(path.dirname(absoluteAssetPath), { recursive: true });
    await fs.writeFile(absoluteAssetPath, Buffer.from('%PDF-1.4'));

    try {
      const response = await request(createApp()).get(`/uploads/${relativeAssetPath.replace(/\\/g, '/')}`);
      expect(response.status).toBe(404);
    } finally {
      await fs.rm(absoluteAssetPath, { force: true });
    }
  });
});
