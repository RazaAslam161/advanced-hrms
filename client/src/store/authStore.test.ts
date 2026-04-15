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

  it('starts with an empty session when localStorage is clean', async () => {
    const { useAuthStore } = await import('./authStore');
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().hydrated).toBe(true);
  });

  it('setSession persists token and user and marks hydrated', async () => {
    const { useAuthStore } = await import('./authStore');
    const user = { _id: 'u1', email: 'alice@example.com', role: 'employee' } as any;
    useAuthStore.getState().setSession('token-abc', user);

    expect(useAuthStore.getState().accessToken).toBe('token-abc');
    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().hydrated).toBe(true);

    const stored = JSON.parse(localStorage.getItem(storageKey)!);
    expect(stored.accessToken).toBe('token-abc');
  });

  it('clearSession removes the token and user from state and localStorage', async () => {
    localStorage.setItem(storageKey, JSON.stringify({ accessToken: 'token-abc', user: { _id: 'u1' } }));
    const { useAuthStore } = await import('./authStore');
    useAuthStore.getState().clearSession();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it('hydrate re-reads the session from localStorage', async () => {
    const { useAuthStore } = await import('./authStore');
    const user = { _id: 'u2', email: 'bob@example.com' } as any;
    localStorage.setItem(storageKey, JSON.stringify({ accessToken: 'new-token', user }));
    useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().accessToken).toBe('new-token');
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('hydrate clears state and localStorage when stored data is malformed', async () => {
    const { useAuthStore } = await import('./authStore');
    localStorage.setItem(storageKey, 'not-json');
    useAuthStore.getState().hydrate();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });
});
