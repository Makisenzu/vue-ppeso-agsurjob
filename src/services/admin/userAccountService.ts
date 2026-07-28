import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/common/database.types'
import type { ProfileRow, CreateAccountPayload } from '@/types/admin/userAccounts'

type ProfileInsert = Database['core']['Tables']['profiles']['Insert']

export const userAccountService = {
  async fetchAllProfiles(): Promise<ProfileRow[]> {
    const { data, error } = await supabase
      .schema('core')
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message || 'Failed to fetch profiles')
    }

    return data || []
  },

  async createProfile(payload: CreateAccountPayload): Promise<ProfileRow> {
    // 1. Create account in auth table (supabase.auth)
    const { data: authData, error: authError } = await supabase.auth.signUp({
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
      role: payload.role as Database['core']['Enums']['user_role'],
      gender: (payload.gender as Database['core']['Enums']['gender_type']) || null,
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
      return fetchedData
    }

    return data
  },
}

