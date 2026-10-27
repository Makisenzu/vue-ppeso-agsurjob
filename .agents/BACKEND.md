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
| `esmdd`       | PESO ESMDD programs (GIP, SPES)                  | `gip_applicants`, `gips`, `spes` |

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
| `common`   | [`authService.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services/common/authService.ts), [`fileUploadService.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services/common/fileUploadService.ts), [`mediaService.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services/common/mediaService.ts), `ocrVisionService.ts`, `psgc.ts`, `signupService.ts`, `siteContentService.ts` |
| `admin`    | [`userAccountService.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services/admin/userAccountService.ts), `systemDirectoryService.ts`, `documentTemplateService.ts` |
| `applicant`| `applicantProfileService.ts`, `applicantRequirementUploadService.ts` |
| `employer` | `companyProfileService.ts` |
| `peso/provincialPeso` | `gipService.ts`, `ocrService.ts`, `siteContentManagerService.ts` |

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
| `common`   | [`auth.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/stores/common/auth.ts), [`fileUploadStore.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/stores/common/fileUploadStore.ts), `signupStore.ts`, `siteContentStore.ts` |
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
| `admin:system-directory:records`   | 15 min  | `systemDirectoryService`    |
| `document-templates:list`          | 12 hrs  | `documentTemplateService`   |
| `peso:applicant-entry:applicants`  | 15 min  | `applicantEntryService`     |
| `peso:gip:interns`                 | 15 min  | `gipService`                |
| `peso:gip:applicants`              | 15 min  | `gipService`                |
| `peso:gip:yearly-demographics`     | 15 min  | `gipService`                |
| `peso:gip:lpii-interns`            | 15 min  | `gipService`                |
| `peso:gip:lpii-applicants`         | 15 min  | `gipService`                |

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
> If the feature changes a status, decision or assignment that a user should hear about, also add its
> notification trigger (§17).

---

## 17. Notifications — Every User-Facing Activity Must Notify

Every activity that changes something a user needs to know about **must** create a personal notification
(`system.notifications`) for that user. Examples: account status, document review, program application
review (SPES / TUPAD / GIP), deployments, company / establishment verification, recruitment activity status,
and — once built — job application stages, interview schedules and referral outcomes.

### How

> [!IMPORTANT]
> 1. **Write notifications in a database trigger, never from the client.** Add an `AFTER INSERT / UPDATE OF <column>`
>    trigger in a new migration (pattern: `supabase/migrations/053_notification_triggers.sql`). A trigger fires
>    for every code path (UI, RPC, SQL editor, other triggers such as 030/031 auto-verify), so no caller can forget it.
> 2. **Call `system.notify(recipient, type, title, message, remarks)`** — the only writer (`remarks` optional). It skips a NULL recipient
>    (registry applicants without an account) and changes made by the recipient themself.
> 3. Trigger functions are `SECURITY DEFINER` with `SET search_path = ''`; resolve recipients with
>    `system.applicant_profile_id(applicants.id)` / `system.company_profile_id(companies.id)`.
>    Never grant `system.notify` to `authenticated` — it would let any user message anyone.
> 4. Only notify on a real change (`OLD.x IS NOT DISTINCT FROM NEW.x` → return).
>    Staff-only statuses are not user-facing: **Hired / Deployed / Completed / Resigned** never notify the applicant
>    on any program — GIP `gip_applicants` / `gip_appointments` (063), SPES `spes_appointments` and TUPAD `tupad`
>    (064). Check with `system.is_staff_only_program_status(NEW.status)` in new program triggers.
> 5. Messages are plain sentences for the end user ("Your SPES application has been approved."), include
>    never expose internal IDs. Staff remarks go in the `remarks` argument (wrap with
>    `system.status_remarks(status, remarks)`), **never appended to the message** — the app shows them in a
>    separate Remarks box (migration 057).
> 8. **Rejected / Cancelled always need remarks.** Every status control that can reject or cancel shows a
>    required Remarks field (zod forms: `.superRefine(refineStatusRemarks)`; plain dialogs: `useStatusRemarks`),
>    and the service calls `assertStatusRemarks(status, remarks)` before writing. Store them in the table's
>    review-remarks column (`status_remarks` where `remarks` means something else — migrations 055 / 058).
>    Check what an existing `remarks` column holds before writing to it: on `applicant_requirements` it is the
>    document's name, and overwriting it broke the profile stepper (fixed by 058).
> 6. Use an existing `type` or add a new one to **both** `NotificationType` (`src/types/common/notification.ts`)
>    and `TYPE_META` (`src/helpers/common/notificationHelper.ts`) so it gets a label and icon.
> 7. Add the event to the "Notified events" table in the migration header and to `.agents/DATABASE.md` §9.

The UI needs no changes per event: `NotificationBell.vue` (every role's header) and `NotificationCenter.vue`
(each role's `…-notifications` route) read `system.notifications` through
`useNotifications` → `notificationStore` → `notificationService`.

---

## 18. Applications — Reuse What the Applicant Already Gave Us

Every application flow — PESO programs (GIP, SPES, TUPAD, FNPLP, Skills Training) and job vacancies —
follows the GIP application (`ApplicantGipApplicationForm.vue`, `useGipApplicationForm.ts`). The applicant
should only ever upload a document once.

> [!IMPORTANT]
> 1. **NSRP is generated, never uploaded.** Build it from the registry record with
>    `generateNsrpFormPdfFile` (`nsrpTemplateHelper.ts`), attach it automatically, and let the applicant view,
>    remove or generate it again.
> 2. **Profile documents fill in automatically — by document type, never by file name.** Each program keeps a
>    `<PROGRAM>_PROFILE_DOCUMENT_MATCHES` map (requirement → profile document types; see
>    `GIP_PROFILE_DOCUMENT_MATCHES` in `src/types/common/gipProgram.ts`). Profile document types are the
>    `applicant_requirements` rows of `public.requirement_templates`: required `REQUIRED_UPLOAD_ORDER`
>    (Application Form, Resume, Birth Certificate) and optional `OPTIONAL_PROFILE_DOCUMENTS` (TOR/Diploma,
>    Certificates — migration 065). Only map documents that mean the same thing (Application Form is not an
>    Application Letter). A requirement that applicants keep re-uploading is a missing profile document type:
>    add it as an optional template instead of guessing.
> 3. **Everything else is one click away.** Every requirement without a match offers "My documents"
>    (`listReusableProfileDocuments` in `applicantRequirementDocuments.ts`) next to Upload. Filter by the
>    program's accepted file types (GIP: PDF only).
> 4. **Copy on submit, never link.** Reused files are copied into the uploader's folder of the documents bucket
>    (`gipDocumentService.uploadDocuments`, `reused`), so deleting one never breaks the other.
> 5. **Same layout:**
>    - the program page only shows the requirements and links to the form ("Apply now" / "View my application");
>    - the form is a stepper: Your details → Requirements → Review & submit;
>    - after submitting: a read-only progress tracker, the application details (reference no., date applied,
>      last updated, applied through), the applicant's NSRP details, the requirements and any deployments.
> 6. **Editable until reviewed.** Upload, view and remove stay open while the application is Pending and not yet
>    deployed; RLS enforces the same rule (`can_edit_own_<program>_application`, see migration 060). An uploaded
>    file ticks the document in both the application's checklist and the registry's `documents_submitted` (062).
> 7. **Notify (§17).** New applications notify the program's staff; status changes notify the applicant except
>    staff-only statuses (`system.is_staff_only_program_status`, migration 064).
> 8. **List it on Application Status.** Every program or vacancy application appears on the applicant's
>    Application Status page (route `application`): read its rows in `applicationStatusService` and map them in
>    `toApplicationSummaries` (`applicationStatusHelper.ts`) with a reference no., dates, stage and link.

---

## 19. Province-Wide Scale — Build Every Screen for the Whole Province

AGSURJOBS serves all of Agusan del Sur (≈740,000 residents). Size every query for the province, not for test data:

| Data | Plan for |
| ---- | -------- |
| Accounts (`core.profiles`), registry applicants (`applicants.applicants`) | 150,000+ |
| Requirement files / media rows, skills, notifications | 1,000,000+ |
| GIP / SPES / TUPAD applications | tens of thousands per year, thousands at once in an application season |

The Applicant Master Registry is the model to copy: `applicants.search_applicant_registry` (migration 035) filters, searches
and sorts in SQL, the service pages it with `.range()` and `{ count: 'exact' }`, and `applicant_registry_stats` returns the
totals — the browser never holds more than one page.

> [!CAUTION]
> 1. **Unbounded tables are paged on the server.** A list of accounts, registry applicants, files, skills, notifications,
>    job applications or audit logs searches, filters and sorts in SQL (an RPC or view) and loads one page with `.range()`.
>    `fetchAllPages` / `fetchAllInChunks` are only for **bounded** sets: one program round or year, one batch, one
>    applicant's own rows, or reference data — and only while the set stays under ~5,000 rows.
> 2. **Counts, totals, charts and maps come from SQL** (`count(*)`, `GROUP BY` in an RPC like `applicant_registry_stats`),
>    never from loading rows and counting them in the browser. Use `{ count: 'estimated' }` past ~100,000 rows.
> 3. **Select only the columns the screen shows.** No `select('*')` on lists; leave JSON columns (education, work history)
>    and long text out of list queries and load them in the detail view.
> 4. **Index what you filter, sort and join on.** Every column in a list query's `WHERE` / `ORDER BY` and every foreign key
>    gets an index in the same migration; text search uses a `pg_trgm` GIN index. RLS helpers wrap `auth.uid()` as
>    `(SELECT auth.uid())` so Postgres evaluates it once per query, not once per row.
> 5. **No request per row.** Bulk changes go through one RPC or one bulk `insert` / `upsert`; `.in()` lookups go through
>    `fetchAllInChunks`. Sign storage URLs in one `createSignedUrls` call, only for the rows on screen.
> 6. **Search waits for typing to stop** (debounce ~300 ms) and cancels stale requests; never query on every keystroke.
> 7. **Heavy client work loads on demand.** PDF / OCR / map / chart libraries are `import()`-ed when used (like the NSRP
>    template); routes stay lazy-loaded. No polling faster than every 30 s — prefer filtered Realtime subscriptions.
> 8. **Uploads stay small.** Keep the per-file limits (10 MB) and file-type checks; images can be resized before upload.
>
> **Known full-table loads to migrate** to the registry pattern before the data grows: the admin user accounts list
> (`userAccountService.fetchAllProfiles`: every profile and profile picture), the system directory
> (`systemDirectoryService`), the skill repository (`skillRepositoryService`: every `applicant_skills` row), the admin
> geographic map (`useGeographicMap`), and the GIP priority score list (`gipService`, `gip_applicant_priority_scores`).
