import { inject } from 'vue';
import { SERAFORT_INJECTION_KEY, getActiveSerafortInstance } from '../plugin.js';
import type { SerafortInstance } from '../types.js';

/**
 * Access the Serafort instance in Vue components.
 */
export function useSerafort(): SerafortInstance {
  const instance = inject(SERAFORT_INJECTION_KEY, null) || getActiveSerafortInstance();
  if (!instance) {
    throw new Error(
      'Serafort has not been installed. Make sure to call `app.use(serafort)` in your main.ts'
    );
  }
  return instance;
}

export function useAuth() {
  const serafort = useSerafort();
  return {
    isAuthenticated: serafort.isAuthenticated,
    isLoading: serafort.isLoading,
    error: serafort.error,
    token: serafort.token,
    setToken: serafort.setToken.bind(serafort),
    logout: serafort.logout.bind(serafort),
    initialize: serafort.initialize.bind(serafort),
  };
}

export function useUser() {
  const serafort = useSerafort();
  return serafort.user;
}

export function useTenant() {
  const serafort = useSerafort();
  return serafort.tenantId;
}

export function useRoles() {
  const serafort = useSerafort();
  return {
    roles: serafort.roles,
    hasRole: serafort.hasRole.bind(serafort),
  };
}

export function usePermissions() {
  const serafort = useSerafort();
  return {
    permissions: serafort.permissions,
    hasPermission: serafort.hasPermission.bind(serafort),
  };
}
