import * as z from 'zod'
import { format, parseISO } from 'date-fns'
import { MIN_PASSWORD_LENGTH, PH_MOBILE_PATTERN } from '@/helpers/common/signupHelper'
import { COMPANY_MEMBER_ROLE_OPTIONS, type CompanyMemberRole } from '@/types/employer/companyAccess'

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  member_role: z.enum(['recruiter', 'viewer'], { errorMap: () => ({ message: 'Choose a role.' }) }),
})

/** Accept-invite form: the invitee's own name and password (SECURITY.md §6.1 password length) */
export const acceptInvitationSchema = z
  .object({
    firstname: z.string().trim().min(1, 'Enter your first name.').max(80),
    lastname: z.string().trim().min(1, 'Enter your last name.').max(80),
    contact_number: z
      .string()
      .trim()
      .min(1, 'Enter your mobile number.')
      .regex(PH_MOBILE_PATTERN, 'Enter a valid mobile number, e.g. 09123456789.'),
    password: z.string().min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`),
    confirm_password: z.string().min(1, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirm_password, {
    message: 'Passwords do not match.',
    path: ['confirm_password'],
  })

export function getMemberRoleLabel(role: CompanyMemberRole | null | undefined): string {
  return COMPANY_MEMBER_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? 'Member'
}

export function formatAccessDate(value: string): string {
  return format(parseISO(value), 'MMM d, yyyy')
}
