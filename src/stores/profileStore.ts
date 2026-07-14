import { defineStore } from 'pinia'
import { mediaService, type ProfileMediaRow } from '@/services/mediaService'
import { fileHelpers } from '@/helpers/fileHelpers'

export interface ProfileMediaWithUrl extends ProfileMediaRow {
  public_url: string
}

export const useProfileStore = defineStore('profile', {
  state: () => ({
    currentMedia: null as ProfileMediaWithUrl | null,
    isUploading: false,
    isFetchingMedia: false
  }),
  
  actions: {
    async fetchProfileMedia(profileId: string) {
      this.isFetchingMedia = true
      try {
        const mediaRecords = await mediaService.fetchMediaByProfileId(profileId)
        
        if (mediaRecords.length > 0) {
          const latest = mediaRecords[0]
          if (latest.path) {
            const publicUrl = mediaService.getPublicUrl(latest.path)
            this.currentMedia = { ...latest, public_url: publicUrl }
          }
        } else {
          this.currentMedia = null
        }
      } catch (error) {
        console.error('Fetch Profile Media Error:', error)
        this.currentMedia = null
      } finally {
        this.isFetchingMedia = false
      }
    },

    async uploadProfilePicture(userId: string, file: File) {
      this.isUploading = true
      try {
        fileHelpers.isValidImage(file)
        const filePath = fileHelpers.generateUniquePath(userId, file.name)
        await mediaService.uploadToStorage(file, filePath)
        const mediaRecord = await mediaService.saveMediaRecord({
          profile_id: userId,
          filename: file.name,
          path: filePath,
          mime_type: file.type,
          size: file.size,
          alt_text: `Profile picture of user ${userId}`,
          description: 'User uploaded profile avatar'
        })

        const publicUrl = mediaService.getPublicUrl(filePath)
        this.currentMedia = { ...mediaRecord, public_url: publicUrl }
        return this.currentMedia
      } catch (error) {
        console.error('Store Upload Error:', error)
        throw error
      } finally {
        this.isUploading = false
      }
    }
  }
})