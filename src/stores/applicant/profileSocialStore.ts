import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { profileSocialService, type ProfileSocialRow } from '@/services/applicant/profileSocialService'
import { normalizeSocialLink } from '@/helpers/applicant/profileSocialHelper'

/** One row of the editor; `id` is set for links that are already saved. */
export interface ProfileSocialDraft {
  id?: number
  social_name: string
  social_link: string
}

export const useProfileSocialStore = defineStore('profileSocial', () => {
  const toastAlert = useToastAlert()

  // ─── State ───
  const socials = ref<ProfileSocialRow[]>([])
  const loadedProfileId = ref<string | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)

  // ─── UI Flags ───
  const isEditorOpen = ref(false)

  // ─── Actions ───
  const fetchSocials = async (profileId: string) => {
    isLoading.value = true
    try {
      socials.value = await profileSocialService.fetchByProfileId(profileId)
      loadedProfileId.value = profileId
    } catch (error: any) {
      socials.value = []
      toastAlert.error('Error', error.message)
    } finally {
      isLoading.value = false
    }
  }

  /** Saves the editor rows: inserts new ones, updates changed ones, deletes removed ones. */
  const saveSocials = async (profileId: string, drafts: ProfileSocialDraft[]) => {
    isSaving.value = true
    try {
      const rows = drafts.map((d) => ({ ...d, social_link: normalizeSocialLink(d.social_link) }))
      const keptIds = new Set(rows.filter((r) => r.id).map((r) => r.id))
      const removedIds = socials.value.filter((s) => !keptIds.has(s.id)).map((s) => s.id)
      const changed = rows.filter((r) => {
        const saved = r.id ? socials.value.find((s) => s.id === r.id) : null
        return saved && (saved.social_name !== r.social_name || saved.social_link !== r.social_link)
      })

      await profileSocialService.remove(removedIds)
      await Promise.all(
        changed.map((r) =>
          profileSocialService.update(r.id!, { social_name: r.social_name, social_link: r.social_link })
        )
      )
      await profileSocialService.create(
        rows
          .filter((r) => !r.id)
          .map((r) => ({ profile_id: profileId, social_name: r.social_name, social_link: r.social_link }))
      )

      socials.value = [...(await profileSocialService.fetchByProfileId(profileId))]
      isEditorOpen.value = false
      toastAlert.success('Social links updated')
    } catch (error: any) {
      toastAlert.error('Error', error.message)
    } finally {
      isSaving.value = false
    }
  }

  return { socials, loadedProfileId, isLoading, isSaving, isEditorOpen, fetchSocials, saveSocials }
})
