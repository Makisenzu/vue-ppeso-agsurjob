import type { Database } from '@/types/database.types'

export type SpesRow = Database['esmdd']['Tables']['spes']['Row']
export type SpesInsert = Database['esmdd']['Tables']['spes']['Insert']
export type SpesUpdate = Database['esmdd']['Tables']['spes']['Update']

export type SpesApplicantRow = Database['esmdd']['Tables']['spes_applicants']['Row']
export type SpesApplicantInsert = Database['esmdd']['Tables']['spes_applicants']['Insert']
export type SpesApplicantUpdate = Database['esmdd']['Tables']['spes_applicants']['Update']
