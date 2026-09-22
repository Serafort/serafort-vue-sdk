import type { NavigationGuardWithThis, RouteLocationNormalized } from 'vue-router';
import { getActiveSerafortInstance } from '../plugin.js';
import type { RouterGuardOptions, SerafortInstance } from '../types.js';

function resolveInstance(instance?: SerafortInstance): SerafortInstance {
  const resolved = instance || getActiveSerafortInstance();
  if (!resolved) {
    throw new Error('Serafort instance not found. Initialize createSerafort before configuring router guards.');
  }
  return resolved;
}

/**
 * Creates a Vue Router Navigation Guard that ensures the user is authenticated.
 */
export function createAuthGuard(
  options: RouterGuardOptions = {},
  instance?: SerafortInstance
): NavigationGuardWithThis<undefined> {
  return async (to: RouteLocationNormalized) => {
    const serafort = resolveInstance(instance);

    // If still loading, wait for initialization
    if (serafort.isLoading.value) {
      await serafort.initialize();
    }

    if (serafort.isAuthenticated.value) {
      return true;
    }

    const loginUrl = options.redirectTo || serafort.getLoginUrl();
    return {
      path: loginUrl,
      query: options.preserveReturnUrl !== false ? { returnUrl: to.fullPath } : undefined,
    };
  };
}

/**
 * Creates a Vue Router Navigation Guard that validates granular permissions (wildcards supported).
 */
export function createPermissionGuard(
  requiredPermissions: string | string[],
  options: RouterGuardOptions = {},
  instance?: SerafortInstance
): NavigationGuardWithThis<undefined> {
  const perms = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  return async (to: RouteLocationNormalized) => {
    const serafort = resolveInstance(instance);

    if (serafort.isLoading.value) {
      await serafort.initialize();
    }

    if (!serafort.isAuthenticated.value) {
      const loginUrl = options.redirectTo || serafort.getLoginUrl();
      return {
        path: loginUrl,
        query: options.preserveReturnUrl !== false ? { returnUrl: to.fullPath } : undefined,
      };
    }

    const hasAll = perms.every((p) => serafort.hasPermission(p));
    if (hasAll) {
      return true;
    }

    if (options.redirectTo) {
      return { path: options.redirectTo };
    }

    return false;
  };
}

/**
 * Creates a Vue Router Navigation Guard that validates required roles.
 */
export function createRoleGuard(
  requiredRoles: string | string[],
  options: RouterGuardOptions = {},
  instance?: SerafortInstance
): NavigationGuardWithThis<undefined> {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  return async (to: RouteLocationNormalized) => {
    const serafort = resolveInstance(instance);

    if (serafort.isLoading.value) {
      await serafort.initialize();
    }

    if (!serafort.isAuthenticated.value) {
      const loginUrl = options.redirectTo || serafort.getLoginUrl();
      return {
        path: loginUrl,
        query: options.preserveReturnUrl !== false ? { returnUrl: to.fullPath } : undefined,
      };
    }

    const hasAny = roles.some((r) => serafort.hasRole(r));
    if (hasAny) {
      return true;
    }

    if (options.redirectTo) {
      return { path: options.redirectTo };
    }

    return false;
  };
}
