import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Most rows PostgREST returns per request (Supabase `max_rows`, default 1000).
 * Anything past it is silently dropped, so list queries must page with `.range()`.
 * Keep in step with the project's API settings if `max_rows` is ever changed.
 */
export const SUPABASE_PAGE_SIZE = 1000

/** Ids per `.in()` filter — keeps request URLs well under proxy limits (150 UUIDs ≈ 5.5 KB). */
export const IN_FILTER_CHUNK_SIZE = 150

type PagedResult<T> = { data: T[]; error: PostgrestError | null }

interface RangeableQuery<T> {
  range(from: number, to: number): PromiseLike<{ data: T[] | null; error: PostgrestError | null }>
}

/**
 * Reads every row of a select, one `.range()` page at a time.
 * The query must be ordered by a unique key (add `.order('id')` as a tiebreaker),
 * otherwise rows can repeat or be skipped between pages.
 */
export async function fetchAllPages<T>(buildQuery: () => RangeableQuery<T>): Promise<PagedResult<T>> {
  const rows: T[] = []

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + SUPABASE_PAGE_SIZE - 1)
    if (error) return { data: rows, error }

    rows.push(...(data ?? []))
    if (!data || data.length < SUPABASE_PAGE_SIZE) return { data: rows, error: null }
  }
}

/**
 * Runs a `.in()` lookup over many values in chunks (each chunk fully paged) and merges the rows.
 * One `.in()` with thousands of UUIDs exceeds URL length limits and fails outright.
 */
export async function fetchAllInChunks<T, K>(
  values: K[],
  buildQuery: (chunk: K[]) => RangeableQuery<T>
): Promise<PagedResult<T>> {
  const unique = [...new Set(values)]
  const chunks: K[][] = []
  for (let i = 0; i < unique.length; i += IN_FILTER_CHUNK_SIZE) {
    chunks.push(unique.slice(i, i + IN_FILTER_CHUNK_SIZE))
  }

  const results = await Promise.all(chunks.map((chunk) => fetchAllPages(() => buildQuery(chunk))))
  const failed = results.find((result) => result.error)
  if (failed) return { data: [], error: failed.error }

  return { data: results.flatMap((result) => result.data), error: null }
}
