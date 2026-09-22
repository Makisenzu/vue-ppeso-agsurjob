import type { Database } from '@/types/database.types'

/**
 * Row type for the `public.directories` table.
 * Represents a provincial government office/station entry.
 */
export type DirectoryRow = Database['public']['Tables']['directories']['Row']
