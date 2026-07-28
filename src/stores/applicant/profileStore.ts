import { defineStore } from 'pinia'
import { mediaService, type ProfileMediaRow } from '@/services/common/mediaService'
import { fileHelpers } from '@/helpers/common/fileHelpers'

export interface ProfileMediaWithUrl extends ProfileMediaRow {
  public_url: string
}

// Wait for the uploaded image to be available over HTTP
async function waitForImageAvailability(url: string, timeout = 10000, interval = 500) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return
    } catch (e) {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, interval))
  }
  throw new Error('Uploaded image is not yet available')
}

async function preloadImage(url: string, timeout = 10000) {
  await new Promise<void>((resolve, reject) => {
    const image = new Image()
    const timer = window.setTimeout(() => {
      image.onload = null
      image.onerror = null
      reject(new Error('Uploaded image failed to load'))
    }, timeout)

    image.onload = () => {
      window.clearTimeout(timer)
      resolve()
    }

    image.onerror = () => {
      window.clearTimeout(timer)
      reject(new Error('Uploaded image failed to load'))
    }

    image.src = url
  })
}

export const useProfileStore = defineStore('profile', {
  state: () => ({
    currentMedia: null as ProfileMediaWithUrl | null,
    previousMedia: null as ProfileMediaWithUrl | null,
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

    async uploadProfilePicture(userId: string, file: File, currentUrl?: string) {
      this.isUploading = true
      // If currentUrl is provided, create a temporary media object to show during upload
      if (currentUrl && !this.previousMedia) {
        // If we don't have a full currentMedia, just store a minimal previousMedia with the URL
        if (this.currentMedia) {
          this.previousMedia = {
            ...this.currentMedia,
            public_url: currentUrl
          }
        } else {
          this.previousMedia = ({ public_url: currentUrl } as unknown) as ProfileMediaWithUrl
        }
      } else {
        // Store the previous media to keep it visible during upload
        this.previousMedia = this.currentMedia
      }
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
        // Wait until the uploaded file is actually served by the storage CDN
        await waitForImageAvailability(publicUrl, 10000, 500)
        // Warm the browser cache before exposing the new URL to the UI.
        await preloadImage(publicUrl)
        this.currentMedia = { ...mediaRecord, public_url: publicUrl }
        this.previousMedia = null
        return this.currentMedia
      } catch (error) {
        console.error('Store Upload Error:', error)
        // Restore previous media on error to keep showing old image
        this.previousMedia = null
        throw error
      } finally {
        this.isUploading = false
      }
    }
  }
})