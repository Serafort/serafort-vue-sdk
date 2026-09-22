import { defineStore } from 'pinia';
import { getActiveSerafortInstance } from '../plugin.js';
import type { SerafortInstance } from '../types.js';
import type { UserContext } from '@serafort/core';

export const useSerafortStore = defineStore('serafort', {
  state: () => {
    const serafort = getActiveSerafortInstance();
    return {
      isAuthenticated: serafort?.isAuthenticated.value ?? false,
      user: (serafort?.user.value ?? null) as UserContext | null,
      token: (serafort?.token.value ?? null) as string | null,
      isLoading: serafort?.isLoading.value ?? false,
      error: (serafort?.error.value ?? null) as string | null,
    };
  },
  getters: {
    tenantId: (state) => state.user?.tenantId ?? null,
    roles: (state) => state.user?.roles ?? [],
    permissions: (state) => state.user?.permissions ?? [],
    hasPermission: (state) => {
      return (permission: string) => {
        const serafort = getActiveSerafortInstance();
        if (!state.user || !serafort) return false;
        return serafort.hasPermission(permission);
      };
    },
    hasRole: (state) => {
      return (role: string) => state.user?.roles.includes(role) ?? false;
    },
  },
  actions: {
    async setToken(token: string, instance?: SerafortInstance) {
      const serafort = instance || getActiveSerafortInstance();
      if (!serafort) throw new Error('Serafort instance not found');
      this.isLoading = true;
      try {
        const user = await serafort.setToken(token);
        this.isAuthenticated = true;
        this.user = user;
        this.token = token;
        this.error = null;
        return user;
      } catch (err: any) {
        this.error = err?.message || 'Failed to set token';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },
    logout(instance?: SerafortInstance) {
      const serafort = instance || getActiveSerafortInstance();
      serafort?.logout();
      this.isAuthenticated = false;
      this.user = null;
      this.token = null;
      this.error = null;
    },
  },
});
