import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { getOrSetPersistentCache, removePersistentCacheValue } from '@/helpers/common/persistentCache'
import type { Database } from '@/types/database.types'
import { mediaService } from '@/services/common/mediaService'
import type { ProfileRow, CreateAccountPayload } from '@/types/admin/userAccounts'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
const USER_ACCOUNTS_CACHE_KEY = 'admin:user-accounts:profiles'
const USER_ACCOUNTS_CACHE_TTL_MS = 1000 * 60 * 15

type ProfileInsert = Database['core']['Tables']['profiles']['Insert']

export const userAccountService = {
  async fetchAllProfiles(forceRefresh = false): Promise<ProfileRow[]> {
    if (forceRefresh) {
      removePersistentCacheValue(USER_ACCOUNTS_CACHE_KEY)
    }
    
    return getOrSetPersistentCache(USER_ACCOUNTS_CACHE_KEY, USER_ACCOUNTS_CACHE_TTL_MS, async () => {
      const { data: profiles, error } = await supabase
        .schema('core')
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message || 'Failed to fetch profiles')
      }

      if (!profiles || profiles.length === 0) {
        return []
      }

      const profileIds = profiles.map((profile) => profile.id)
      const { data: mediaRows } = await supabase
        .schema('core')
        .from('profile_media')
        .select('*')
        .in('profile_id', profileIds)
        .order('created_at', { ascending: false })

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
        const { data: emailRows } = await (supabase.schema('core') as any).rpc('get_user_emails')
        if (emailRows && Array.isArray(emailRows)) {
          const emailMap = new Map<string, string>(
            emailRows.map((row: { id: string; email: string }) => [row.id, row.email]),
          )
          return profiles.map((p) => ({
            ...p,
            email: emailMap.get(p.id) ?? null,
            avatarUrl: avatarMap.get(p.id) ?? null,
          })) as ProfileRow[]
        }
      } catch {
        // RPC not available – fall through gracefully
      }

      return profiles.map((p) => ({
        ...p,
        email: null as string | null,
        avatarUrl: avatarMap.get(p.id) ?? null,
      })) as ProfileRow[]
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

  async updateProfileStatus(profileId: string, status: string): Promise<ProfileRow> {
    const { data, error } = await supabase
      .schema('core')
      .from('profiles')
      .update({ status: status as Database['core']['Enums']['status_type'], updated_at: new Date().toISOString() })
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
}

