# AGSURJOBS — Master Agent

> **Purpose**: This is the **authoritative primary entry point** for all AI coding agents working on the AGSURJOBS codebase.
> Every AI model — regardless of provider (Claude, Gemini, GPT, Copilot, Cursor, etc.) — **MUST read this file first**
> before executing ANY coding request. This document defines the project structure, global constraints,
> and delegates domain-specific execution rules to the 4 specialized agent documents.

---

## 0. Mandatory Pre-Execution Protocol

> [!CAUTION]
> **BEFORE writing, modifying, or deleting ANY code**, you MUST:
> 1. **Identify which specialized agents apply** to your task using the Registry & Task Matrix below.
> 2. **Read the relevant specialized agent file(s)** and follow their rules strictly.
> 3. **Never skip an applicable agent** — violating a specialized agent's rules is considered a project constraint violation.

### Specialized Agent Registry

| Agent File | Domain | Key Responsibilities | Read When... |
|---|---|---|---|
| [`BACKEND.md`](.agents/BACKEND.md) | **Service Layer & State** | 5-layer architecture, Pinia setup stores, Services, Composables, Caching, Helpers, File uploads | Writing/modifying any service, store, composable, or backend data flow |
| [`DATABASE.md`](.agents/DATABASE.md) | **Database & Schema** | Multi-schema architecture (`public`, `core`, `applicants`, `employers`, `jobs`, `system`, `esmdd`), typed queries, RPCs, migrations | Writing queries, defining/deriving types, referencing tables/schemas |
| [`DESIGN.md`](.agents/DESIGN.md) | **UI & Design System** | `oklch` tokens, Tailwind CSS v4, shadcn-vue (`reka-vega`), Lucide icons, Dark mode, Layouts, Motion | Creating/modifying `.vue` components, layouts, styling, or animations |
| [`SECURITY.md`](.agents/SECURITY.md) | **Auth & Access Control** | Client route guards, Supabase Auth/JWT, RLS policies, SECURITY DEFINER functions, Password validation | Touching auth, role permissions, route guards, or sensitive operations |

### Task-to-Agent Mapping

| Task | Required Agents |
|---|---|
| **New Full-Stack Feature** | [`BACKEND.md`](.agents/BACKEND.md) + [`DATABASE.md`](.agents/DATABASE.md) + [`DESIGN.md`](.agents/DESIGN.md) + [`SECURITY.md`](.agents/SECURITY.md) |
| **New / Modify Vue Component** | [`DESIGN.md`](.agents/DESIGN.md) (+ [`BACKEND.md`](.agents/BACKEND.md) if connecting to stores/composables) |
| **New / Modify Supabase Query** | [`DATABASE.md`](.agents/DATABASE.md) + [`BACKEND.md`](.agents/BACKEND.md) + [`SECURITY.md`](.agents/SECURITY.md) |
| **New / Modify Pinia Store** | [`BACKEND.md`](.agents/BACKEND.md) + [`DATABASE.md`](.agents/DATABASE.md) |
| **Fix Styling / Dark Mode / Layout** | [`DESIGN.md`](.agents/DESIGN.md) |
| **Auth / Login / Registration Flow** | [`SECURITY.md`](.agents/SECURITY.md) + [`BACKEND.md`](.agents/BACKEND.md) + [`DATABASE.md`](.agents/DATABASE.md) |
| **Route / Navigation / Guard Change** | [`SECURITY.md`](.agents/SECURITY.md) + [`DESIGN.md`](.agents/DESIGN.md) |
| **Type Definition / Schema Update** | [`DATABASE.md`](.agents/DATABASE.md) |
| **File Upload / Media Storage** | [`BACKEND.md`](.agents/BACKEND.md) + [`SECURITY.md`](.agents/SECURITY.md) |
| **Data Tables / Data Visualizations** | [`DESIGN.md`](.agents/DESIGN.md) + [`BACKEND.md`](.agents/BACKEND.md) + [`DATABASE.md`](.agents/DATABASE.md) |

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
| Backend/DB      | **Supabase** (multi-schema: `public`, `core`, `applicants`, `employers`, `jobs`, `system`, `esmdd`) |
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
│   └── *.vue                # Shared visual / entry components
├── composables/
│   ├── common/              # Shared composables (useAuth, useToastAlert, useFileUpload, usePsgc, etc.)
│   ├── admin/               # Admin composables
│   ├── applicant/           # Applicant composables
│   ├── employer/            # Employer composables
│   └── peso/                # PESO composables (provincialPeso/)
├── helpers/
│   ├── common/              # Shared helpers (persistentCache, formatters, uploadHelpers, etc.)
│   ├── admin/               # Admin helpers
│   ├── applicant/           # Applicant helpers
│   ├── employer/            # Employer helpers
│   └── peso/                # PESO helpers
├── layouts/                 # Role layouts (AdminLayout, ApplicantLayout, EmployerLayout, etc.)
├── lib/
│   ├── supabaseClient.ts    # Singleton typed Supabase client
│   └── utils.ts             # cn() utility for class merging (shadcn-vue)
├── router/
│   ├── index.ts             # Main router + global beforeEach guard
│   └── routes/              # Modular routes per role (Admin, Applicant, Employer, Peso, Login)
├── services/
│   ├── common/              # Shared services (authService, fileUploadService, mediaService, psgc)
│   ├── admin/               # Admin services
│   ├── applicant/           # Applicant services
│   ├── employer/            # Employer services
│   └── peso/                # PESO services
├── stores/
│   ├── common/              # Shared stores (auth, fileUploadStore)
│   ├── admin/               # Admin stores
│   ├── applicant/           # Applicant stores
│   ├── employer/            # Employer stores
│   └── peso/                # PESO stores
├── types/
│   ├── database.types.ts    # AUTO-GENERATED — DO NOT EDIT MANUALLY
│   ├── common/              # Shared types (auth, fileUpload)
│   ├── admin/               # Admin types
│   ├── applicant/           # Applicant types
│   ├── employer/            # Employer types
│   └── peso/                # PESO types
├── views/                   # Thin page views
├── App.vue                  # Root: RouterView with fade transition + ToastAlert
├── main.ts                  # Entry point
└── style.css                # Design tokens (oklch), Tailwind theme, base layer
```

---

## 3. Universal Architectural Constraints

### 3.1 Layered Data Flow
```
Component (.vue) ──► Composable (useXxx) ──► Store (xxxStore) ──► Service (xxxService) ──► Supabase / Types
```
- **Components** never call Supabase or services directly; use composables/stores.
- **Services** are stateless pure TypeScript modules — never import Vue reactivity (`ref`, `computed`).
- **Stores** manage reactive state and delegate operations to services.
- **Helpers** are pure, stateless utility functions with no side effects.

### 3.2 Routing & Role Prefixes
| Role | Path Prefix | Layout | Meta `role` Value |
|---|---|---|---|
| Auth (public) | `/login`, `/signup` | `AuthLayout` | _(none)_ |
| Admin | `/admin` | `AdminLayout` | `'admin'` |
| Applicant | `/app` | `ApplicantLayout` | `'applicant'` |
| Employer | `/employer` | `EmployerLayout` | `'company_owner'` |
| Provincial PESO | `/provincial-peso` | `ProvincialPesoLayout` | `'provincial_peso'` |
| Municipal PESO | `/municipal-peso` | `MunicipalPesoLayout` | `'municipal_peso'` |

### 3.3 File Naming & Imports
- **Components / Layouts / Sidebars**: `PascalCase.vue` (e.g., `ApplicantDashboard.vue`, `AdminSidebar.vue`)
- **Composables**: `useCamelCase.ts` (e.g., `useUserAccounts.ts`)
- **Stores**: `camelCaseStore.ts` or `camelCase.ts` (e.g., `userAccountsStore.ts`, `auth.ts`)
- **Services**: `camelCaseService.ts` (e.g., `userAccountService.ts`)
- **Helpers / Types**: `camelCaseHelper.ts` / `camelCase.ts`
- **Imports**: Always use `@/` alias (e.g., `@/services/admin/userAccountService`). Never use relative traversal (`../../`).
- **Type-only imports**: Always use `import type { ... }`.

---

## 4. Universal Critical DON'Ts — HARD RULES

> [!CAUTION]
> 1. **DO NOT edit `src/types/database.types.ts`** — it is auto-generated via `npm run types:gen`.
> 2. **DO NOT edit files inside `src/components/ui/`** — they are shadcn-vue primitives managed via CLI.
> 3. **DO NOT install alternative UI component libraries** (Vuetify, PrimeVue, Element Plus, etc.).
> 4. **DO NOT create secondary Supabase clients** (except the documented admin account-creation pattern).
> 5. **DO NOT query Supabase without `.schema('<name>')`** — this is a multi-schema database.
> 6. **DO NOT use Options API** in Vue components or new stores (Setup API `<script setup lang="ts">` only).
> 7. **DO NOT bypass the layered architecture** (Component → Composable → Store → Service).
> 8. **DO NOT remove or weaken the `router.beforeEach` guard** in `src/router/index.ts`.
> 9. **DO NOT store sensitive data** (passwords, tokens) in Pinia state or localStorage.
> 10. **DO NOT mix role-specific logic** across role folders (e.g., no admin code in `applicant/`).
> 11. **DO NOT use `sonner` or `vue-sonner` directly** in components — use `useToastAlert()`.
> 12. **DO NOT hard-code color hex values** — use semantic design tokens from `style.css`.
> 13. **DO NOT use `any` type** without explicit necessity and explanatory comment.
> 14. **DO NOT remove unrelated existing comments, docstrings, or code blocks**.
