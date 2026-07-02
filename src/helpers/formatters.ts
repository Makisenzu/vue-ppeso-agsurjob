/**
 * Formats a hyphenated or underscored string into Title Case with spaces.
 * E.g., 'find-job' -> 'Find Job', 'saved_jobs' -> 'Saved Jobs'
 */
export function formatRouteName(name: string): string {
  if (!name) return ''
  return name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
