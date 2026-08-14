# AGSURJOBS — Agent Architecture Rules

> **Purpose**: This document defines the project's architecture, conventions, and constraints.
> Any AI agent working in this codebase MUST follow these rules to avoid breaking the structure.

---

## 1. Project Overview

**AGSURJOBS** is a multi-role job portal for the Province of Agusan del Sur, Philippines.
It serves 5 user roles: **Admin**, **Applicant**, **Employer** (company_owner/company_member), **Provincial PESO**, and **Municipal PESO**.

### Technology Stack — DO NOT CHANGE

| Layer           | Technology                                                         |
| --------------- | ------------------------------------------------------------------ |
| Framework       | **Vue 3** (Composition API with `<script setup lang="ts">`)       |
| Build Tool      | **Vite 8** with `@vitejs/plugin-vue`                               |
| Language        | **TypeScript** (strict)                                            |
| State           | **Pinia 3** (setup stores using `defineStore('name', () => {})`)   |
| Routing         | **Vue Router 4** (history mode)                                    |
| Backend/DB      | **Supabase** (multi-schema: `public`, `core`, `applicants`, `employers`, `jobs`, `system`) |
| UI Components   | **shadcn-vue** (reka-vega style, reka-ui base) + Tailwind CSS v4   |
| Styling         | **Tailwind CSS v4** with `@tailwindcss/vite` plugin                |
| Icons           | **Lucide Vue** (`@lucide/vue`)                                     |
| Animations      | **@vueuse/motion**, `tw-animate-css`, Vue `<transition>` / `<TransitionGroup>` |
| Forms           | **vee-validate** + **zod** (`@vee-validate/zod`)                   |
| Data Tables     | **@tanstack/vue-table**                                            |
| Maps            | **mapbox-gl**                                                      |
| Toast/Alerts    | Custom `useToastAlert` composable (NOT vue-sonner directly in components) |
| Date Handling   | **date-fns**                                                       |
| HTTP            | **axios** (for external APIs only; all Supabase calls use the JS client) |
| Charts          | **@unovis/vue** + **@unovis/ts**                                  |
| Font            | **Nunito Sans** (Google Fonts, imported in `style.css`)            |
| Path Alias      | `@` → `./src` (configured in `vite.config.ts`)                    |

> [!CAUTION]
> **DO NOT** install new UI component libraries (e.g., Vuetify, Element Plus, Quasar, PrimeVue).
> All UI components come from shadcn-vue (`src/components/ui/`). Add new primitives via `npx shadcn-vue@latest add <component>`.

---

## 2. Directory Structure — STRICT ROLE-BASED SEGMENTATION

Every directory under `src/` that holds business logic follows a **role-based subdirectory pattern**.
The 5 role segments are: `common`, `admin`, `applicant`, `employer`, `peso`.

```
src/
├── assets/                  # Static assets (images, SVGs)
├── components/
│   ├── ui/                  # shadcn-vue primitives (DO NOT edit manually)
│   ├── sidebars/            # One sidebar per role: AdminSidebar, ApplicantSidebar, etc.
│   ├── admin/               # Admin-specific page components
│   ├── applicant/           # Applicant-specific page components
│   ├── employer/            # Employer-specific page components
│   ├── peso/                # PESO-specific page components (ProvincialPeso/, MunicipalPeso/)
│   ├── Aurora.vue           # Shared visual components
│   ├── Plasma.vue
│   ├── SpotLightCard.vue
│   ├── CustomBreadcrumbs.vue
│   ├── LoginCard.vue
│   ├── SignupCard.vue
│   ├── ToastAlert.vue
│   └── HelloWorld.vue
├── composables/
│   ├── common/              # Shared composables (useAuth, useLogin, useSignup, useToastAlert, useFileUpload, usePsgc, useMapboxMap)
│   ├── admin/               # Admin composables (useUserAccounts, useSystemDirectory, useDocumentTemplates, useGeographicMap, useMunicipalityData)
│   ├── applicant/           # Applicant composables (useApplicantProfile, useProfileEdit, useProfileMedia)
│   ├── employer/            # Employer composables (useCompanyProfile, useCompanyMap)
│   └── peso/                # PESO composables
│       └── provincialPeso/
├── helpers/
│   ├── common/              # Shared helpers (persistentCache, fileHelpers, formatters, mapboxHelpers, password, psgcHelpers, uploadHelpers)
│   ├── admin/               # Admin helpers (systemDirectoryHelper, userAccountsHelper)
│   ├── applicant/           # Applicant helpers (applicantRequirementDocuments, applicantRequirementTypes)
│   ├── employer/            # Employer helpers (companyProfileHelpers)
│   └── peso/
├── layouts/
│   ├── auth/                # AuthLayout.vue (login/signup pages)
│   ├── AdminLayout.vue
│   ├── ApplicantLayout.vue
│   ├── EmployerLayout.vue
│   ├── MunicipalPesoLayout.vue
│   └── ProvincialPesoLayout.vue
├── lib/
│   ├── supabaseClient.ts    # Singleton typed Supabase client — ONE instance
│   └── utils.ts             # cn() utility for class merging (shadcn-vue)
├── router/
│   ├── index.ts             # Main router + global beforeEach guard
│   └── routes/
│       ├── Login.ts
│       ├── Admin/admin.ts
│       ├── Applicant/applicant.ts
│       ├── Employer/employer.ts
│       └── Peso/peso.ts
├── services/
│   ├── common/              # Shared services (authService, fileUploadService, mediaService, psgc)
│   ├── admin/               # Admin services (userAccountService, systemDirectoryService, documentTemplateService)
│   ├── applicant/           # Applicant services (applicantProfileService, applicantRequirementUploadService)
│   ├── employer/            # Employer services (companyProfileService)
│   └── peso/
│       └── provincialPeso/
├── stores/
│   ├── common/              # Shared stores (auth, fileUploadStore)
│   ├── admin/               # Admin stores (userAccountsStore, systemDirectoryStore, documentTemplateStore)
│   ├── applicant/           # Applicant stores (profileStore)
│   ├── employer/            # (empty — uses composables directly)
│   └── peso/
│       └── provincialPeso/
├── types/
│   ├── database.types.ts    # AUTO-GENERATED — DO NOT EDIT MANUALLY
│   ├── common/              # Shared types (auth, fileUpload)
│   ├── admin/               # Admin types (userAccounts, systemDirectory, documentTemplate)
│   ├── applicant/           # (empty — types defined inline or in helpers)
│   ├── employer/            # Employer types (companyProfile)
│   └── peso/
│       └── provincialPeso/
├── views/
│   └── auth/                # Login.vue, Signup.vue (thin wrappers for LoginCard/SignupCard)
├── App.vue                  # Root: RouterView with fade transition + ToastAlert
├── main.ts                  # Entry: createApp → Pinia → Router → MotionPlugin
└── style.css                # Design tokens (oklch), Tailwind theme, base layer, transitions
```

### Rules

> [!IMPORTANT]
> 1. **NEVER place admin logic in `applicant/`, employer logic in `admin/`, etc.** Each role has its own subdirectory.
> 2. **Shared/cross-role logic goes in `common/`** only if genuinely used by 2+ roles.
> 3. **PESO has a nested `provincialPeso/` subdirectory** for provincial-specific logic. Municipal PESO reuses provincial components where applicable.
> 4. When creating a new feature, create corresponding files in ALL relevant layers (types → service → store → helpers → composable → component).
> 5. **`src/types/database.types.ts` is auto-generated** by `npm run types:gen`. NEVER edit it manually.
> 6. **`src/components/ui/`** contains shadcn-vue primitives. NEVER edit these files directly. Use `npx shadcn-vue@latest add <component>` to add new ones.

---

## 3. Layered Architecture — THE DATA FLOW PATTERN

Every feature follows this strict 5-layer architecture. Layers communicate top-to-bottom ONLY:

```
┌─────────────────────────────────────────────────────┐
│  Vue Component (.vue)                               │  ← Template + UI logic
│    ↓ uses                                           │
│  Composable (useXxx.ts)                             │  ← Vue-specific orchestration, table columns, lifecycle
│    ↓ uses                                           │
│  Pinia Store (xxxStore.ts)                          │  ← Reactive state, UI flags, actions that call services
│    ↓ calls                                          │
│  Service (xxxService.ts)                            │  ← Supabase queries, API calls, data fetching/mutation
│    ↓ uses                                           │
│  Types (xxx.ts) + Helpers (xxxHelper.ts)            │  ← Type definitions, pure functions, formatters
└─────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer         | Responsibility                                                                                          | Naming Convention                        |
| ------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Types**     | TypeScript interfaces/types derived from `Database` types. Row, Insert, Update types, form states, payloads. | `camelCase.ts` (e.g., `userAccounts.ts`) |
| **Helpers**   | Pure functions with zero side effects: formatters, badge variants, date formatting, validation logic.    | `camelCaseHelper.ts` or `camelCase.ts`   |
| **Services**  | All Supabase/API calls. Stateless objects exported as `const xxxService = { ... }`. Handle caching keys. | `camelCaseService.ts`                    |
| **Stores**    | Pinia stores. Reactive state (`ref`), computed properties, actions that delegate to services.             | `camelCaseStore.ts`                      |
| **Composables** | Vue composables using `useXxx()` pattern. Wire up stores with `storeToRefs`, create table instances, handle `onMounted`. | `useXxx.ts`                              |
| **Components** | `.vue` SFCs. Use `<script setup lang="ts">`. Import composables, destructure, bind to template.         | `PascalCase.vue`                         |

### Rules

> [!WARNING]
> 1. **Components MUST NOT call Supabase directly.** All DB access goes through services.
> 2. **Services MUST NOT import Vue reactivity** (`ref`, `computed`, `watch`). They are pure TS modules.
> 3. **Stores CAN call services** but should NOT contain complex Supabase query logic — delegate to services.
> 4. **Composables** are the glue layer. They CAN use stores, services, and Vue APIs.
> 5. **Helpers** are stateless pure functions. They MUST NOT import stores, services, or Vue APIs.
> 6. **NEVER skip layers** — e.g., don't call a service directly from a component; go through the composable/store.

---

## 4. Pinia Store Conventions

### Store Definition Pattern (Setup Stores)

All stores use the **Composition API (setup) syntax** via `defineStore('name', () => { ... })`:

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SomeType } from '@/types/<role>/someType'
import { someService } from '@/services/<role>/someService'
import { useToastAlert } from '@/composables/common/useToastAlert'

export const useSomeStore = defineStore('storeName', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const items = ref<SomeType[]>([])
  const isLoading = ref<boolean>(false)
  const isSubmitting = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)
  const selectedItem = ref<SomeType | null>(null)

  // ─── UI Flags ───
  const isDetailsOpen = ref<boolean>(false)
  const isAddOpen = ref<boolean>(false)

  // ─── Actions ───
  const fetchItems = async () => { ... }
  const createItem = async (payload: CreatePayload) => { ... }

  // ─── Return ───
  return {
    // State
    items, isLoading, isSubmitting, errorMessage, selectedItem,
    // UI Flags
    isDetailsOpen, isAddOpen,
    // Actions
    fetchItems, createItem,
  }
})
```

### Exception: `fileUploadStore.ts`

The file upload store is the **only** store using Options API (`defineStore('name', { state, getters, actions })`).
Do NOT convert it. New stores MUST use the setup syntax.

### Rules

> [!IMPORTANT]
> 1. Store names use `useCamelCaseStore` convention.
> 2. Always provide toast feedback via `useToastAlert()` for success/error operations.
> 3. UI modal/sheet state (open/close booleans) lives in the store, NOT in components.
> 4. After mutations, invalidate persistent cache keys via `removePersistentCacheValue(KEY)`.
> 5. When updating arrays, always reassign with a new reference (`items.value = [...newItems]`) for TanStack Table reactivity.

---

## 5. Service Conventions

Services are **stateless objects** exported as named constants:

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

export const someService = {
  async fetchAll(): Promise<SomeRow[]> {
    const { data, error } = await supabase
      .schema('schemaName')     // Always specify schema explicitly
      .from('tableName')
      .select('...')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message || 'Human-readable fallback')
    return data ?? []
  },

  async create(payload: SomeInsert): Promise<SomeRow> {
    const { data, error } = await supabase
      .schema('schemaName')
      .from('tableName')
      .insert(payload)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Human-readable fallback')
    return data
  },
}
```

### Rules

> [!IMPORTANT]
> 1. **Always specify `.schema('...')`** on Supabase queries. The DB uses multiple schemas: `public`, `core`, `applicants`, `employers`, `jobs`, `system`.
> 2. **Always use `supabase` from `@/lib/supabaseClient`** — the singleton typed client. NEVER create additional clients except for the specific admin account-creation pattern (isolated `createClient` with `persistSession: false`).
> 3. Services throw `Error` on failure — stores catch and display toasts.
> 4. Use `getOrSetPersistentCache()` for read-heavy endpoints; use `removePersistentCacheValue()` after mutations.

---

## 6. Composable Conventions

```typescript
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSomeStore } from '@/stores/<role>/someStore'

export function useSomething() {
  const store = useSomeStore()
  const { items, isLoading, ... } = storeToRefs(store)
  const { fetchItems, createItem, ... } = store  // actions destructured directly

  // TanStack Table setup, column definitions, etc.

  onMounted(() => {
    fetchItems()
  })

  return { items, isLoading, fetchItems, createItem, ... }
}
```

### Rules

> [!IMPORTANT]
> 1. Always use `storeToRefs()` for reactive state from stores. Destructure actions directly from the store instance.
> 2. Composable names follow `useXxx` pattern.
> 3. TanStack Vue Table column definitions live in the composable, NOT in the component.
> 4. `onMounted` data fetching happens in the composable.

---

## 7. Type Conventions

### Deriving Types from the Database

All domain types MUST derive from `Database` (auto-generated):

```typescript
import type { Database } from '@/types/database.types'

// Row/Insert/Update types
export type SomeRow = Database['schemaName']['Tables']['tableName']['Row']
export type SomeInsert = Database['schemaName']['Tables']['tableName']['Insert']

// Enum types
export type UserRole = Database['core']['Enums']['user_role']
export type StatusType = Database['core']['Enums']['status_type']

// Extended types (add client-only fields)
export type ExtendedRow = SomeRow & {
  email?: string | null       // joined from auth
  avatarUrl?: string | null   // computed from storage
}

// Payload interfaces
export interface CreatePayload {
  email: string
  password: string
  // ... required fields
}
```

### Rules

> [!IMPORTANT]
> 1. **NEVER define raw DB column types manually.** Always derive from `Database['schema']['Tables']['table']['Row']`.
> 2. **To regenerate types**, run: `npm run types:gen`. This reads from all schemas.
> 3. Use `Pick<>` for partial projections (e.g., `ProfileSummary`).
> 4. Client-only computed fields (avatarUrl, email from RPC) are added via intersection types (`& { field: type }`).

---

## 8. Routing & Security

### Route Structure

Each role has its own route file under `src/router/routes/<Role>/`:

```typescript
export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    component: AdminLayout,
    meta: { breadcrumb: false, requiresAuth: true, role: 'admin' },
    children: [ ... ]
  },
]
```

### Route Prefixes by Role

| Role              | Path Prefix         | Layout                   | Meta `role` Value    |
| ----------------- | ------------------- | ------------------------ | -------------------- |
| Auth (public)     | `/login`, `/signup`  | `AuthLayout`            | _(none)_             |
| Admin             | `/admin`             | `AdminLayout`           | `'admin'`            |
| Applicant         | `/app`               | `ApplicantLayout`       | `'applicant'`        |
| Employer          | `/employer`          | `EmployerLayout`        | `'company_owner'`    |
| Provincial PESO   | `/provincial-peso`   | `ProvincialPesoLayout`  | `'provincial_peso'`  |
| Municipal PESO    | `/municipal-peso`    | `MunicipalPesoLayout`   | `'municipal_peso'`   |

### Global Navigation Guard (`router/index.ts`)

The `beforeEach` guard enforces:
1. **Authentication**: Routes with `meta.requiresAuth` redirect unauthenticated users to `/login`.
2. **Role enforcement**: Routes with `meta.role` redirect users to their correct dashboard if they try to access another role's pages.
3. **Authenticated redirect**: Logged-in users accessing `/`, `/login`, or `/signup` are redirected to their dashboard.

### Rules

> [!CAUTION]
> 1. **NEVER remove or weaken the `beforeEach` guard.** All role-based access control depends on it.
> 2. **Always set `meta.requiresAuth: true`** on authenticated routes.
> 3. **Always set `meta.role`** on role-specific route groups to enable role enforcement.
> 4. **Use lazy loading** (`() => import(...)`) for all route components except shared layouts.
> 5. Route `name` values MUST be unique across the entire app.
> 6. New routes for a role go into that role's route file — NEVER add admin routes to `applicant.ts`, etc.

---

## 9. Supabase & Authentication

### Client Configuration

The Supabase client is a typed singleton in `src/lib/supabaseClient.ts`:

```typescript
import type { Database } from '@/types/database.types'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
```

### Multi-Schema Queries

This project uses **multiple Postgres schemas**. Always specify `.schema()`:

```typescript
// ✅ Correct
supabase.schema('core').from('profiles').select('*')
supabase.schema('applicants').from('applicants').select('*')
supabase.schema('employers').from('companies').select('*')

// ❌ WRONG — will query the wrong schema
supabase.from('profiles').select('*')
```

### Auth Store (`stores/common/auth.ts`)

The auth store manages:
- Session/user state
- Profile hydration (fetches all role-specific data on login)
- Signup flow state (multi-step form data)
- Auth state listener (`onAuthStateChange`) — skips `TOKEN_REFRESHED` and `INITIAL_SESSION` to avoid re-renders

### Rules

> [!CAUTION]
> 1. **NEVER create a second Supabase client** unless doing isolated admin account creation (see `userAccountService.createProfile`).
> 2. **NEVER store sensitive data** (passwords, tokens) in Pinia state or localStorage.
> 3. **Always use `VITE_` prefix** for environment variables (Vite requirement).
> 4. The auth store's `init()` is called in the router guard — do NOT call it elsewhere unless force-hydrating.
> 5. **Row Level Security (RLS)** is enforced server-side. Client code must NOT assume it can bypass RLS.
> 6. For admin operations that need to bypass RLS, use SECURITY DEFINER database functions via `.rpc()`.

---

## 10. UI & Styling Conventions

### Component Syntax

All `.vue` components use:
```vue
<script setup lang="ts">
// Composition API only — NO Options API in components
</script>

<template>
  <!-- Template content -->
</template>
```

No `<style>` blocks — all styling is done via **Tailwind CSS utility classes**.

### shadcn-vue Components

- Located in `src/components/ui/`
- Style: `reka-vega` (configured in `components.json`)
- Base color: `taupe`
- Icon library: `lucide` (`@lucide/vue`)
- DO NOT edit UI components directly
- Add new ones: `npx shadcn-vue@latest add <component-name>`

### Design Tokens

Design tokens are defined in `src/style.css` using **oklch color space** with light/dark mode support.
Use semantic token names in Tailwind classes:

```html
<!-- ✅ Correct — uses design tokens -->
<div class="bg-background text-foreground border-border">
<div class="bg-sidebar text-sidebar-foreground">
<div class="text-muted-foreground bg-accent">

<!-- ❌ WRONG — hardcoded colors bypass the theme -->
<div class="bg-white text-black">
<div style="color: #333">
```

### Layout Pattern

Every role has: `Layout.vue` → contains `SidebarProvider` + role-specific `Sidebar` + `<RouterView/>`.

```
SidebarProvider
├── RoleSidebar (navigation)
└── main
    ├── header (SidebarTrigger + breadcrumbs + theme toggle)
    └── content area (<RouterView/>)
```

### Dark Mode

Uses `@vueuse/core`'s `useColorMode()`. Toggle is in each layout header.
The dark mode variant is: `@custom-variant dark (&:is(.dark *))`.

### Rules

> [!IMPORTANT]
> 1. **NO inline styles** (`style="..."`). Use Tailwind classes only.
> 2. **NO new CSS files** — all custom styles go in `src/style.css`.
> 3. **Always support dark mode** — use semantic tokens that have dark variants, or add explicit `dark:` prefixes.
> 4. **Lucide icons only** — import from `@lucide/vue`. Do NOT add other icon libraries.
> 5. **Font is Nunito Sans** — do NOT change or add other fonts.
> 6. Component files use **PascalCase** naming (e.g., `ApplicantDashboard.vue`).

---

## 11. Toast & Notification Pattern

Use the custom `useToastAlert()` composable — NOT `sonner` or `vue-sonner` directly:

```typescript
import { useToastAlert } from '@/composables/common/useToastAlert'

const toastAlert = useToastAlert()
toastAlert.success('Title', 'Description')
toastAlert.error('Title', 'Description')
toastAlert.info('Title', 'Description')
```

The global `ToastAlert.vue` component in `App.vue` renders all toasts via `<Teleport to="body">`.

---

## 12. Persistent Caching Pattern

For read-heavy data (user lists, directory records), use `localStorage`-backed caching:

```typescript
import { getOrSetPersistentCache, removePersistentCacheValue, getPersistentCacheValue } from '@/helpers/common/persistentCache'

// Read with stale-while-revalidate
const cached = getPersistentCacheValue<SomeType[]>(CACHE_KEY)
if (cached) items.value = cached  // show stale data immediately

// Fetch fresh, auto-cache
const fresh = await getOrSetPersistentCache(CACHE_KEY, TTL_MS, async () => {
  return await someService.fetchAll()
})

// Invalidate after mutations
removePersistentCacheValue(CACHE_KEY)
```

---

## 13. File Naming Conventions

| Artifact           | Convention                | Example                                     |
| ------------------ | ------------------------- | ------------------------------------------- |
| Vue components     | `PascalCase.vue`          | `ApplicantDashboard.vue`, `CompanyProfile.vue` |
| Composables        | `useCamelCase.ts`         | `useUserAccounts.ts`, `useAuth.ts`          |
| Stores             | `camelCaseStore.ts`       | `userAccountsStore.ts`, `auth.ts`           |
| Services           | `camelCaseService.ts`     | `userAccountService.ts`, `authService.ts`   |
| Types              | `camelCase.ts`            | `userAccounts.ts`, `fileUpload.ts`          |
| Helpers            | `camelCase.ts` or `camelCaseHelper.ts` | `userAccountsHelper.ts`, `formatters.ts`    |
| Route files        | `camelCase.ts`            | `admin.ts`, `applicant.ts`                  |
| Layouts            | `PascalCaseLayout.vue`    | `AdminLayout.vue`                           |
| Sidebars           | `PascalCaseSidebar.vue`   | `AdminSidebar.vue`                          |

---

## 14. Import Conventions

```typescript
// ✅ Always use the @ alias
import { supabase } from '@/lib/supabaseClient'
import type { ProfileRow } from '@/types/admin/userAccounts'
import { useAuthStore } from '@/stores/common/auth'

// ❌ NEVER use relative paths for cross-directory imports
import { supabase } from '../../lib/supabaseClient'
```

Type-only imports MUST use `import type`:
```typescript
import type { Database } from '@/types/database.types'
import type { RouteRecordRaw } from 'vue-router'
```

---

## 15. Critical DON'Ts — HARD RULES

> [!CAUTION]
> 1. **DO NOT edit `src/types/database.types.ts`** — it is auto-generated.
> 2. **DO NOT edit files inside `src/components/ui/`** — they are shadcn-vue managed.
> 3. **DO NOT install alternative UI libraries** (Vuetify, PrimeVue, Element Plus, etc.).
> 4. **DO NOT create new Supabase clients** (except the documented admin pattern).
> 5. **DO NOT use Options API** in Vue components or new stores.
> 6. **DO NOT bypass the layered architecture** (component → composable → store → service → types).
> 7. **DO NOT remove or weaken the router `beforeEach` guard**.
> 8. **DO NOT store secrets/passwords in client state**.
> 9. **DO NOT mix role-specific code across role directories** (no admin code in `applicant/`).
> 10. **DO NOT use `sonner` or `vue-sonner` directly** in components — use `useToastAlert()`.
> 11. **DO NOT hard-code colors** — use design tokens from `style.css`.
> 12. **DO NOT query Supabase without specifying `.schema()`** — this is a multi-schema database.
> 13. **DO NOT use `any` type** unless absolutely necessary and documented with a comment.
> 14. **DO NOT remove existing comments or docstrings** that are unrelated to your changes.
