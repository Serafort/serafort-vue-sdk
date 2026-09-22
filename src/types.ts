import type { App, ComputedRef, DeepReadonly, Ref } from 'vue';
import type { UserContext, SerafortClient } from '@serafort/core';

export type TokenStorageType = 'localStorage' | 'sessionStorage' | 'memory';

export interface SerafortVueOptions {
  /** Serafort IAM backend endpoint */
  endpoint: string;
  /** Client ID for B2B or M2M client applications */
  clientId?: string;
  /** Storage key for the access token. Default: '__serafort_token' */
  tokenStorageKey?: string;
  /** Storage mechanism. Default: 'localStorage' */
  storageType?: TokenStorageType;
  /** Default redirect URL when unauthenticated. Default: '/login' */
  loginUrl?: string;
  /** Optional pre-configured SerafortClient instance */
  client?: SerafortClient;
  /** Automatically validate token on application startup. Default: true */
  autoInitialize?: boolean;
}

export interface SerafortState {
  isAuthenticated: boolean;
  user: UserContext | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface SerafortInstance {
  readonly client: SerafortClient;
  readonly state: DeepReadonly<Ref<SerafortState>>;
  readonly isAuthenticated: ComputedRef<boolean>;
  readonly user: ComputedRef<UserContext | null>;
  readonly token: ComputedRef<string | null>;
  readonly tenantId: ComputedRef<string | null>;
  readonly roles: ComputedRef<string[]>;
  readonly permissions: ComputedRef<string[]>;
  readonly isLoading: ComputedRef<boolean>;
  readonly error: ComputedRef<string | null>;

  initialize(): Promise<void>;
  setToken(token: string): Promise<UserContext>;
  logout(): void;
  hasRole(role: string): boolean;
  hasPermission(permission: string): boolean;
  hasTenant(tenantId: string): boolean;
  getLoginUrl(): string;
  install(app: App): void;
}

export interface RouterGuardOptions {
  redirectTo?: string;
  preserveReturnUrl?: boolean;
}
