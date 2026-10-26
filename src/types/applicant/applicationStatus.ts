import type { RouteLocationRaw } from 'vue-router'

/** PESO programs (GIP, SPES, TUPAD, ...) or job vacancies */
export type ApplicationKind = 'program' | 'vacancy'

export type ApplicationFilter = 'all' | ApplicationKind

/** Where an application is in the process, shared by every program and vacancy */
export type ApplicationStage = 'submitted' | 'review' | 'approved' | 'rejected' | 'deployed'

/** One application on the Application Status page, whatever it was for. */
export interface ApplicationSummary {
  /** Unique across sources, e.g. "gip:<uuid>" */
  key: string
  kind: ApplicationKind
  /** Short name, e.g. "GIP" */
  source: string
  /** Full name, e.g. "Government Internship Program" */
  title: string
  reference: string
  /** Status as the program stores it, e.g. "Pending" */
  status: string
  stage: ApplicationStage
  /** Staff remarks of a rejection */
  remarks: string | null
  appliedAt: string | null
  updatedAt: string | null
  /** The application's own page */
  to: RouteLocationRaw
}

/** Raw program rows read by applicationStatusService (each through the applicant's own-row RLS). */
export interface MyProgramApplicationRows {
  gip: {
    id: string
    status: string | null
    status_remarks: string | null
    created_at: string | null
    updated_at: string | null
    isDeployed: boolean
  }[]
  spes: {
    id: string
    status: string
    remarks: string | null
    created_at: string
    updated_at: string | null
    isDeployed: boolean
  }[]
  tupad: {
    id: string
    status: string
    status_remarks: string | null
    created_at: string
    updated_at: string
    isDeployed: boolean
  }[]
}
