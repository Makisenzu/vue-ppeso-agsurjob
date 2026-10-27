import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { getOrSetPersistentCache, removePersistentCacheValue } from '@/helpers/common/persistentCache'
import type { Database } from '@/types/database.types'
import { mediaService } from '@/services/common/mediaService'
import { fetchAllPages } from '@/helpers/common/supabasePaging'
import type { ProfileRow, CreateAccountPayload } from '@/types/admin/userAccounts'
import { assertStatusRemarks, normalizeStatusRemarks } from '@/helpers/common/statusRemarksHelper'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
const USER_ACCOUNTS_CACHE_KEY = 'admin:user-accounts:profiles'
const USER_ACCOUNTS_CACHE_TTL_MS = 1000 * 60 * 15

type ProfileInsert = Database['core']['Tables']['profiles']['Insert']
// status_remarks (migration 055) is not in database.types.ts until `npm run types:gen`
type ProfileStatusUpdate = Database['core']['Tables']['profiles']['Update'] & { status_remarks?: string | null }

/** Buckets where a user's uploads sit in their own `<profile id>/` folder (034 admin_all_app_buckets). */
const ACCOUNT_FILE_BUCKETS = ['documents', 'media', 'job-posting-attachments', 'job-fair-attachments'] as const
const STORAGE_LIST_PAGE = 100

/** Every file path under a folder of a bucket, subfolders included. */
async function listFolderFiles(bucket: string, folder: string): Promise<string[]> {
  const paths: string[] = []
  for (let offset = 0; ; offset += STORAGE_LIST_PAGE) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: STORAGE_LIST_PAGE, offset })
    if (error) throw error
    for (const item of data ?? []) {
      const path = `${folder}/${item.name}`
      // Folders come back without an id
      if (item.id === null) paths.push(...(await listFolderFiles(bucket, path)))
      else paths.push(path)
    }
    if (!data || data.length < STORAGE_LIST_PAGE) return paths
  }
}

function normalizeBarangayName(value?: string | null): string {
  const normalized = value?.trim().toLowerCase() ?? ''
  // Remove common barangay name suffixes/prefixes
  return normalized
    .replace(/\s+barangay$/i, '')
    .replace(/^barangay\s+/i, '')
    .replace(/\s+puroks?$/i, '')
    .replace(/\s+sitio\s+/i, ' ')
    .trim()
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(0))

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      )
    }
  }

  return matrix[b.length][a.length]
}

function findBarangayTagByName(
  barangayName: string,
  barangayRecords: Array<{ name?: string | null; lpii_tag?: Database['public']['Enums']['lpii_type'] | null }>
): Database['public']['Enums']['lpii_type'] | null {
  if (!barangayName) return null
  
  const searchNormalized = normalizeBarangayName(barangayName)

  // First try exact normalized match
  for (const record of barangayRecords) {
    if (normalizeBarangayName(record.name) === searchNormalized) {
      return record.lpii_tag ?? null
    }
  }

  // Second try similarity matching: check if normalized names contain each other or have high overlap
  for (const record of barangayRecords) {
    const recordNormalized = normalizeBarangayName(record.name)
    if (
      recordNormalized.includes(searchNormalized) ||
      searchNormalized.includes(recordNormalized) ||
      levenshteinDistance(searchNormalized, recordNormalized) <= 2
    ) {
      return record.lpii_tag ?? null
    }
  }

  return null
}

export const userAccountService = {
  async fetchAllProfiles(forceRefresh = false): Promise<ProfileRow[]> {
    if (forceRefresh) {
      removePersistentCacheValue(USER_ACCOUNTS_CACHE_KEY)
    }
    
    return getOrSetPersistentCache(USER_ACCOUNTS_CACHE_KEY, USER_ACCOUNTS_CACHE_TTL_MS, async () => {
      // First, fetch barangay terrain information from public schema
      let barangayRecords: Array<{ name?: string | null; lpii_tag?: Database['public']['Enums']['lpii_type'] | null }> = []
      try {
        const { data: barangayData, error: barangayError } = await fetchAllPages(() =>
          supabase
            .schema('public')
            .from('barangays')
            .select('name, lpii_tag')
            .order('id')
        )

        if (barangayError) {
          console.error('Error fetching barangays:', barangayError)
        }

        if (barangayData && Array.isArray(barangayData)) {
          barangayRecords = barangayData
        }
      } catch (error) {
        console.error('Error fetching barangay terrain data:', error)
      }

      // Paged — PostgREST caps each response at 1,000 rows
      const { data: profiles, error } = await fetchAllPages(() =>
        supabase
          .schema('core')
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
      )

      if (error) {
        throw new Error(error.message || 'Failed to fetch profiles')
      }

      if (profiles.length === 0) {
        return []
      }

      // Every profile is listed, so read profile_media whole instead of an `.in()` over
      // all profile ids (a list that long overflows the request URL).
      const { data: mediaRows, error: mediaError } = await fetchAllPages(() =>
        supabase
          .schema('core')
          .from('profile_media')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
      )
      if (mediaError) {
        console.warn('Failed to fetch profile media:', mediaError)
      }

      const avatarMap = new Map<string, string>()
      if (mediaRows && Array.isArray(mediaRows)) {
        for (const media of mediaRows) {
          if (!media?.profile_id || avatarMap.has(media.profile_id)) continue
          const avatarSource = media as typeof media & { public_url?: string | null }
          const avatarUrl = avatarSource.public_url || (media.path ? mediaService.getPublicUrl(media.path) : null)
          if (avatarUrl) {
            avatarMap.set(media.profile_id, avatarUrl)
          }
        }
      }

      // Fetch all user emails via a SECURITY DEFINER database function
      // that reads from auth.users (not accessible directly from the client).
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: emailRows } = await fetchAllPages<{ id: string; email: string }>(() => (supabase.schema('core') as any).rpc('get_user_emails').order('id'))
        if (emailRows && Array.isArray(emailRows)) {
          const emailMap = new Map<string, string>(
            emailRows.map((row: { id: string; email: string }) => [row.id, row.email]),
          )
          const result = profiles.map((p) => {
            const lpiiTag = findBarangayTagByName(p.barangay ?? '', barangayRecords)
            
            return {
              ...p,
              email: emailMap.get(p.id) ?? null,
              avatarUrl: avatarMap.get(p.id) ?? null,
              barangayLpiiTag: lpiiTag,
            }
          })

          return result as ProfileRow[]
        }
      } catch (error) {
        // RPC not available – fall through gracefully
        console.error('RPC error:', error)
      }

      const result = profiles.map((p) => {
        const lpiiTag = findBarangayTagByName(p.barangay ?? '', barangayRecords)
        
        return {
          ...p,
          email: null as string | null,
          avatarUrl: avatarMap.get(p.id) ?? null,
          barangayLpiiTag: lpiiTag,
        }
      })

      return result as ProfileRow[]
    })
  },

  async createProfile(payload: CreateAccountPayload): Promise<ProfileRow> {
    // Use a separate Supabase client instance with persistSession disabled
    // so signUp does not change or overwrite the currently logged in admin session.
    const tempClient = createClient<Database>(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })

    // 1. Create account in auth table using isolated client
    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          role: payload.role,
          firstname: payload.firstname,
          lastname: payload.lastname,
          username: payload.username,
        },
      },
    })

    if (authError) {
      throw new Error(authError.message || 'Failed to create user authentication account')
    }

    const userId = authData.user?.id
    if (!userId) {
      throw new Error('No user ID returned from authentication signup')
    }

    // 2. Insert profile record into core.profiles with the matching auth user ID
    const insert: ProfileInsert = {
      id: userId,
      firstname: payload.firstname,
      lastname: payload.lastname,
      middlename: payload.middlename || null,
      username: payload.username,
      role: payload.role,
      gender: payload.gender || null,
      contact_number: payload.contact_number || null,
      birthdate: payload.birthdate || null,
      region: payload.region || null,
      province: payload.province || null,
      geographic: payload.geographic || null,
      barangay: payload.barangay || null,
      is_pwd: payload.is_pwd ?? false,
      is_4ps: payload.is_4ps ?? false,
      status: 'active',
    }

    // 2. Insert or update profile record into core.profiles with matching auth user ID
    // (Upsert prevents "duplicate key value violates unique constraint profiles_pkey"
    // if a Supabase Database Trigger automatically creates a row on auth.users insert)
    const { data, error } = await supabase
      .schema('core')
      .from('profiles')
      .upsert(insert, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      throw new Error(error.message || 'Failed to insert or update user account profile')
    }

    if (!data) {
      // Fallback fetch if data was not returned by upsert
      const { data: fetchedData, error: fetchError } = await supabase
        .schema('core')
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (fetchError || !fetchedData) {
        throw new Error(fetchError?.message || 'Failed to retrieve profile record')
      }

      removePersistentCacheValue(USER_ACCOUNTS_CACHE_KEY)

      return { ...fetchedData, email: payload.email }
    }

    removePersistentCacheValue(USER_ACCOUNTS_CACHE_KEY)

    return { ...data, email: payload.email }
  },

  async updateProfileStatus(profileId: string, status: string, remarks?: string | null): Promise<ProfileRow> {
    assertStatusRemarks(status, remarks)
    const update: ProfileStatusUpdate = {
      status: status as Database['core']['Enums']['status_type'],
      status_remarks: normalizeStatusRemarks(remarks),
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .schema('core')
      .from('profiles')
      .update(update as Database['core']['Tables']['profiles']['Update'])
      .eq('id', profileId)
      .select()
      .maybeSingle()

    if (error) {
      throw new Error(error.message || 'Failed to update account status')
    }

    if (!data) {
      // Fallback fetch if update did not return row representation (e.g. due to RLS select policy)
      const { data: fetched, error: fetchErr } = await supabase
        .schema('core')
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle()

      if (fetchErr || !fetched) {
        throw new Error(fetchErr?.message || 'Profile status updated, but unable to re-fetch record')
      }

      removePersistentCacheValue(USER_ACCOUNTS_CACHE_KEY)

      return fetched as ProfileRow
    }

    removePersistentCacheValue(USER_ACCOUNTS_CACHE_KEY)

    return data as ProfileRow
  },

  /**
   * Permanently deletes an account and all its data (core.admin_delete_account, migration 069),
   * then its uploaded files. The database part is all or nothing; the files are removed after it,
   * so `filesLeft` is true when some could not be (the account is gone either way).
   */
  async deleteAccount(profileId: string): Promise<{ filesLeft: boolean }> {
    // admin_delete_account is not in database.types.ts until `npm run types:gen` is re-run
    const { error } = await (supabase.schema('core') as any).rpc('admin_delete_account', { p_profile_id: profileId })
    if (error) throw new Error(error.message || 'Failed to delete the account.')
    removePersistentCacheValue(USER_ACCOUNTS_CACHE_KEY)

    let filesLeft = false
    for (const bucket of ACCOUNT_FILE_BUCKETS) {
      try {
        const paths = await listFolderFiles(bucket, profileId)
        for (let i = 0; i < paths.length; i += STORAGE_LIST_PAGE) {
          const { error: removeErr } = await supabase.storage.from(bucket).remove(paths.slice(i, i + STORAGE_LIST_PAGE))
          if (removeErr) throw removeErr
        }
      } catch (err) {
        filesLeft = true
        console.warn(`[userAccountService] Could not remove the deleted account's files in ${bucket}:`, err)
      }
    }
    return { filesLeft }
  },
}

