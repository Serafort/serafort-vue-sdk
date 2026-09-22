import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSerafort } from '../src/plugin.js';
import { createAuthGuard, createPermissionGuard, createRoleGuard } from '../src/router/guards.js';
import { SerafortClient, type UserContext } from '@serafort/core';
import { setActivePinia, createPinia } from 'pinia';
import { useSerafortStore } from '../src/pinia/store.js';

describe('@serafort/vue plugin & composables', () => {
  const mockUser: UserContext = {
    userId: 'usr_vue_456',
    tenantId: 'tenant_enterprise',
    roles: ['admin', 'manager'],
    permissions: ['org:*', 'reports:read'],
  };

  let mockClient: SerafortClient;

  beforeEach(() => {
    mockClient = new SerafortClient({ endpoint: 'https://api.test.serafort.com' });
    vi.spyOn(mockClient.b2b, 'validateToken').mockImplementation(async (token: string) => {
      if (token === 'valid_vue_token') {
        return mockUser;
      }
      throw new Error('Invalid token');
    });
  });

  it('initializes with unauthenticated reactive state', () => {
    const serafort = createSerafort({
      endpoint: 'https://api.test.serafort.com',
      storageType: 'memory',
      autoInitialize: false,
      client: mockClient,
    });

    expect(serafort.isAuthenticated.value).toBe(false);
    expect(serafort.user.value).toBeNull();
    expect(serafort.token.value).toBeNull();
    expect(serafort.roles.value).toEqual([]);
    expect(serafort.permissions.value).toEqual([]);
  });

  it('updates state reactively upon setToken', async () => {
    const serafort = createSerafort({
      endpoint: 'https://api.test.serafort.com',
      storageType: 'memory',
      autoInitialize: false,
      client: mockClient,
    });

    const user = await serafort.setToken('valid_vue_token');

    expect(user.userId).toBe('usr_vue_456');
    expect(serafort.isAuthenticated.value).toBe(true);
    expect(serafort.user.value?.userId).toBe('usr_vue_456');
    expect(serafort.token.value).toBe('valid_vue_token');
    expect(serafort.tenantId.value).toBe('tenant_enterprise');
    expect(serafort.roles.value).toContain('manager');
  });

  it('enforces wildcard permissions and roles', async () => {
    const serafort = createSerafort({
      endpoint: 'https://api.test.serafort.com',
      storageType: 'memory',
      autoInitialize: false,
      client: mockClient,
    });

    await serafort.setToken('valid_vue_token');

    expect(serafort.hasPermission('org:members:invite')).toBe(true);
    expect(serafort.hasPermission('reports:read')).toBe(true);
    expect(serafort.hasPermission('billing:write')).toBe(false);

    expect(serafort.hasRole('admin')).toBe(true);
    expect(serafort.hasRole('guest')).toBe(false);

    expect(serafort.hasTenant('tenant_enterprise')).toBe(true);
    expect(serafort.hasTenant('tenant_other')).toBe(false);
  });

  it('resets state upon logout', async () => {
    const serafort = createSerafort({
      endpoint: 'https://api.test.serafort.com',
      storageType: 'memory',
      autoInitialize: false,
      client: mockClient,
    });

    await serafort.setToken('valid_vue_token');
    expect(serafort.isAuthenticated.value).toBe(true);

    serafort.logout();
    expect(serafort.isAuthenticated.value).toBe(false);
    expect(serafort.user.value).toBeNull();
    expect(serafort.token.value).toBeNull();
  });

  it('Vue Router guards enforce authentication and wildcard permissions', async () => {
    const serafort = createSerafort({
      endpoint: 'https://api.test.serafort.com',
      storageType: 'memory',
      autoInitialize: false,
      client: mockClient,
      loginUrl: '/auth/login',
    });

    const authGuard = createAuthGuard({}, serafort);
    const mockToRoute = { fullPath: '/admin/settings' } as any;

    // Unauthenticated
    const resultUnauth = await authGuard(mockToRoute, {} as any, () => {});
    expect(resultUnauth).toEqual({
      path: '/auth/login',
      query: { returnUrl: '/admin/settings' },
    });

    // Authenticate
    await serafort.setToken('valid_vue_token');

    const resultAuth = await authGuard(mockToRoute, {} as any, () => {});
    expect(resultAuth).toBe(true);

    // Permission guard with wildcard
    const permGuard = createPermissionGuard(['org:billing'], {}, serafort);
    const permResult = await permGuard(mockToRoute, {} as any, () => {});
    expect(permResult).toBe(true);

    // Permission guard missing
    const missingPermGuard = createPermissionGuard(['super:admin'], {}, serafort);
    const missingResult = await missingPermGuard(mockToRoute, {} as any, () => {});
    expect(missingResult).toBe(false);
  });

  it('integrates seamlessly with Pinia store', async () => {
    setActivePinia(createPinia());

    const serafort = createSerafort({
      endpoint: 'https://api.test.serafort.com',
      storageType: 'memory',
      autoInitialize: false,
      client: mockClient,
    });

    const store = useSerafortStore();
    expect(store.isAuthenticated).toBe(false);

    await store.setToken('valid_vue_token', serafort);
    expect(store.isAuthenticated).toBe(true);
    expect(store.user?.userId).toBe('usr_vue_456');
    expect(store.hasPermission('org:create')).toBe(true);

    store.logout(serafort);
    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
  });
});
