import type { Database } from '@/types/database.types'

/**
 * Row type for the `public.directories` table.
 * Represents a provincial government office/station entry.
 * `office_head_position` (migration 113) is declared here until `npm run types:gen` is re-run.
 */
export type DirectoryRow = Database['public']['Tables']['directories']['Row'] & {
  office_head_position?: string | null
}
