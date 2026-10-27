import { gipApplicationCode, normalizeGipStatus } from '@/helpers/applicant/gipApplicationHelper'
import type {
  ApplicationStage,
  ApplicationSummary,
  MyProgramApplicationRows,
} from '@/types/applicant/applicationStatus'

/** "SPES-APP-2026-1A2B": same shape as GIP's reference (gipApplicationCode) */
function programReference(prefix: string, id: string, createdAt: string | null): string {
  const year = (createdAt ? new Date(createdAt).getFullYear() : NaN) || new Date().getFullYear()
  return `${prefix}-APP-${year}-${id.slice(0, 4).toUpperCase()}`
}

/** Stage of a Pending / Approved / Rejected review, or Deployed once the applicant is placed */
function stageOf(status: string, isDeployed: boolean): ApplicationStage {
  const value = status.trim().toLowerCase()
  if (isDeployed || value === 'hired' || value === 'deployed') return 'deployed'
  if (value === 'approved') return 'approved'
  if (value === 'rejected') return 'rejected'
  return 'review'
}

/** Every program application as one list, newest first. */
export function toApplicationSummaries(rows: MyProgramApplicationRows): ApplicationSummary[] {
  const summaries: ApplicationSummary[] = [
    ...rows.gip.map((row) => {
      const status = normalizeGipStatus(row.status)
      return {
        key: `gip:${row.id}`,
        kind: 'program' as const,
        source: 'GIP',
        title: 'Government Internship Program',
        reference: gipApplicationCode(row.id, row.created_at),
        status,
        stage: stageOf(status, row.isDeployed),
        remarks: status === 'Rejected' ? row.status_remarks : null,
        appliedAt: row.created_at,
        updatedAt: row.updated_at ?? row.created_at,
        // `from` points the form's back link here instead of the GIP page
        to: { name: 'gip-application-form', query: { from: 'application' } },
      }
    }),
    ...rows.spes.map((row) => ({
      key: `spes:${row.id}`,
      kind: 'program' as const,
      source: 'SPES',
      title: 'Special Program for Employment of Students',
      reference: programReference('SPES', row.id, row.created_at),
      status: row.status,
      stage: stageOf(row.status, row.isDeployed),
      remarks: row.status === 'Rejected' ? row.remarks : null,
      appliedAt: row.created_at,
      updatedAt: row.updated_at ?? row.created_at,
      // `from` points the form's back link here instead of the SPES page
      to: { name: 'spes-application-form', query: { from: 'application' } },
    })),
    ...rows.tupad.map((row) => ({
      key: `tupad:${row.id}`,
      kind: 'program' as const,
      source: 'TUPAD',
      title: 'Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers',
      reference: programReference('TUPAD', row.id, row.created_at),
      status: row.status,
      stage: stageOf(row.status, row.isDeployed),
      remarks: row.status === 'Rejected' ? row.status_remarks : null,
      appliedAt: row.created_at,
      updatedAt: row.updated_at ?? row.created_at,
      to: { name: 'tupad-application' },
    })),
  ]
  return summaries.sort((a, b) => (b.appliedAt ?? '').localeCompare(a.appliedAt ?? ''))
}

export const APPLICATION_STAGE_LABELS: Record<ApplicationStage, string> = {
  submitted: 'Submitted',
  review: 'Under review',
  approved: 'Approved',
  rejected: 'Not approved',
  deployed: 'Deployed',
}

/** Progress steps of an application: Submitted → Under review → Approved / Not approved → Deployed */
export function applicationProgress(stage: ApplicationStage) {
  const current = { submitted: 0, review: 1, approved: 3, rejected: 2, deployed: 4 }[stage]
  return [
    { title: 'Submitted', state: 'completed' as const },
    { title: 'Under review', state: current > 1 ? ('completed' as const) : ('active' as const) },
    {
      title: stage === 'rejected' ? 'Not approved' : 'Approved',
      state:
        stage === 'rejected'
          ? ('rejected' as const)
          : current > 2
            ? ('completed' as const)
            : ('upcoming' as const),
    },
    {
      title: 'Deployed',
      state: current > 3 ? ('completed' as const) : current === 3 ? ('active' as const) : ('upcoming' as const),
    },
  ]
}
