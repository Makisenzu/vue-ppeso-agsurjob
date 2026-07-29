export const formatDate = (dateString: string | null): string => {
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

export const formatDateTime = (dateString: string | null): string => {
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

export const getRoleBadgeVariant = (
  role: string | null
): 'destructive' | 'default' | 'secondary' | 'outline' => {
  switch (role) {
    case 'admin':
      return 'destructive'
    case 'company_owner':
    case 'company_member':
      return 'default'
    case 'applicant':
      return 'secondary'
    case 'provincial_peso':
      return 'outline'
    case 'municipal_peso':
      return 'outline'
    case 'dole':
      return 'outline'
    default:
      return 'outline'
  }
}
export const getRoleBadgeClass = (role: string | null): string => {
  switch (role) {
    case 'provincial_peso':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800'
    case 'municipal_peso':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800'
    case 'dole':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800'
    case 'admin':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800'
    case 'company_owner':
    case 'company_member':
      return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-400 dark:border-green-800'
    case 'applicant':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/50 dark:text-gray-400 dark:border-gray-800'
  }
}

export const getStatusBadgeVariant = (
  status: string | null
): 'destructive' | 'default' | 'secondary' | 'outline' => {
  switch (status) {
    case 'active':
    case 'approved':
      return 'outline'
    case 'pending':
      return 'secondary'
    case 'rejected':
    case 'inactive':
      return 'destructive'
    default:
      return 'outline'
  }
}

export const getStatusBadgeClass = (status: string | null): string => {
  switch (status) {
    case 'active':
    case 'approved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
    default:
      return ''
  }
}

export const formatRoleLabel = (role: string | null): string => {
  if (!role) return 'Unassigned'
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
