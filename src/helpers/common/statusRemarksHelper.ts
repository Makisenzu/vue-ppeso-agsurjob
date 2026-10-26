import type { z } from 'zod'

// Rejecting or cancelling anything a person is waiting on must say why: the remarks are saved with the
// record and reach the person through the notification triggers (053 / 055)
const REMARKS_REQUIRED_STATUSES = new Set(['rejected', 'cancelled', 'canceled'])

export const STATUS_REMARKS_REQUIRED_MESSAGE = 'Remarks are required when rejecting or cancelling.'

/** True for Rejected / Cancelled, in any casing. */
export function requiresStatusRemarks(status: string | null | undefined): boolean {
  return REMARKS_REQUIRED_STATUSES.has((status ?? '').trim().toLowerCase())
}

/** The trimmed remarks, or null when blank. */
export function normalizeStatusRemarks(remarks: string | null | undefined): string | null {
  const trimmed = (remarks ?? '').trim()
  return trimmed || null
}

/** Throws when a Rejected / Cancelled status comes without remarks; services call it before writing. */
export function assertStatusRemarks(status: string | null | undefined, remarks: string | null | undefined): void {
  if (requiresStatusRemarks(status) && !normalizeStatusRemarks(remarks)) {
    throw new Error(STATUS_REMARKS_REQUIRED_MESSAGE)
  }
}

/** zod superRefine for forms with `status` and `remarks` fields: flags `remarks` when required and blank. */
export function refineStatusRemarks(
  values: { status?: string | null; remarks?: string | null },
  ctx: z.RefinementCtx,
): void {
  if (requiresStatusRemarks(values.status) && !normalizeStatusRemarks(values.remarks)) {
    ctx.addIssue({ code: 'custom', path: ['remarks'], message: STATUS_REMARKS_REQUIRED_MESSAGE })
  }
}
