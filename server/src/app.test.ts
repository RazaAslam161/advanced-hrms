import request from 'supertest';
import { createApp } from './app';

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
});
