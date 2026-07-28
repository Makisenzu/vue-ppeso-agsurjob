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
    case 'municipal_peso':
    case 'dole':
      return 'outline'
    default:
      return 'outline'
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
