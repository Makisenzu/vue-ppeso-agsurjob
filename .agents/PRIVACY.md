# AGSURJOBS — Privacy Agent (Data Privacy Act of 2012)

> **Purpose**: AGSURJOBS processes the personal and sensitive personal information of job seekers across Agusan del Sur.
> The **Data Privacy Act of 2012 (Republic Act No. 10173)**, its Implementing Rules and Regulations (IRR), and the
> circulars of the **National Privacy Commission (NPC)** apply to every line of code that touches that data.
> This document turns those obligations into rules an AI agent must follow. Read it for **any** task that collects,
> shows, stores, shares, exports, logs or deletes personal data — together with [`SECURITY.md`](SECURITY.md).
>
> This is an engineering rulebook, not legal advice. When a rule here and the law disagree, the law wins: stop and ask
> the user to check with the Data Protection Officer (DPO).

---

## 0. The Hard Rules

> [!CAUTION]
> Violating any of these is a release blocker.
>
> 1. **No new personal data field without a purpose.** Every column, form field or upload that holds personal data
>    must serve a purpose already listed in the Privacy Notice (`usePrivacyNotice.ts`). A new purpose or a new
>    category of data means updating the notice **and** bumping its version (§3.3). *(Sec. 11(a)–(c), proportionality)*
> 2. **Sensitive personal information needs consent or a law.** Age, civil status, religion, health / disability,
>    education, government IDs (TIN, SSS, PhilHealth, ...), and anything about 4Ps / OFW status are sensitive (Sec. 3(l)).
>    They are processed only under the `sensitive_personal_information` consent or a law that requires them (Sec. 13).
> 3. **Biometrics need their own consent.** Never write `core.biometrics` (face data) or any other biometric without a
>    current, unwithdrawn `biometrics` consent. The database trigger `trg_biometrics_require_consent` (migration 073)
>    enforces it; don't work around it.
> 4. **Applicant files are never public.** Requirement files, IDs, TORs, birth certificates and OCR scans live in private
>    buckets (`documents`, `applicant-forms`, `recruitment-activity-documents`) and open only through short-lived signed
>    URLs (`usePrivateDocuments` / `useSignedDocumentUrls`, `createSignedUrls`). **Never call `getPublicUrl` on them,
>    never set those buckets `public`, never store a file URL in the database.** *(Sec. 20)*
> 5. **Every change to someone else's personal data is audited.** New tables holding personal data get the
>    `trg_audit_personal_data` trigger (§5.1). Screens where staff open one person's full record, or export a list,
>    call `privacyService.logPersonalDataAccess` (§5.2). *(Sec. 20(c), 21; NPC Circular 16-01)*
> 6. **The audit log holds no personal data values.** Log *who*, *what record*, *which fields*, *when* — never the old or
>    new values. `system.system_audit_logs` is append-only: no client insert / update / delete, ever.
> 7. **Data subjects can always exercise their rights.** Never remove or hide Privacy & My Data, Download my data, the
>    request queue, or the account-deletion path. A new table that holds a person's data must be reachable by
>    `core.export_my_data()` (§6.2) and removed by `core.admin_delete_account()` (§6.3).
> 8. **Nothing personal leaves the portal unannounced.** Sending personal data to a new third party (API, AI model,
>    analytics, email/SMS provider, another agency) requires: a processing agreement, a line in the Privacy Notice's
>    "Who we share it with", and a version bump. *(Sec. 14, 21, IRR Sec. 43–45)*
> 9. **No personal data in logs, URLs, analytics or AI prompts you don't control.** No names, emails, birth dates or IDs in
>    `console.*`, query strings, route params beyond opaque UUIDs, error messages, or third-party scripts.
> 10. **Keep only what you need, only as long as you need it.** Every new category of data gets a retention period in
>     `system.retention_policies` or a written reason why the government records schedule governs it (§7).

---

## 1. Roles and Responsibilities

| Role (law)                                   | In AGSURJOBS                                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Personal Information Controller (PIC)         | Provincial Government of Agusan del Sur, through the Provincial PESO                                |
| Data Protection Officer (DPO)                 | Designated by the PIC. **Contact is set in `PRIVACY_CONTACT` (`usePrivacyNotice.ts`)** — replace the PESO mailbox with the DPO's own once designated |
| Personal Information Processors (PIP)         | Supabase (database, storage, auth), Google (Gemini API for OCR in `process-ocr`), Mapbox (maps)    |
| Data subjects                                | Applicants, employer representatives, staff                                                         |

> [!WARNING]
> **Google Gemini API (OCR, `supabase/functions/process-ocr`)**: Google's terms allow content sent to the *unpaid*
> Gemini API tier to be used to improve Google's products. Scanned NSRP forms are sensitive personal information.
> The API key **must** belong to a paid (billing-enabled) project, or OCR must move to a service with a data
> processing agreement (e.g. Vertex AI). Confirm this with the DPO before OCR is used on real forms.

Organizational duties outside the code (the agent should remind the user, not invent the documents):

- DPO designation and registration of the data processing system with the NPC (NPC Circular 2022-04).
- Privacy Impact Assessment for the portal, and again whenever a new purpose or processor is added.
- Data sharing agreements with DOLE and host agencies; processing agreements with the processors above.
- Breach management (§8) and staff confidentiality undertakings; annual privacy training for PESO staff.

---

## 2. Data Inventory

| Category                                     | Where                                                                 | Sensitive? |
| -------------------------------------------- | --------------------------------------------------------------------- | ---------- |
| Account: name, email, mobile, birth date, sex, address, username | `auth.users`, `core.profiles`                       | Birth date (age) |
| NSRP record: civil status, religion, height, TIN, disability, 4Ps/OFW, education, work history, skills | `applicants.applicants`, `applicant_experiences`, `applicant_skills` | **Yes** |
| Uploaded documents                            | `documents` bucket + `applicants.applicant_requirement_media`         | **Yes** (IDs, TOR, birth certificate) |
| OCR scans of paper forms                      | `applicant-forms` bucket + `public.applicant_forms`                   | **Yes** |
| Program records (GIP, SPES, TUPAD, job fairs) | `esmdd.*`, `applicants.spes_form`                                     | Partly |
| Profile pictures                              | `media` bucket (readable by signed-in users only, see §4)             | No |
| Face data                                    | `core.biometrics` (unused by the app; consent-guarded)                | **Yes** |
| Consents, requests                            | `core.privacy_consents`, `core.data_subject_requests`                 | No |
| Audit trail                                   | `system.system_audit_logs` (actor, record, fields, staff IP)          | No values |

When you add a table that holds personal data, add it here.

---

## 3. Transparency and Consent (Sec. 12, 13, 16(a), 18)

### 3.1 Privacy Notice

- Public page `/privacy` (`views/landing/PrivacyNotice.vue`, content in `composables/landing/usePrivacyNotice.ts`).
- Linked from: signup review step, the consent screen, the landing footer, and Privacy & My Data.
- It must state: the PIC and DPO contact, data collected, sensitive data, purposes, legal basis, recipients and
  processors (including cross-border storage), retention, security measures, data subject rights, how to exercise them,
  and the right to complain to the NPC.

### 3.2 Recording consent

- Consent is **specific, informed, freely given and evidenced** (Sec. 3(b)). One unticked checkbox **per purpose** —
  never a pre-ticked box, never one box bundling several purposes, never consent hidden in Terms of Use.
- Purposes (`core.privacy_consents.purpose`): `privacy_notice` (every account), `sensitive_personal_information`
  (applicants), `biometrics` (optional, never required).
- **Signup**: the ticked purposes travel in the auth metadata (`privacy_consent: { version, purposes }`) and
  `core.record_signup_privacy_consent` stores them with the server's time. Only the current version is accepted.
- **Everyone else** (accounts made before 073, staff created by an admin, a new notice version): the router guard sends
  them to `/privacy/consent` until `authStore.hasAcceptedPrivacyNotice` (from `core.my_privacy_status()`).
- **PESO-encoded registry records** (walk-in applicants without an account): staff must obtain the signed consent on
  the paper NSRP form. When an account is later linked, record it with `source = 'peso_office'` (add an RPC; never
  fake a web consent).
- Withdrawal: optional purposes via `core.withdraw_privacy_consent` (which also stops the processing, e.g. deletes
  face data). Required purposes end with the account (erasure request).

### 3.3 Changing the notice

Changing what the notice says about data, purposes, recipients or retention:

1. Edit `usePrivacyNotice.ts`.
2. Bump **both** `PRIVACY_NOTICE_VERSION` (`src/types/common/privacy.ts`) and `core.privacy_notice_version()` (new
   migration) to the same date string.
3. Every account is asked to accept again at its next navigation. Typos and wording fixes need no bump.

---

## 4. Storage and Access (Sec. 20)

| Bucket                           | Public? | Opened by                                   |
| -------------------------------- | ------- | ------------------------------------------- |
| `documents`                      | **No**  | Signed URL (`supportingDocumentService`)     |
| `applicant-forms`                | **No**  | Signed URL (`ocrVisionService`)              |
| `recruitment-activity-documents` | **No**  | Signed URL (`recruitmentActivityService`)    |
| `job-vacancy-attachments`        | **No**  | Signed URL (`jobVacancyAttachmentService`, migration 086). Job information uploaded by employers / PESO; private because the uploader chooses the content |
| `media` (profile pictures)       | Check   | Must be readable only by signed-in users; if the bucket is public, profile photos are reachable by URL — move to signed URLs before adding anything else to it |
| `announcement-media`, `site-content-media`, `job-*-attachments`, `templates` | Yes/RLS | Public content only. **Never** upload personal data there |

Rules:

1. Sign only the files on screen, in one `createSignedUrls` call (BACKEND.md §19.5). TTL ≤ 1 hour.
2. Never persist a signed URL; persist the storage path.
3. RLS limits rows; **select only the columns a screen shows** when reading other people's records (SECURITY.md §12).
   Employers never get an applicant's sensitive fields unless the applicant applied to that employer's vacancy, and
   then only what the application needs.
4. Municipal PESO sees only what its work needs; don't widen a role's policy "for convenience".

---

## 5. Accountability: the Audit Trail (Sec. 20(c), 21; NPC Circular 16-01)

### 5.1 Changes — automatic

`system.audit_personal_data_change()` runs `AFTER INSERT OR UPDATE OR DELETE` on every table that names a person
(migration 073 attaches it by column: `profile_id`, `profiles_id`, `user_id`, `applicant_id`, `core.profiles.id`). It logs
the actor, actor role, table, record id, data subject, changed column names and the staff member's IP. It skips people
editing their own data and system jobs.

**A new table holding personal data** in `core`, `applicants`, `employers` or `esmdd` gets the trigger in its migration:

```sql
CREATE TRIGGER trg_audit_personal_data
  AFTER INSERT OR UPDATE OR DELETE ON esmdd.new_table
  FOR EACH ROW EXECUTE FUNCTION system.audit_personal_data_change('applicant_id', 'applicant'); -- or ('profile_id', 'profile')
```

### 5.2 Views and exports — call the RPC

Reads can't fire triggers. When a staff screen opens **one person's full record** or **exports a list** (CSV, PDF,
print), call:

```ts
void privacyService.logPersonalDataAccess('VIEW', 'applicants.applicants', applicant.id)
void privacyService.logPersonalDataAccess('EXPORT', 'applicants.applicants', null, { rows: rows.length })
```

Already wired: the Applicant Master Registry (open details, open by URL, CSV export). Add it to every new staff detail
view, document viewer and export. Do **not** log list pages (they show summaries only).

### 5.3 Reading the log

Admins read it through RLS (`admin_select`). Data subjects see who (by role) viewed or changed their record in their
own export. Retention: 5 years (§7).

---

## 6. Data Subject Rights (Sec. 16–18)

| Right                     | How AGSURJOBS honours it                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Be informed               | Privacy Notice + consent screens (§3)                                                     |
| Access / portability      | **Download my data** → `core.export_my_data()` (JSON, machine-readable)                    |
| Rectification             | Applicants edit their own NSRP record; anything else → request `rectification`           |
| Object / withdraw consent | `withdraw_privacy_consent` for optional purposes; request `objection`                    |
| Erasure or blocking       | Request `erasure` → admin **Delete account** (069) → request closed as Completed          |
| Damages / complaint       | Request `complaint`; the notice points to the NPC                                         |

### 6.1 Requests

- Users file them on **Privacy & My Data** (`/app/privacy`, `/employer/privacy`) → `core.submit_data_subject_request`.
- Admins handle them on **Admin → Privacy Requests** (`core.admin_list_data_subject_requests`, paged in SQL).
- Each submission notifies every admin; each status change notifies the requester (`privacy_request`, BACKEND.md §17).
- **Rejected needs a reason** (CHECK constraint + RPC). Request rows are never deleted by hand — they prove the request
  was handled; retention removes closed ones after 5 years.
- Respond without undue delay. The DPO sets the internal response target; the queue lists open requests oldest first.

### 6.2 Export coverage

`core.export_my_data()` starts at the account's `core.profiles` row and the owned tables listed in the function, then
follows every single-column foreign key down (authorship columns like `created_by` excluded). A new table is covered
automatically **if** it has a foreign key to a covered table; if it links by a plain column, add it to the owned list
in a new migration. Staff accounts are excluded (their rows link to other people's records) — the DPO handles theirs.

### 6.3 Erasure coverage

`core.admin_delete_account()` (069) deletes the account's rows and everything linked to them, then the app removes its
storage folders. A new table that links to a person by a plain column must be added to 069's owned list. Records the
law requires PESO to keep (e.g. paid TUPAD / SPES payrolls under COA rules) must be **anonymised, not kept whole** —
add that branch explicitly and document it here.

---

## 7. Retention (Sec. 11(e))

`system.retention_policies` (admin-editable) + `system.apply_retention_policies()` run daily by pg_cron at 03:00 PHT.

| Category                   | Default | Rule                                           |
| -------------------------- | ------- | ---------------------------------------------- |
| `read_notifications`       | 365 d   | Read notifications deleted                      |
| `audit_logs`               | 1825 d  | Audit entries deleted                           |
| `closed_privacy_requests`  | 1825 d  | Completed / Rejected requests deleted           |

The DPO confirms these. Government records (NSRP registry, program applications, appointments, payrolls) follow the
records disposition schedule of the National Archives of the Philippines (RA 9470); they are **not** auto-purged. When
the PIC sets periods for them (e.g. inactive applicant accounts), add a row and a branch to the function — never
delete government records from client code.

---

## 8. Personal Data Breaches (Sec. 20(f), 30; NPC Circular 16-03)

If an agent finds evidence of a breach (public bucket with personal files, leaked key, RLS hole exposing other
people's rows, personal data in logs): **stop, tell the user immediately, and say it may be notifiable.** The PIC must
notify the NPC and affected data subjects **within 72 hours** of knowledge when sensitive or identity-fraud-enabling
data is involved and there's a real risk of serious harm. Don't "quietly fix" and move on — the fix and the
notification decision are both needed.

---

## 9. Checklist for Every Change That Touches Personal Data

- [ ] Purpose is in the Privacy Notice; new purpose / data / recipient → notice updated + version bumped (§3.3)
- [ ] Sensitive fields covered by consent or a cited law (Rule 2)
- [ ] Only needed columns selected; no `select('*')` on other people's records in lists (§4)
- [ ] Files in a private bucket, opened by signed URL, path stored — never a URL (Rule 4)
- [ ] New table: RLS + `trg_audit_personal_data` + reachable by export (§6.2) + removed by erasure (§6.3)
- [ ] Staff detail view / export calls `logPersonalDataAccess` (§5.2)
- [ ] Retention decided (§7)
- [ ] No personal data in console, URLs, error messages, third-party calls (Rule 9)
- [ ] New third party → processing agreement + notice + version bump (Rule 8)
