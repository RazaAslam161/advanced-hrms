import fs from 'fs/promises';
import { persistBuffer, resolveStoredAssetPath } from './storage';

describe('storage hardening', () => {
  const createdAssets: string[] = [];

  afterEach(async () => {
    await Promise.all(
      createdAssets.splice(0).map(async (key) => {
        await fs.rm(resolveStoredAssetPath(key), { force: true });
      }),
    );
  });

  it('stores public avatars under the public uploads path', async () => {
    const asset = await persistBuffer(
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2uoAAAAASUVORK5CYII=', 'base64'),
      'avatar.png',
      'image/png',
      'avatars',
      true,
    );

    createdAssets.push(asset.key);
    expect(asset.url).toMatch(/^\/uploads\/public\/avatars\//);
  });

  it('rejects files whose content does not match the declared mime type', async () => {
    await expect(
      persistBuffer(Buffer.from('<html>bad</html>'), 'resume.pdf', 'application/pdf', 'resumes'),
    ).rejects.toMatchObject({
      message: 'File contents do not match the declared file type',
    });
  });
});
