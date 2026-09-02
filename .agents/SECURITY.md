# AGSURJOBS — Security Agent

> **Purpose**: This document defines all security policies, authentication rules, access control patterns,
> and data protection requirements for the AGSURJOBS project.
> Any AI agent must follow these rules to prevent security vulnerabilities.

---

## 1. Security Architecture Overview

AGSURJOBS uses a **defense-in-depth** security model with multiple enforcement layers:

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1: Client-Side Route Guard (Vue Router)           │
│  → Prevents UI access to unauthorized routes             │
├──────────────────────────────────────────────────────────┤
│  Layer 2: Supabase Auth (JWT)                            │
│  → Session management, token refresh, email verification │
├──────────────────────────────────────────────────────────┤
│  Layer 3: Row Level Security (RLS)                       │
│  → PostgreSQL policies enforce data access per user/role │
├──────────────────────────────────────────────────────────┤
│  Layer 4: SECURITY DEFINER Functions                     │
│  → Privileged server-side operations (bypasses RLS)      │
├──────────────────────────────────────────────────────────┤
│  Layer 5: Schema Isolation                               │
│  → Multi-schema separation of concerns                   │
└──────────────────────────────────────────────────────────┘
```

> [!CAUTION]
> **Client-side route guards are a UX convenience, NOT a security boundary.**
> The real security enforcement is Row Level Security (RLS) on the database.
> Never rely solely on client-side checks for data protection.

---

## 2. Authentication

### 2.1 Auth Provider

- **Supabase Auth** with email/password authentication
- JWT-based sessions stored in `localStorage` (managed by Supabase JS client)
- Auto-refresh tokens enabled (`autoRefreshToken: true`)
- Session persistence enabled (`persistSession: true`)

### 2.2 Session Management

The auth store ([`src/stores/common/auth.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/stores/common/auth.ts)) handles:

| Event                | Action                                           |
| -------------------- | ------------------------------------------------ |
| `SIGNED_IN`          | Force hydrate user data (full bundle fetch)       |
| `SIGNED_OUT`         | Clear all session data                            |
| `TOKEN_REFRESHED`    | Update session/user refs only — NO re-hydration   |
| `INITIAL_SESSION`    | Update session/user refs only — NO re-hydration   |

### 2.3 Auth State Listener Optimization

```typescript
supabase.auth.onAuthStateChange(async (event, newSession) => {
  if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
    // Silently update the session token without re-hydrating user data
    session.value = newSession
    user.value = newSession?.user ?? null
    return
  }

  const shouldForceHydrate = event === 'SIGNED_IN'
  await syncSessionData(newSession, shouldForceHydrate)
})
```

> [!IMPORTANT]
> `TOKEN_REFRESHED` fires on tab re-focus. Without this guard, users would experience unnecessary loading states every time they alt-tab back to the application.

### 2.4 Auth Initialization

- `init()` is called **exclusively** in the router `beforeEach` guard
- Uses an `isInitialized` flag to prevent redundant initialization
- Uses an `isAuthListenerBound` flag to prevent duplicate event listeners

### Rules

> [!CAUTION]
> 1. **NEVER call `authStore.init()` outside the router guard** unless explicitly force-hydrating.
> 2. **NEVER create multiple auth state listeners** — the `isAuthListenerBound` flag prevents this.
> 3. **NEVER store session tokens manually** — Supabase handles persistence.

---

## 3. Route-Level Access Control

### 3.1 Navigation Guard ([`src/router/index.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/router/index.ts))

The global `beforeEach` guard enforces three rules:

```
1. Authentication Check:
   route.meta.requiresAuth === true  &&  !isAuthenticated  →  redirect to /login

2. Authenticated User Accessing Public Routes:
   isAuthenticated  &&  (path = '/', '/login', '/signup')  →  redirect to role dashboard

3. Role Enforcement:
   route.meta.role !== userRole  →  redirect to correct role dashboard
```

### 3.2 Role-to-Dashboard Mapping

```typescript
function getDashboardRouteForRole(role: string | null) {
  switch (role) {
    case 'admin':           return { name: 'admin-dashboard' }
    case 'company_owner':
    case 'employer':        return { name: 'employer-dashboard' }
    case 'provincial_peso': return { name: 'provincial-peso-dashboard' }
    case 'municipal_peso':  return { name: 'municipal-peso-dashboard' }
    case 'peso_staff':      return { name: 'provincial-peso-dashboard' }
    case 'applicant':
    default:                return { name: 'dashboard' }
  }
}
```

### 3.3 Route Meta Configuration

Every authenticated route **MUST** have these meta fields:

```typescript
meta: {
  requiresAuth: true,    // REQUIRED — enables auth check
  role: 'admin',         // REQUIRED — enables role enforcement
  breadcrumb: false,     // Optional — breadcrumb display control
}
```

### 3.4 Route Prefix Isolation

| Role              | Path Prefix        | Enforced `meta.role`   |
| ----------------- | ------------------ | ---------------------- |
| Admin             | `/admin`           | `'admin'`              |
| Applicant         | `/app`             | `'applicant'`          |
| Employer          | `/employer`        | `'company_owner'`      |
| Provincial PESO   | `/provincial-peso` | `'provincial_peso'`    |
| Municipal PESO    | `/municipal-peso`  | `'municipal_peso'`     |

### Rules

> [!CAUTION]
> 1. **NEVER remove or weaken the `beforeEach` guard.** All role-based access control depends on it.
> 2. **NEVER add routes without `meta.requiresAuth: true`** for authenticated pages.
> 3. **NEVER add routes without `meta.role`** for role-specific pages.
> 4. **NEVER add admin routes to `applicant.ts`**, or vice versa.
> 5. **Infinite redirect prevention**: The guard checks `to.name !== fallbackRoute` before redirecting.

---

## 4. Row Level Security (RLS)

### 4.1 Principle

RLS is enforced **server-side** by PostgreSQL. Every table has RLS policies that:
- Restrict `SELECT` to the authenticated user's own data (or role-appropriate data)
- Restrict `INSERT`, `UPDATE`, `DELETE` based on ownership and role

### 4.2 Client Code Implications

```typescript
// ✅ Correct — RLS will filter results automatically
const { data } = await supabase
  .schema('applicants')
  .from('applicants')
  .select('*')
  .eq('profile_id', userId)

// ❌ WRONG assumption — client code cannot bypass RLS
// Even if you remove the .eq() filter, RLS policies will restrict results
```

### 4.3 Bypassing RLS for Admin Operations

When admin operations need access to data across all users (e.g., listing all profiles), use `SECURITY DEFINER` database functions via `.rpc()`:

```typescript
// Fetches all user emails — only works because the DB function is SECURITY DEFINER
const { data: emailRows } = await (supabase.schema('core') as any).rpc('get_user_emails')
```

### Available RPC Functions

| Function                | Schema   | Purpose                               | Security |
| ----------------------- | -------- | ------------------------------------- | -------- |
| `get_user_emails`       | `core`   | Read emails from `auth.users`          | DEFINER  |
| `check_if_email_exists` | `public` | Check email existence during signup    | DEFINER  |

### Rules

> [!CAUTION]
> 1. **NEVER assume client code can bypass RLS** — it cannot.
> 2. **NEVER create database functions with `SECURITY DEFINER`** without explicit approval — they bypass all RLS.
> 3. **Always test with a non-admin user** to verify RLS policies work correctly.
> 4. For new admin-only queries that need cross-user access, create a `SECURITY DEFINER` function in the database.

---

## 5. Credential & Secret Management

### 5.1 Environment Variables

All secrets are stored in `.env` and loaded via Vite's `import.meta.env`:

| Variable                        | Purpose                    | Prefix Required |
| ------------------------------- | -------------------------- | --------------- |
| `VITE_SUPABASE_URL`             | Supabase project URL        | Yes (`VITE_`)   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key   | Yes (`VITE_`)   |

### 5.2 Key Security Rules

> [!CAUTION]
> 1. **NEVER commit `.env` to git.** It is in `.gitignore`.
> 2. **NEVER expose the `service_role` key** in client-side code — only the `anon`/publishable key.
> 3. **All client-side env vars MUST use `VITE_` prefix** — Vite only exposes prefixed vars to the client bundle.
> 4. **NEVER hardcode API keys, URLs, or secrets** in source code.
> 5. **NEVER store passwords, tokens, or secrets in Pinia state** or `localStorage`.
> 6. The `VITE_SUPABASE_PUBLISHABLE_KEY` is the **anon key** — it is safe for client-side use because RLS restricts what it can access.

---

## 6. Password Security

### 6.1 Password Strength Validation ([`src/helpers/common/password.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/helpers/common/password.ts))

Passwords are validated client-side before submission:

| Requirement           | Rule                                |
| --------------------- | ----------------------------------- |
| **Minimum length**    | 15 characters                       |
| **Character diversity** | Uppercase, lowercase, digits, special chars |
| **Strength scoring**  | 5-point scale (1-2: Weak, 3: Medium, 4: Strong, 5: Very Strong) |

### 6.2 Admin Account Creation Security

When admins create new user accounts ([`userAccountService.createProfile()`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services/admin/userAccountService.ts#L192-L281)):

1. A **temporary Supabase client** is created with `persistSession: false`
2. This prevents the admin's own session from being overwritten
3. The temp client calls `signUp()` → creates the auth user
4. The main client then upserts the profile into `core.profiles`

```
Admin session ──────────────────────────────────── unaffected
                   ↓
Temp client (no persist) ── signUp() ── creates auth.users row
                   ↓
Main client ── upsert core.profiles ── creates profile row
```

### Rules

> [!IMPORTANT]
> 1. **Password is NEVER stored in Pinia state** — it is only held in the form and sent to Supabase Auth.
> 2. **Password is NEVER logged** — not even in error messages.
> 3. The temporary client pattern is the **ONLY** valid second-client pattern.

---

## 7. Data Access Patterns by Role

### 7.1 User Roles

Defined in `core.Enums.user_role`:

| Role              | Code              | Access Scope                        |
| ----------------- | ----------------- | ----------------------------------- |
| Admin             | `admin`           | All profiles, all schemas, user management |
| Applicant         | `applicant`       | Own profile, own applications, own documents |
| Company Owner     | `company_owner`   | Own company, company members, job postings |
| Company Member    | `company_member`  | Company data (read), assigned tasks  |
| Provincial PESO   | `provincial_peso` | Province-wide data, GIP/SPES programs |
| Municipal PESO    | `municipal_peso`  | Municipality-scoped data             |
| DOLE              | `dole`            | Reserved / not yet implemented       |

### 7.2 Role-Based Directory Isolation

Code for each role is strictly isolated into role-based subdirectories:

```
src/services/admin/       ← Admin-only service code
src/services/applicant/   ← Applicant-only service code
src/services/employer/    ← Employer-only service code
src/services/peso/        ← PESO-only service code
src/services/common/      ← Shared across 2+ roles
```

> [!CAUTION]
> **NEVER place admin logic in `applicant/`**, employer logic in `admin/`, etc.
> Each role's code is segregated to prevent accidental cross-role data access patterns.

---

## 8. Input Validation

### 8.1 Client-Side Validation

- **Forms**: `vee-validate` + `zod` schemas provide type-safe validation
- **Passwords**: Custom strength checker ([`password.ts`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/helpers/common/password.ts))
- **File uploads**: MIME type and size validation before upload

### 8.2 Server-Side Validation

- **RLS policies**: Enforce data ownership and role-based access
- **Database constraints**: NOT NULL, CHECK, UNIQUE, FOREIGN KEY constraints
- **SECURITY DEFINER functions**: Validate inputs before privileged operations

### Rules

> [!IMPORTANT]
> 1. **NEVER rely solely on client-side validation** — it can be bypassed.
> 2. **Always validate critical inputs server-side** via RLS policies or database functions.
> 3. Use `zod` schemas for structured form validation.

---

## 9. Storage Security

### 9.1 Supabase Storage

- **Bucket**: `media`
- **Upload method**: `upsert: true` (overwrites existing files at same path)
- **Public URLs**: Generated via `supabase.storage.from(bucket).getPublicUrl(path)`

### 9.2 File Path Normalization

The [`mediaService`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/services/common/mediaService.ts) normalizes storage paths:

```typescript
function normalizeStoragePath(filePath: string) {
  return decodeURIComponent(filePath)
    .replace(/^\/+|\/+$/g, '')   // trim leading/trailing slashes
    .replace(/\/+/g, '/')        // collapse double slashes
}
```

### Rules

> [!IMPORTANT]
> 1. **Always normalize file paths** before storage operations to prevent path traversal.
> 2. **Never construct storage paths from raw user input** without sanitization.
> 3. Storage bucket policies should restrict access based on user ID prefixes in file paths.

---

## 10. Audit Logging

The `system` schema contains an audit log table:

```
system.system_audit_logs
├── id (serial)
├── user_id (uuid)
├── action (text)
├── table_name (text)
├── record_id (text)
├── old_values (jsonb)
├── new_values (jsonb)
├── ip_address (text)
└── created_at (timestamp)
```

This table is designed for database-trigger-based logging of sensitive operations.

---

## 11. Notification Security

Notifications are stored in `system.notifications`:

```
system.notifications
├── id (serial)
├── recipient_id (uuid)  ← RLS should filter by authenticated user
├── title (text)
├── message (text)
├── type (text)
├── is_read (boolean)
└── created_at (timestamp)
```

Notification types: `application_status`, `interview_alert`, `referral_update`, `compliance_alert`, `system_announcement`.

---

## 12. Security Checklist for New Features

When implementing a new feature, verify:

- [ ] Route has `meta.requiresAuth: true` and `meta.role` set
- [ ] Service specifies `.schema()` on every Supabase query
- [ ] No hardcoded credentials or API keys in source code
- [ ] No sensitive data stored in Pinia state or localStorage
- [ ] RLS policies exist on new tables (verify with non-admin user)
- [ ] File paths are sanitized before storage operations
- [ ] Error messages do not leak sensitive information (e.g., internal IDs, schema names)
- [ ] Form inputs are validated with zod schemas
- [ ] Toast messages are generic for error cases (no stack traces shown to users)
- [ ] Admin operations that bypass RLS use SECURITY DEFINER functions via `.rpc()`
