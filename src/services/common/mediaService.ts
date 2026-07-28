import { supabase } from "@/lib/supabaseClient"
import type { TablesInsert, Tables } from "@/types/common/database.types"

const BUCKET_NAME = 'media'

function normalizeStoragePath(filePath: string) {
  return decodeURIComponent(filePath)
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/')
}

export type ProfileMediaInsert = TablesInsert<{ schema: 'core' }, 'profile_media'>
export type ProfileMediaRow = Tables<{ schema: 'core' }, 'profile_media'>

export const mediaService = {
  async uploadToStorage(file: File, filePath: string, bucket = BUCKET_NAME) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true })

    if (error) throw error
    return data
  },

  getPublicUrl(filePath: string, bucket = BUCKET_NAME) {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath
    }

    const cleanPath = normalizeStoragePath(filePath)

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(cleanPath)

    return data.publicUrl
  },

  async saveMediaRecord(mediaData: ProfileMediaInsert) {
    const { data, error } = await supabase
      .schema('core')
      .from('profile_media')
      .insert([mediaData])
      .select()
      .single()

    if (error) throw error
    return data as ProfileMediaRow
  },

  async fetchMediaByProfileId(profileId: string): Promise<ProfileMediaRow[]> {
    const { data, error } = await supabase
      .schema('core')
      .from('profile_media')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as ProfileMediaRow[]
  }
}