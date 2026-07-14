import { defineStore } from 'pinia'
import { mediaService } from '@/services/mediaService'
import { fileHelpers } from '@/helpers/fileHelpers'

export const useProfileStore = defineStore('profile', {
  state: () => ({
    currentMedia: null as any,
    isUploading: false
  }),
  
  actions: {
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