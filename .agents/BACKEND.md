# AGSURJOBS — Backend Agent

> **Purpose**: This document defines all backend conventions, data flow patterns, service architecture,
> and Supabase integration rules for the AGSURJOBS project.
> Any AI agent writing backend logic (services, stores, composables, API calls) MUST follow these rules.

---

## 1. Backend Architecture Overview

AGSURJOBS is a **client-side Vue 3 SPA** with **Supabase** as the sole backend.
There is no custom Node/Express/Django server. All server-side logic is handled by:

1. **Supabase Auth** — email/password authentication with JWT sessions
2. **Supabase PostgREST** — typed REST API over PostgreSQL (multi-schema)
3. **Supabase Storage** — file/media uploads (bucket: `media`)
4. **Supabase RPC** — SECURITY DEFINER database functions for privileged operations
5. **Supabase Edge Functions** — Deno runtime for server-side processing (e.g., OCR)
6. **Row Level Security (RLS)** — server-enforced access control on all tables

### Key Principle

> All "backend" logic lives in the `src/services/` layer as stateless TypeScript modules.
> Services are the **only** layer permitted to call Supabase.

---

## 2. Layered Architecture — Strict Data Flow

```
Vue Component (.vue)
    ↓ uses
Composable (useXxx.ts)          ← Vue lifecycle, storeToRefs, table columns
    ↓ uses
Pinia Store (xxxStore.ts)       ← Reactive state, UI flags, actions
    ↓ calls
Service (xxxService.ts)         ← Supabase queries, API calls (STATELESS)
    ↓ uses
Types (xxx.ts) + Helpers (xxxHelper.ts)  ← Pure functions, type defs
```

### Layer Boundaries — HARD RULES

| Rule | Enforcement |
| ---- | ----------- |
| Components → Supabase | **FORBIDDEN.** Components must go through composable → store → service. |
| Services → Vue reactivity | **FORBIDDEN.** Services must not import `ref`, `computed`, `watch`. |
| Helpers → stores/services | **FORBIDDEN.** Helpers are pure functions with zero side effects. |
| Stores → services | **ALLOWED.** Stores call services and handle toast feedback. |
| Composables → stores + services | **ALLOWED.** Composables are the orchestration glue layer. |

---

## 3. Supabase Client Configuration

### Singleton Client ([`src/lib/supabaseClient.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/lib/supabaseClient.ts))

```typescript
import type { Database } from '@/types/database.types'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
})
```

### Rules

> [!CAUTION]
> 1. **ONE Supabase client instance.** Never create additional clients except the documented admin account-creation pattern.
> 2. **Always use `VITE_` prefix** for environment variables — Vite requirement.
> 3. The client is **typed** with the auto-generated `Database` type from `src/types/database.types.ts`.

### Exception — Admin Account Creation

The [`userAccountService.createProfile()`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services/admin/userAccountService.ts#L192-L201) method creates an isolated, non-persisting client to sign up new users without disrupting the admin's own session:

```typescript
const tempClient = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: false,     // ← Does NOT overwrite admin session
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
```

This is the **ONLY** permitted second-client pattern.

---

## 4. Multi-Schema Database Access

The database uses **7 Postgres schemas**. Every Supabase query MUST specify `.schema()`:

| Schema        | Domain                                          | Example Tables                                      |
| ------------- | ----------------------------------------------- | --------------------------------------------------- |
| `public`      | Shared reference data, job postings, PSGC data   | `barangays`, `municipalities`, `job_posting`, `requirement_templates`, `document_templates` |
| `core`        | User profiles, biometrics, profile media         | `profiles`, `profile_media`, `profile_socials`, `biometrics` |
| `applicants`  | Applicant-specific data                          | `applicants`, `applicant_experiences`, `applicant_skills`, `applicant_requirements`, `applicant_requirement_media` |
| `employers`   | Company/employer data                            | `companies`, `company_members`, `employer_requirements`, `employer_requirement_media` |
| `jobs`        | Job applications, interviews, referrals          | `job_applications`, `job_application_attachments`, `job_interview_schedules`, `referrals` |
| `system`      | System-level logging and notifications           | `notifications`, `system_audit_logs` |
| `esmdd`       | PESO ESMDD programs (GIP, SPES)                  | `gip_applicants`, `gips`, `spes_applicants`, `spes` |

### Correct Usage

```typescript
// ✅ Always specify schema
supabase.schema('core').from('profiles').select('*')
supabase.schema('applicants').from('applicants').select('*')
supabase.schema('employers').from('companies').select('*')
supabase.schema('esmdd').from('gip_applicants').select('*')

// ❌ NEVER omit schema — defaults to 'public' and will query wrong table
supabase.from('profiles').select('*')
```

---

## 5. Service Layer Conventions

Services are in [`src/services/<role>/`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services).

### Service File Inventory

| Role       | Service Files |
| ---------- | ------------- |
| `common`   | [`authService.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services/common/authService.ts), [`fileUploadService.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services/common/fileUploadService.ts), [`mediaService.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services/common/mediaService.ts), `ocrVisionService.ts`, `psgc.ts`, `signupService.ts` |
| `admin`    | [`userAccountService.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services/admin/userAccountService.ts), `systemDirectoryService.ts`, `documentTemplateService.ts` |
| `applicant`| `applicantProfileService.ts`, `applicantRequirementUploadService.ts` |
| `employer` | `companyProfileService.ts` |
| `peso/provincialPeso` | `gipService.ts`, `ocrService.ts` |

### Service Pattern

```typescript
import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

export const someService = {
  async fetchAll(): Promise<SomeRow[]> {
    const { data, error } = await supabase
      .schema('schemaName')
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
> 1. Services are **stateless objects** exported as `const xxxService = { ... }`.
> 2. Services **throw errors** — stores catch them and show toast feedback.
> 3. Services MUST NOT import Vue reactivity (`ref`, `computed`, `watch`).
> 4. Always provide a human-readable error fallback string.
> 5. Always chain `.select()` after `.insert()` / `.update()` / `.upsert()` to get the returned row.
> 6. Use `.single()` when expecting exactly one row, `.maybeSingle()` when a row might not exist.

---

## 6. Pinia Store Conventions

Stores are in [`src/stores/<role>/`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/stores).

### Store Inventory

| Role       | Store Files |
| ---------- | ----------- |
| `common`   | [`auth.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/stores/common/auth.ts), [`fileUploadStore.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/stores/common/fileUploadStore.ts), `signupStore.ts` |
| `admin`    | `userAccountsStore.ts`, `systemDirectoryStore.ts`, `documentTemplateStore.ts` |
| `applicant`| `profileStore.ts` |
| `employer` | _(empty — uses composables directly)_ |
| `peso/provincialPeso` | _(uses composables directly)_ |

### Setup Store Pattern (REQUIRED)

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToastAlert } from '@/composables/common/useToastAlert'

export const useSomeStore = defineStore('storeName', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const items = ref<SomeType[]>([])
  const isLoading = ref(false)
  const isSubmitting = ref(false)

  // ─── UI Flags ───
  const isDetailsOpen = ref(false)
  const isAddOpen = ref(false)

  // ─── Actions ───
  const fetchItems = async () => {
    isLoading.value = true
    try {
      items.value = await someService.fetchAll()
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  return { items, isLoading, isDetailsOpen, fetchItems }
})
```

### Rules

> [!IMPORTANT]
> 1. **All new stores** use the setup syntax `defineStore('name', () => { ... })`.
> 2. **Exception**: `fileUploadStore.ts` uses Options API — do NOT convert it.
> 3. Toast feedback via `useToastAlert()` for all success/error operations.
> 4. UI modal/sheet state (`isAddOpen`, `isDetailsOpen`) lives in the **store**, not components.
> 5. After mutations, invalidate cache: `removePersistentCacheValue(CACHE_KEY)`.
> 6. When updating arrays: reassign with new reference (`items.value = [...newItems]`) for TanStack Table reactivity.

---

## 7. Composable Conventions

Composables are in [`src/composables/<role>/`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/composables).

### Pattern

```typescript
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSomeStore } from '@/stores/<role>/someStore'

export function useSomething() {
  const store = useSomeStore()
  const { items, isLoading } = storeToRefs(store)        // reactive state
  const { fetchItems, createItem } = store                // actions (non-reactive)

  // TanStack Table column definitions go HERE

  onMounted(() => {
    fetchItems()
  })

  return { items, isLoading, fetchItems, createItem }
}
```

### Rules

> [!IMPORTANT]
> 1. Use `storeToRefs()` for reactive state, destructure actions directly from the store.
> 2. `onMounted` data fetching belongs in the composable, not the component.
> 3. TanStack Vue Table column definitions live in the composable.
> 4. Composable names: `useXxx` pattern.

---

## 8. Authentication Flow

### Auth Store ([`src/stores/common/auth.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/stores/common/auth.ts))

The auth store manages the complete authentication lifecycle:

```
┌─────────────────────────────────────────────────┐
│  init()                                         │
│  1. supabase.auth.getSession()                  │
│  2. syncSessionData(session)                    │
│     ├── hydrateUserData(userId)                 │
│     │   └── authService.fetchUserBundle(userId)  │
│     │       ├── fetchProfile (core.profiles)     │
│     │       ├── fetchApplicant (applicants)       │
│     │       ├── fetchEmployer (employers)         │
│     │       ├── experiences, skills, requirements │
│     │       └── profileMedia                      │
│     └── set profile, applicantProfile, etc.     │
│  3. onAuthStateChange listener                  │
│     ├── SIGNED_IN → force hydrate               │
│     ├── TOKEN_REFRESHED → update session only   │
│     └── INITIAL_SESSION → update session only   │
└─────────────────────────────────────────────────┘
```

### Key Behaviors

- **`init()`** is called in the router `beforeEach` guard — do NOT call elsewhere unless force-hydrating
- **`TOKEN_REFRESHED`** and **`INITIAL_SESSION`** events are intentionally skipped for re-hydration to prevent re-renders when tab is re-focused
- **`hydrateUserData()`** fetches the complete user bundle in a single `Promise.all` — profile + role-specific data + media
- **Guard deduplication**: `isInitialized` flag prevents redundant init calls

### Auth Service ([`src/services/common/authService.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services/common/authService.ts))

Core methods:
- `login(credentials)` — `supabase.auth.signInWithPassword()`
- `logout()` — `supabase.auth.signOut()`
- `fetchProfile(userId)` — reads from `core.profiles`
- `fetchUserBundle(userId)` — parallel fetch of all role-specific data
- `fetchSubmittedRequirements(profileId)` — applicant document verification
- `loadVerificationTemplates()` — requirement templates from `public` schema

---

## 9. Persistent Caching Pattern

For read-heavy data, use [`localStorage`-backed caching](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/helpers/common/persistentCache.ts):

### API

| Function                        | Purpose                                         |
| ------------------------------- | ----------------------------------------------- |
| `getOrSetPersistentCache(key, ttl, loader)` | Return cached value or execute loader & cache result |
| `getPersistentCacheValue<T>(key)` | Read cached value (returns `null` if expired)  |
| `removePersistentCacheValue(key)` | Invalidate a cache entry                       |

### Behavior

- **TTL-based expiry** — each entry stores an `expiresAt` timestamp
- **Request deduplication** — pending requests are tracked in a `Map` to prevent thundering herd
- **Graceful degradation** — silently ignores localStorage failures (quota exceeded, disabled)

### Usage Pattern

```typescript
// In a service — stale-while-revalidate
const cached = getPersistentCacheValue<SomeType[]>(CACHE_KEY)
if (cached) items.value = cached  // show stale data immediately

const fresh = await getOrSetPersistentCache(CACHE_KEY, TTL_MS, async () => {
  return await someService.fetchAll()
})

// After mutations — invalidate
removePersistentCacheValue(CACHE_KEY)
```

### Existing Cache Keys

| Cache Key                          | TTL     | Used By                     |
| ---------------------------------- | ------- | --------------------------- |
| `admin:user-accounts:profiles`     | 15 min  | `userAccountService`        |

---

## 10. File Upload System

### Architecture

```
┌──────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│ fileUploadStore   │───▶│ fileUploadService     │───▶│ mediaService          │
│ (Options API)     │    │ (simulated + real)    │    │ (Supabase Storage)   │
│ Queue management  │    │ Progress tracking     │    │ Upload + public URLs │
│ Abort support     │    │ Abort support         │    │ Media DB records     │
└──────────────────┘    └──────────────────────┘    └──────────────────────┘
```

### Media Service ([`src/services/common/mediaService.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services/common/mediaService.ts))

- **Bucket**: `media` (default)
- `uploadToStorage(file, path, bucket)` — upsert to Supabase Storage
- `getPublicUrl(path, bucket)` — generates public URL (handles absolute URL passthrough)
- `saveMediaRecord(data)` — inserts into `core.profile_media`
- `fetchMediaByProfileId(profileId)` — fetches user's media records

### File Upload Service ([`src/services/common/fileUploadService.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services/common/fileUploadService.ts))

- `simulateUpload()` — fake progress for demo/UX (0→90→100 over configurable duration)
- `executeUpload()` — calls real executor or falls back to simulation
- Supports `AbortSignal` for cancellation

### File Upload Store

> [!WARNING]
> The `fileUploadStore.ts` is the **ONLY** store using Options API. Do NOT convert it.

---

## 11. Supabase RPC Functions

For operations that need to bypass RLS, the project uses `SECURITY DEFINER` database functions called via `.rpc()`:

| Function             | Schema | Purpose                                    |
| -------------------- | ------ | ------------------------------------------ |
| `get_user_emails`    | `core` | Fetch all user emails from `auth.users`     |
| `check_if_email_exists` | `public` | Check email uniqueness during signup     |

### Usage

```typescript
// RPC calls require schema cast for cross-schema functions
const { data } = await (supabase.schema('core') as any).rpc('get_user_emails')
```

---

## 12. Edge Functions

Located in [`supabase/functions/`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/supabase/functions):

| Function       | Purpose                              |
| -------------- | ------------------------------------ |
| `process-ocr`  | Server-side OCR processing for document scanning |

### Database Migrations

Located in [`supabase/migrations/`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/supabase/migrations):

| Migration                | Purpose                     |
| ------------------------ | --------------------------- |
| `001_ocr_setup.sql`      | OCR infrastructure setup    |

---

## 13. External API Access

**axios** is used for external APIs only. All Supabase calls use the Supabase JS client.

Current external API integrations:
- **Mapbox GL** — geocoding and map tiles
- **PSGC API** — Philippine Standard Geographic Code lookups
- **OCR services** — document text extraction (via Tesseract.js client-side + Edge Functions server-side)

### Rules

> [!IMPORTANT]
> 1. **NEVER use axios for Supabase calls** — always use the typed Supabase client.
> 2. axios is for third-party REST APIs only.

---

## 14. Type Generation

Database types are auto-generated from the live Supabase schema:

```bash
npm run types:gen
```

This executes:
```bash
npx supabase gen types typescript \
  --project-id otixooaxfcvjgrlaxihj \
  --schema public --schema core --schema employers \
  --schema applicants --schema jobs --schema system --schema esmdd \
  > src/types/database.types.ts
```

### Rules

> [!CAUTION]
> 1. **NEVER manually edit** `src/types/database.types.ts`.
> 2. After any database schema change, regenerate types with `npm run types:gen`.
> 3. All domain types MUST derive from `Database['schema']['Tables']['table']['Row']`.

---

## 15. Error Handling Pattern

```
Service layer:     throw new Error(error.message || 'Human-readable fallback')
    ↑
Store layer:       try/catch → toastAlert.error('Title', error.message)
    ↑
Composable layer:  Transparent — errors handled by store
    ↑
Component layer:   Displays loading/error states via reactive refs from store
```

### Rules

> [!IMPORTANT]
> 1. Services **throw** errors — they never show UI feedback.
> 2. Stores **catch** errors and show toasts via `useToastAlert()`.
> 3. Always set `isLoading = false` in `finally` blocks.
> 4. Console errors use `console.error()` for debugging — never `console.log()` for errors.

---

## 16. Feature Creation Checklist

When creating a new feature, create files in ALL relevant layers:

```
1. src/types/<role>/featureName.ts         ← Types (Row, Insert, payload interfaces)
2. src/helpers/<role>/featureNameHelper.ts  ← Pure helper functions
3. src/services/<role>/featureNameService.ts ← Supabase queries
4. src/stores/<role>/featureNameStore.ts    ← Pinia store (setup syntax)
5. src/composables/<role>/useFeatureName.ts ← Vue composable (storeToRefs, onMounted)
6. src/components/<role>/FeatureName.vue    ← Vue component
7. src/router/routes/<Role>/role.ts        ← Route entry (lazy-loaded)
```

> [!IMPORTANT]
> Never skip layers. Never place admin logic in `applicant/`, or vice versa.
