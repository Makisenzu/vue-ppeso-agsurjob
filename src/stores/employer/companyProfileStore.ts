import { ref } from 'vue'
import { defineStore } from 'pinia'
import { establishmentService } from '@/services/common/establishmentService'
import { employerCompletionService } from '@/services/employer/employerCompletionService'
import { updateCompanyMedia, updateCompanyProfile } from '@/services/employer/companyProfileService'
import { mediaService } from '@/services/common/mediaService'
import { useAuthStore } from '@/stores/common/auth'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { fileHelpers } from '@/helpers/common/fileHelpers'
import { buildCompanyPayload, buildEstablishmentForm } from '@/helpers/employer/employerCompletionHelper'
import type { EstablishmentRow } from '@/types/common/establishment'
import type { MapCoordinates } from '@/helpers/common/mapboxHelpers'
import type { EmployerCompletionValues } from '@/types/employer/employerCompletion'
import { getCompanyCoverPath, getCompanyLogoPath } from '@/helpers/employer/companyProfileHelpers'
import type { CompanyMediaKind, CompanyProfileSection } from '@/types/employer/companyProfile'

const errorMessageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message) || fallback

/** Cover photos may be larger than avatars: they are shown full width */
const COVER_MAX_SIZE_MB = 5
const LOGO_MAX_SIZE_MB = 2

/**
 * The owner's company profile: its NSRP Form 2 (employers.establishments), per-section edits and the
 * cover photo and logo. The company row itself lives in the auth store (employerProfile), reloaded after saves.
 */
export const useCompanyProfileStore = defineStore('employerCompanyProfile', () => {
  const authStore = useAuthStore()
  const toastAlert = useToastAlert()

  // ─── State ───
  const establishment = ref<EstablishmentRow | null>(null)
  const isLoadingEstablishment = ref(false)
  const isSaving = ref(false)
  const isUpdatingCover = ref(false)
  const isUpdatingLogo = ref(false)

  /** Per image: media folder (inside the owner's uid folder), size limit and the saved path */
  const MEDIA_META = {
    cover: {
      label: 'Cover photo',
      folder: 'company-cover',
      maxSizeMB: COVER_MAX_SIZE_MB,
      isUpdating: isUpdatingCover,
      currentPath: getCompanyCoverPath,
    },
    logo: {
      label: 'Logo',
      folder: 'company-logo',
      maxSizeMB: LOGO_MAX_SIZE_MB,
      isUpdating: isUpdatingLogo,
      currentPath: getCompanyLogoPath,
    },
  } satisfies Record<CompanyMediaKind, unknown>

  // ─── Actions ───

  async function fetchEstablishment(): Promise<void> {
    const establishmentId = authStore.employerEstablishment?.id
    if (!establishmentId) {
      establishment.value = null
      return
    }
    isLoadingEstablishment.value = true
    try {
      establishment.value = await establishmentService.fetchEstablishmentById(establishmentId)
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to load your NSRP Form 2.'))
    } finally {
      isLoadingEstablishment.value = false
    }
  }

  /**
   * Saves one section. The company row is derived from Form 2 (buildCompanyPayload); Form 2 itself is
   * only rewritten when the section holds Form 2 fields, because any company edit sends it back to PESO.
   */
  async function saveSection(section: CompanyProfileSection, values: EmployerCompletionValues): Promise<boolean> {
    const profileId = authStore.user?.id
    const company = authStore.employerProfile
    if (!profileId || !company) return false

    isSaving.value = true
    try {
      await employerCompletionService.updateCompany(company.id, buildCompanyPayload(values, profileId))
      if (section !== 'about' && establishment.value) {
        establishment.value = await establishmentService.updateEstablishment(
          establishment.value.id,
          buildEstablishmentForm(values),
        )
      }
      await authStore.hydrateUserData(profileId, true)
      toastAlert.success(
        'Company profile updated',
        section === 'about' ? undefined : 'Your NSRP Form 2 was sent to PESO for review again.',
      )
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to save your company profile.'))
      return false
    } finally {
      isSaving.value = false
    }
  }

  /** Sets (or clears, with null) the company's map pin. Not part of Form 2, so no PESO re-review. */
  async function saveLocation(coordinates: MapCoordinates | null): Promise<boolean> {
    const profileId = authStore.user?.id
    const company = authStore.employerProfile
    if (!profileId || !company) return false

    isSaving.value = true
    try {
      await updateCompanyProfile(company.id, {
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
      })
      await authStore.hydrateUserData(profileId, true)
      toastAlert.success(coordinates ? 'Company location updated' : 'Company location removed')
      return true
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, 'Failed to save the company location.'))
      return false
    } finally {
      isSaving.value = false
    }
  }

  /** Uploads a new cover or logo into the owner's media folder and removes the previous file. */
  async function uploadMedia(kind: CompanyMediaKind, file: File): Promise<void> {
    const profileId = authStore.user?.id
    const company = authStore.employerProfile
    if (!profileId || !company) return

    const meta = MEDIA_META[kind]
    meta.isUpdating.value = true
    try {
      fileHelpers.isValidImage(file, undefined, meta.maxSizeMB)
      const path = fileHelpers.generateUniquePath(`${profileId}/${meta.folder}`, file.name)
      const previousPath = meta.currentPath(company)
      await mediaService.uploadToStorage(file, path)
      await updateCompanyMedia(company.id, kind, path)
      if (previousPath) await mediaService.removeFromStorage([previousPath]).catch(() => {})
      await authStore.hydrateUserData(profileId, true)
      toastAlert.success(`${meta.label} updated`)
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, `Failed to upload the ${meta.label.toLowerCase()}.`))
    } finally {
      meta.isUpdating.value = false
    }
  }

  async function removeMedia(kind: CompanyMediaKind): Promise<void> {
    const profileId = authStore.user?.id
    const company = authStore.employerProfile
    const meta = MEDIA_META[kind]
    const previousPath = meta.currentPath(company)
    if (!profileId || !company || !previousPath) return

    meta.isUpdating.value = true
    try {
      await updateCompanyMedia(company.id, kind, null)
      await mediaService.removeFromStorage([previousPath]).catch(() => {})
      await authStore.hydrateUserData(profileId, true)
      toastAlert.success(`${meta.label} removed`)
    } catch (error: unknown) {
      toastAlert.error('Error', errorMessageOf(error, `Failed to remove the ${meta.label.toLowerCase()}.`))
    } finally {
      meta.isUpdating.value = false
    }
  }

  return {
    // State
    establishment,
    isLoadingEstablishment,
    isSaving,
    isUpdatingCover,
    isUpdatingLogo,
    // Actions
    fetchEstablishment,
    saveSection,
    saveLocation,
    uploadMedia,
    removeMedia,
  }
})
