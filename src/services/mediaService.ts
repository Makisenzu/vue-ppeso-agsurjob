import { supabase } from "@/lib/supabaseClient"

const BUCKET_NAME = 'profile_media'

export const mediaService = {
  async uploadToStorage(file: File, filePath: string, bucket = BUCKET_NAME) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true })

    if (error) throw error
    return data
  },

  getPublicUrl(filePath: string, bucket = BUCKET_NAME) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return data.publicUrl
  },

  async saveMediaRecord(mediaData: {
    profile_id: string
    filename: string
    path: string
    mime_type: string
    size: number
    alt_text: string
    description: string
  }) {
    const { data, error } = await supabase
      .from('profile_media')
      .insert([mediaData])
      .select()
      .single()

    if (error) throw error
    return data
  }
}