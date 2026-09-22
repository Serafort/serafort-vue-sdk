# @serafort/vue

Enterprise IAM & B2B Authentication adapter for Vue 3 and Pinia.

## Features

- ⚡ **Vue 3 Composition API**: Fully reactive composables: `useSerafort()`, `useAuth()`, `useUser()`, `useTenant()`, `usePermissions()`, and `useRoles()`.
- 🍍 **Pinia Store Integration**: Out-of-the-box `useSerafortStore` binding Serafort auth state with Pinia devtools.
- 🛡️ **Vue Router Navigation Guards**: `createAuthGuard`, `createPermissionGuard` (with wildcard matching), and `createRoleGuard`.
- 🧩 **Custom Directives**: `v-serafort-permission="'org:*'"` and `v-serafort-role="'admin'"` for declarative template element visibility.
- 🏢 **Multi-Tenant Isolation**: Built-in tenant verification methods `hasTenant(tenantId)`.

## Installation

```bash
npm install @serafort/vue @serafort/core
```

## Quick Start

### 1. Register Plugin

```typescript
// src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createSerafort } from '@serafort/vue';
import App from './App.vue';
import router from './router';

const app = createApp(App);

const serafort = createSerafort({
  endpoint: 'https://api.serafort.com',
  storageType: 'localStorage',
  loginUrl: '/login',
});

app.use(createPinia());
app.use(serafort);
app.use(router);
app.mount('#app');
```

### 2. Configure Router Guards

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { createAuthGuard, createPermissionGuard } from '@serafort/vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/dashboard',
      component: () => import('./views/Dashboard.vue'),
      beforeEnter: createAuthGuard(),
    },
    {
      path: '/admin',
      component: () => import('./views/Admin.vue'),
      beforeEnter: createPermissionGuard(['org:*']),
    },
  ],
});

export default router;
```

### 3. Consume in Single-File Components

```vue
<script setup lang="ts">
import { useAuth, useUser, usePermissions } from '@serafort/vue';

const { isAuthenticated, logout } = useAuth();
const user = useUser();
const { hasPermission } = usePermissions();
</script>

<template>
  <div v-if="isAuthenticated">
    <h2>Welcome, {{ user?.userId }}</h2>
    <p>Tenant: {{ user?.tenantId }}</p>

    <!-- Directive-based RBAC -->
    <button v-serafort-permission="'billing:edit'">
      Edit Billing Details
    </button>

    <button @click="logout">Logout</button>
  </div>
</template>
```
