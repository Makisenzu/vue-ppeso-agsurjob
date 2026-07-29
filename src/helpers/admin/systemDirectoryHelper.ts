import type { DirectoryCategory } from '@/types/admin/systemDirectory'

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Never'
  try {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'N/A'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes || bytes === 0) return 'Unknown size'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export const getCategoryBadgeVariant = (
  category: DirectoryCategory
): 'default' | 'secondary' | 'outline' => {
  switch (category) {
    case 'company':
      return 'default'
    case 'applicant':
      return 'secondary'
    default:
      return 'outline'
  }
}

export const getCategoryBadgeClass = (category: DirectoryCategory): string => {
  switch (category) {
    case 'company':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800 font-semibold'
    case 'applicant':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800 font-semibold'
    default:
      return ''
  }
}

export const getRoleBadgeVariant = (
  role: string | null | undefined
): 'destructive' | 'default' | 'secondary' | 'outline' => {
  switch (role) {
    case 'company_owner':
    case 'company_member':
      return 'default'
    case 'applicant':
      return 'secondary'
    default:
      return 'outline'
  }
}

export const getRoleBadgeClass = (role: string | null | undefined): string => {
  switch (role) {
    case 'company_owner':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800'
    case 'company_member':
      return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-400 dark:border-teal-800'
    case 'applicant':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/50 dark:text-gray-400 dark:border-gray-800'
  }
}

export const getStatusBadgeVariant = (
  status: string | null | undefined
): 'destructive' | 'default' | 'secondary' | 'outline' => {
  switch (status) {
    case 'active':
    case 'approved':
    case 'verified':
      return 'outline'
    case 'pending':
    case 'unverified':
    case 'submitted':
      return 'secondary'
    case 'rejected':
    case 'inactive':
      return 'destructive'
    default:
      return 'outline'
  }
}

export const getStatusBadgeClass = (status: string | null | undefined): string => {
  switch (status) {
    case 'active':
    case 'approved':
    case 'verified':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
    case 'pending':
    case 'unverified':
    case 'submitted':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800'
    case 'rejected':
    case 'inactive':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800'
    default:
      return ''
  }
}

export const formatRoleLabel = (role: string | null | undefined): string => {
  if (!role) return 'Unassigned'
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
