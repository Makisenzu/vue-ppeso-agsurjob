/**
 * Raw database / API errors name tables, columns, schemas and policies (e.g. `new row violates row-level
 * security policy for table "spes_form"`). Shown to users they map out the database, so they are
 * replaced with plain wording (SECURITY.md §12: error messages must not leak internals). Messages the app
 * or its RPCs write on purpose ("You can't delete your own account") match none of these and pass through.
 */
const TECHNICAL_ERRORS: { pattern: RegExp; message: string }[] = [
  {
    pattern: /row-level security|permission denied|insufficient privilege|\b42501\b/i,
    message: "You don't have permission to do that.",
  },
  {
    pattern: /JWT|token (?:is )?expired|invalid refresh token|refresh token not found/i,
    message: 'Your session has expired. Please sign in again.',
  },
  { pattern: /duplicate key value/i, message: 'This record already exists.' },
  {
    pattern: /violates foreign key constraint/i,
    message: 'This record is linked to other records, so it cannot be changed.',
  },
  {
    pattern: /violates (?:check|not-null) constraint|invalid input (?:syntax|value)|out of range|value too long/i,
    message: 'Some details are not valid. Please check the form and try again.',
  },
  {
    pattern: /failed to fetch|networkerror|network request failed|load failed/i,
    message: "Can't reach the server. Check your connection and try again.",
  },
  {
    pattern:
      /relation "|column "|schema "|does not exist|PGRST\d+|could not find the .+ in the schema cache|syntax error|structure of query|operator does not exist|stack depth/i,
    message: 'Something went wrong. Please try again.',
  },
]

/** A message safe to show a user: technical errors become plain wording; everything else is kept. */
export function toSafeErrorMessage(message: string | null | undefined): string | undefined {
  if (!message) return message ?? undefined
  return TECHNICAL_ERRORS.find(({ pattern }) => pattern.test(message))?.message ?? message
}
