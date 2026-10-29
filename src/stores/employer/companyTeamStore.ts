import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  deleteCompanyTeamMember,
  fetchCompanyTeamMembers,
  insertCompanyTeamMember,
  updateCompanyTeamMember,
} from '@/services/employer/companyTeamService'
import { mediaService } from '@/services/common/mediaService'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { fileHelpers } from '@/helpers/common/fileHelpers'
import type { CompanyTeamMember, CompanyTeamMemberFormValues } from '@/types/employer/companyProfile'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

const PHOTO_MAX_SIZE_MB = 2

/**
 * Team members on the owner's company profile (employers.company_team_members, migration 077).
 * Photos live in the owner's media folder: <uid>/company-team/<file>.
 */
export const useCompanyTeamStore = defineStore('employerCompanyTeam', () => {
  const authStore = useAuthStore()
  const toastAlert = useToastAlert()

  // ─── State ───
  const members = ref<CompanyTeamMember[]>([])
  const isLoading = ref(false)
  const isSaving = ref(false)
  const deletingId = ref<string | null>(null)

  // ─── Actions ───

  async function fetchMembers(): Promise<void> {
    const companyId = authStore.employerProfile?.id
    if (!companyId) {
      members.value = []
      return
    }
    isLoading.value = true
    try {
      members.value = await fetchCompanyTeamMembers(companyId)
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to load your team members.'))
    } finally {
      isLoading.value = false
    }
  }

  /** Uploads the photo first, so a failed upload never leaves a row pointing at a missing file */
  async function uploadPhoto(file: File): Promise<string> {
    const profileId = authStore.user?.id
    if (!profileId) throw new Error('You are signed out.')
    fileHelpers.isValidImage(file, undefined, PHOTO_MAX_SIZE_MB)
    const path = fileHelpers.generateUniquePath(`${profileId}/company-team`, file.name)
    await mediaService.uploadToStorage(file, path)
    return path
  }

  /**
   * Adds a member (no id) or updates one. `photo`: a File replaces the photo, null removes it,
   * undefined keeps it.
   */
  async function saveMember(
    id: string | null,
    values: CompanyTeamMemberFormValues,
    photo: File | null | undefined,
  ): Promise<boolean> {
    const companyId = authStore.employerProfile?.id
    if (!companyId) return false

    const existing = id ? members.value.find((member) => member.id === id) : undefined
    isSaving.value = true
    let uploadedPath: string | null = null
    try {
      if (photo) uploadedPath = await uploadPhoto(photo)
      const fields = {
        full_name: values.full_name.trim(),
        position: values.position.trim() || null,
        ...(photo !== undefined ? { photo_path: uploadedPath } : {}),
      }

      if (existing) {
        const saved = await updateCompanyTeamMember(existing.id, fields)
        members.value = members.value.map((member) => (member.id === saved.id ? saved : member))
        if (photo !== undefined && existing.photo_path) {
          await mediaService.removeFromStorage([existing.photo_path]).catch(() => {})
        }
      } else {
        const sortOrder = Math.max(-1, ...members.value.map((member) => member.sort_order)) + 1
        const saved = await insertCompanyTeamMember(companyId, { ...fields, sort_order: sortOrder })
        members.value = [...members.value, saved]
      }
      toastAlert.success(existing ? 'Team member updated' : 'Team member added')
      return true
    } catch (error: unknown) {
      if (uploadedPath) await mediaService.removeFromStorage([uploadedPath]).catch(() => {})
      toastAlert.error('Error', errorMessageOf(error, 'Failed to save the team member.'))
      return false
    } finally {
      isSaving.value = false
    }
  }

  async function deleteMember(id: string): Promise<void> {
    const member = members.value.find((row) => row.id === id)
    if (!member) return

    deletingId.value = id
    try {
      await deleteCompanyTeamMember(id)
      if (member.photo_path) await mediaService.removeFromStorage([member.photo_path]).catch(() => {})
      members.value = members.value.filter((row) => row.id !== id)
      toastAlert.success('Team member removed')
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to remove the team member.'))
    } finally {
      deletingId.value = null
    }
  }

  return {
    // State
    members,
    isLoading,
    isSaving,
    deletingId,
    // Actions
    fetchMembers,
    saveMember,
    deleteMember,
  }
})
