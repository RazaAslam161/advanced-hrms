describe('authStore', () => {
  const storageKey = 'nexus-auth';

  afterEach(() => {
    localStorage.clear();
    jest.resetModules();
  });

  it('falls back to an empty session when stored auth data is malformed', async () => {
    localStorage.setItem(storageKey, '{invalid-json');

    const { useAuthStore } = await import('./authStore');

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().hydrated).toBe(true);
    expect(localStorage.getItem(storageKey)).toBeNull();
  });
});
