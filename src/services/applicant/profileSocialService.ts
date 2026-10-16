import { supabase } from '@/lib/supabaseClient'
import type { PostgrestError } from '@supabase/supabase-js'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type ProfileSocialRow = Tables<{ schema: 'core' }, 'profile_socials'>
export type ProfileSocialInsert = TablesInsert<{ schema: 'core' }, 'profile_socials'>
export type ProfileSocialUpdate = TablesUpdate<{ schema: 'core' }, 'profile_socials'>

/** `social_link` is UNIQUE across all profiles, so explain that conflict in plain words. */
function toSocialError(error: PostgrestError, fallback: string): Error {
  if (error.code === '23505') return new Error('One of these links is already used on another profile.')
  return new Error(error.message || fallback)
}

export const profileSocialService = {
  async fetchByProfileId(profileId: string): Promise<ProfileSocialRow[]> {
    const { data, error } = await supabase
      .schema('core')
      .from('profile_socials')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message || 'Failed to load social links')
    return data ?? []
  },

  async create(payload: ProfileSocialInsert[]): Promise<ProfileSocialRow[]> {
    if (payload.length === 0) return []
    const { data, error } = await supabase
      .schema('core')
      .from('profile_socials')
      .insert(payload)
      .select()

    if (error) throw toSocialError(error, 'Failed to add social links')
    return data ?? []
  },

  async update(id: number, payload: ProfileSocialUpdate): Promise<ProfileSocialRow> {
    const { data, error } = await supabase
      .schema('core')
      .from('profile_socials')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw toSocialError(error, 'Failed to update social link')
    return data
  },

  async remove(ids: number[]): Promise<void> {
    if (ids.length === 0) return
    const { error } = await supabase
      .schema('core')
      .from('profile_socials')
      .delete()
      .in('id', ids)

    if (error) throw new Error(error.message || 'Failed to remove social links')
  },
}
