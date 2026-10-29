import { format, parseISO } from 'date-fns'
import {
  COMPANY_REQUIREMENTS,
  type CompanyRequirementItem,
  type CompanyReviewStatus,
  type CompanyVerificationFields,
  type EmployerRequirementWithFiles,
  type RequirementTemplate,
} from '@/types/employer/companyRequirement'

/** Files companies may submit: PDF or a photo / scan */
export const COMPANY_REQUIREMENT_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
export const COMPANY_REQUIREMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'
export const COMPANY_REQUIREMENT_ACCEPT_LABEL = 'PDF, JPG, PNG, WEBP'
export const COMPANY_REQUIREMENT_MAX_SIZE_MB = 10

/** Throws a message the upload toast shows when the file can't be submitted */
export function validateCompanyRequirementFile(file: File): void {
  if (!COMPANY_REQUIREMENT_FILE_TYPES.includes(file.type)) {
    throw new Error(`${file.name}: upload a PDF, JPEG, PNG or WebP file.`)
  }
  if (file.size > COMPANY_REQUIREMENT_MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`${file.name} is too large. Maximum size is ${COMPANY_REQUIREMENT_MAX_SIZE_MB}MB.`)
  }
}

const STATUS_LABEL: Record<CompanyReviewStatus, string> = {
  pending: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
}

const STATUS_BADGE_CLASS: Record<CompanyReviewStatus, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
  rejected: 'bg-destructive/10 text-destructive border-destructive/30',
}

const normalizeName = (value: string | null | undefined) => (value ?? '').trim().toLowerCase()

/** Narrows public.status_type to the three review states (other values read as pending) */
export function toReviewStatus(status: string | null | undefined): CompanyReviewStatus | null {
  if (!status) return null
  return status === 'approved' || status === 'rejected' ? status : 'pending'
}

export function getReviewStatusLabel(status: CompanyReviewStatus | null): string {
  return status ? STATUS_LABEL[status] : 'Not submitted'
}

/** Company verification wording ('approved' reads as Verified) */
export function getCompanyStatusLabel(status: CompanyReviewStatus | null): string {
  if (status === 'approved') return 'Verified'
  if (status === 'rejected') return 'Rejected'
  return 'Pending'
}

export function getReviewStatusBadgeClass(status: CompanyReviewStatus | null): string {
  return status ? STATUS_BADGE_CLASS[status] : 'bg-muted text-muted-foreground border-border'
}

/** Reads verification_remarks (migration 079) from a company row, typed or not yet regenerated */
export function getVerificationRemarks(company: object | null | undefined): string | null {
  return (company as CompanyVerificationFields | null | undefined)?.verification_remarks ?? null
}

/**
 * Joins the requirement list (COMPANY_REQUIREMENTS) with its templates and the company's submissions.
 * A requirement without a template yet (migration 079 not applied) is left out.
 */
export function buildCompanyRequirementItems(
  templates: RequirementTemplate[],
  submissions: EmployerRequirementWithFiles[],
): CompanyRequirementItem[] {
  return COMPANY_REQUIREMENTS.flatMap((requirement) => {
    const template = templates.find((row) => normalizeName(row.name) === normalizeName(requirement.name))
    if (!template) return []
    const submission = submissions.find((row) => row.requirement_id === template.id) ?? null
    const files = [...(submission?.employer_requirement_files ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    )
    return [
      {
        templateId: template.id,
        name: requirement.name,
        hint: requirement.hint,
        submission,
        status: submission ? toReviewStatus(submission.status) : null,
        files,
      },
    ]
  })
}

/** How a document shows in the progress stepper (same look as the applicant's Document Upload Progress) */
export interface CompanyDocumentStep {
  label: string
  icon: 'check' | 'clock' | 'x'
  circleClass: string
  /** Connector to the next step */
  separatorClass: string
  textClass: string
}

export function getCompanyDocumentStep(item: CompanyRequirementItem): CompanyDocumentStep {
  if (item.status === 'approved') {
    return {
      label: 'Approved',
      icon: 'check',
      circleClass: 'border-success bg-success/10 text-success',
      separatorClass: 'bg-success',
      textClass: 'text-success',
    }
  }
  if (item.status === 'rejected') {
    return {
      label: 'Rejected',
      icon: 'x',
      circleClass: 'border-destructive bg-destructive/10 text-destructive',
      separatorClass: 'bg-destructive',
      textClass: 'text-destructive',
    }
  }
  if (item.status === 'pending' && item.files.length > 0) {
    return {
      label: 'Under review',
      icon: 'clock',
      circleClass: 'border-warning bg-warning/10 text-warning',
      separatorClass: 'bg-warning',
      textClass: 'text-warning',
    }
  }
  return {
    label: 'Not submitted',
    icon: 'x',
    circleClass: 'border-border bg-muted text-muted-foreground',
    separatorClass: 'bg-muted',
    textClass: 'text-muted-foreground',
  }
}

/** "2 of 3 documents approved" (every company document is mandatory) */
export function summarizeRequiredDocuments(items: CompanyRequirementItem[]) {
  return {
    total: items.length,
    submitted: items.filter((item) => item.files.length > 0).length,
    approved: items.filter((item) => item.status === 'approved').length,
  }
}

/** "PDF", "PNG", ... from a stored file's MIME type */
export function getFileTypeLabel(mimeType: string | null | undefined): string {
  if (!mimeType) return 'File'
  if (mimeType === 'application/pdf') return 'PDF'
  return mimeType.split('/').pop()?.toUpperCase() ?? 'File'
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatSubmittedDate(value: string | null | undefined): string {
  return value ? format(parseISO(value), 'MMM d, yyyy') : ''
}
