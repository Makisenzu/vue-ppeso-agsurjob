import { supabase } from "@/lib/supabaseClient"
import type { TablesInsert, Tables } from "@/types/database.types"
import { fetchAllInChunks } from '@/helpers/common/supabasePaging'

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

  async removeFromStorage(filePaths: string[], bucket = BUCKET_NAME) {
    if (filePaths.length === 0) return
    const { error } = await supabase.storage.from(bucket).remove(filePaths.map(normalizeStoragePath))
    if (error) throw error
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
  },

  /** Profile picture URL per account (latest profile_media row each), for avatars in lists. */
  async fetchAvatarUrls(profileIds: string[]): Promise<Map<string, string>> {
    const { data, error } = await fetchAllInChunks(profileIds, (chunk) =>
      supabase
        .schema('core')
        .from('profile_media')
        .select('*')
        .in('profile_id', chunk)
        .order('created_at', { ascending: false })
        .order('id')
    )
    if (error) throw error

    // Chunks arrive one after another, so keep the newest row per account across them
    const latest = new Map<string, ProfileMediaRow>()
    for (const row of data as ProfileMediaRow[]) {
      const current = row.profile_id ? latest.get(row.profile_id) : undefined
      if (row.profile_id && (!current || new Date(row.created_at) > new Date(current.created_at))) {
        latest.set(row.profile_id, row)
      }
    }

    const urls = new Map<string, string>()
    for (const [profileId, row] of latest) {
      const source = row as ProfileMediaRow & { public_url?: string | null }
      const url = source.public_url || (row.path ? this.getPublicUrl(row.path) : null)
      if (url) urls.set(profileId, url)
    }
    return urls
  },

  /** An account's latest profile picture, downloaded as a File (e.g. to attach to an application); null without one. */
  async fetchProfilePictureFile(profileId: string): Promise<File | null> {
    const [latest] = await this.fetchMediaByProfileId(profileId)
    const source = latest as (ProfileMediaRow & { public_url?: string | null }) | undefined
    const url = source?.public_url || (latest?.path ? this.getPublicUrl(latest.path) : null)
    if (!url) return null

    const response = await fetch(url)
    if (!response.ok) throw new Error('Your profile picture could not be loaded.')
    const blob = await response.blob()
    const extension = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    return new File([blob], `Profile_Picture.${extension}`, { type: blob.type || 'image/jpeg' })
  },
}
