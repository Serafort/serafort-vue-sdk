import {
  ref,
  computed,
  readonly,
  type App,
  type InjectionKey,
  type DirectiveBinding,
} from 'vue';
import { SerafortClient, type UserContext } from '@serafort/core';
import type {
  SerafortVueOptions,
  SerafortState,
  SerafortInstance,
} from './types.js';

export const SERAFORT_INJECTION_KEY: InjectionKey<SerafortInstance> = Symbol('serafort');

let activeInstance: SerafortInstance | null = null;

export function getActiveSerafortInstance(): SerafortInstance | null {
  return activeInstance;
}

export function createSerafort(options: SerafortVueOptions): SerafortInstance {
  const config = {
    tokenStorageKey: '__serafort_token',
    storageType: 'localStorage' as const,
    loginUrl: '/login',
    autoInitialize: true,
    ...options,
  };

  const client =
    config.client ||
    new SerafortClient({
      endpoint: config.endpoint,
    });

  let memoryToken: string | null = null;

  const state = ref<SerafortState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
    error: null,
  });

  const isAuthenticated = computed(() => state.value.isAuthenticated);
  const user = computed(() => state.value.user);
  const token = computed(() => state.value.token);
  const tenantId = computed(() => state.value.user?.tenantId ?? null);
  const roles = computed(() => state.value.user?.roles ?? []);
  const permissions = computed(() => state.value.user?.permissions ?? []);
  const isLoading = computed(() => state.value.isLoading);
  const error = computed(() => state.value.error);

  function readStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    const key = config.tokenStorageKey;
    const type = config.storageType;

    if (type === 'localStorage') {
      return window.localStorage.getItem(key);
    } else if (type === 'sessionStorage') {
      return window.sessionStorage.getItem(key);
    } else {
      return memoryToken;
    }
  }

  function writeStoredToken(tok: string): void {
    const key = config.tokenStorageKey;
    const type = config.storageType;

    if (typeof window !== 'undefined') {
      if (type === 'localStorage') {
        window.localStorage.setItem(key, tok);
      } else if (type === 'sessionStorage') {
        window.sessionStorage.setItem(key, tok);
      }
    }
    memoryToken = tok;
  }

  function clearStoredToken(): void {
    const key = config.tokenStorageKey;
    const type = config.storageType;

    if (typeof window !== 'undefined') {
      if (type === 'localStorage') {
        window.localStorage.removeItem(key);
      } else if (type === 'sessionStorage') {
        window.sessionStorage.removeItem(key);
      }
    }
    memoryToken = null;
  }

  async function initialize(): Promise<void> {
    state.value.isLoading = true;
    state.value.error = null;
    const stored = readStoredToken();

    if (!stored) {
      state.value.isAuthenticated = false;
      state.value.user = null;
      state.value.token = null;
      state.value.isLoading = false;
      return;
    }

    try {
      const u = await client.b2b.validateToken(stored);
      state.value.isAuthenticated = true;
      state.value.user = u;
      state.value.token = stored;
      state.value.isLoading = false;
    } catch (err: any) {
      clearStoredToken();
      state.value.isAuthenticated = false;
      state.value.user = null;
      state.value.token = null;
      state.value.isLoading = false;
      state.value.error = err?.message || 'Token validation failed';
    }
  }

  async function setToken(tok: string): Promise<UserContext> {
    state.value.isLoading = true;
    state.value.error = null;
    try {
      const u = await client.b2b.validateToken(tok);
      writeStoredToken(tok);
      state.value.isAuthenticated = true;
      state.value.user = u;
      state.value.token = tok;
      state.value.isLoading = false;
      return u;
    } catch (err: any) {
      state.value.isLoading = false;
      state.value.error = err?.message || 'Invalid token';
      throw err;
    }
  }

  function logout(): void {
    clearStoredToken();
    state.value.isAuthenticated = false;
    state.value.user = null;
    state.value.token = null;
    state.value.isLoading = false;
    state.value.error = null;
  }

  function hasRole(role: string): boolean {
    return roles.value.includes(role);
  }

  function hasPermission(permission: string): boolean {
    const u = user.value;
    if (!u) return false;
    return client.b2b.hasPermission(u, permission);
  }

  function hasTenant(tenant: string): boolean {
    return user.value?.tenantId === tenant;
  }

  function getLoginUrl(): string {
    return config.loginUrl;
  }

  const instance: SerafortInstance = {
    client,
    state: readonly(state),
    isAuthenticated,
    user,
    token,
    tenantId,
    roles,
    permissions,
    isLoading,
    error,
    initialize,
    setToken,
    logout,
    hasRole,
    hasPermission,
    hasTenant,
    getLoginUrl,
    install(app: App) {
      app.provide(SERAFORT_INJECTION_KEY, instance);
      app.config.globalProperties.$serafort = instance;

      // Register directives: v-serafort-permission and v-serafort-role
      app.directive('serafort-permission', {
        mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
          const check = () => {
            const required = binding.value;
            const perms = Array.isArray(required) ? required : [required];
            const hasAccess = perms.every((p) => instance.hasPermission(p));
            el.style.display = hasAccess ? '' : 'none';
          };
          check();
        },
        updated(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
          const required = binding.value;
          const perms = Array.isArray(required) ? required : [required];
          const hasAccess = perms.every((p) => instance.hasPermission(p));
          el.style.display = hasAccess ? '' : 'none';
        },
      });

      app.directive('serafort-role', {
        mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
          const required = binding.value;
          const rList = Array.isArray(required) ? required : [required];
          const hasAccess = rList.some((r) => instance.hasRole(r));
          el.style.display = hasAccess ? '' : 'none';
        },
        updated(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
          const required = binding.value;
          const rList = Array.isArray(required) ? required : [required];
          const hasAccess = rList.some((r) => instance.hasRole(r));
          el.style.display = hasAccess ? '' : 'none';
        },
      });
    },
  };

  activeInstance = instance;

  if (config.autoInitialize) {
    void initialize();
  }

  return instance;
}
