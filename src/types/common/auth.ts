export type Role = 'admin' | 'employer' | 'applicant'

export interface RoleOption {
  id: Role
  label: string
  description: string
  icon: any
}
