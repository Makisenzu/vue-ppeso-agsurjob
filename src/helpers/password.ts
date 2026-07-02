export interface PasswordStrengthResult {
  score: number
  label: string
  color: string
}

/**
 * Calculates password strength based on length and character diversity.
 */
export function getPasswordStrength(password: string = ''): PasswordStrengthResult {
  if (!password) return { score: 0, label: 'Too short', color: 'bg-neutral-200' }
  
  let score = 0
  if (password.length >= 15) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (password.length < 15) {
    return { score: 20, label: 'Weak (Must be 15+ characters)', color: 'bg-red-500' }
  }

  switch (score) {
    case 1:
    case 2:
      return { score: 40, label: 'Weak', color: 'bg-red-500' }
    case 3:
      return { score: 60, label: 'Medium', color: 'bg-yellow-500' }
    case 4:
      return { score: 80, label: 'Strong', color: 'bg-emerald-500' }
    case 5:
      return { score: 100, label: 'Very Strong', color: 'bg-green-600' }
    default:
      return { score: 0, label: 'Too short', color: 'bg-neutral-200' }
  }
}
