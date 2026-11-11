import { computed, ref, type Ref } from 'vue'
import { directoryService } from '@/services/common/directoryService'
import { mediaService } from '@/services/common/mediaService'
import { privacyService } from '@/services/common/privacyService'
import { useToastAlert } from '@/composables/common/useToastAlert'
import {
  GIP_ID_POSITION,
  gipIdCardSvg,
  gipIdFullName,
  loadGipIdFont,
  printGipId,
  type GipIdCardData,
} from '@/helpers/peso/provincialPeso/gipIdHelper'
import type { GipInternRecord } from '@/types/peso/provincialPeso/gip'

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PHOTO_MAX_BYTES = 10 * 1024 * 1024
const NICKNAME_MAX = 20

type PhotoSource = 'profile' | 'upload' | 'none'

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('The photo could not be read.'))
    reader.readAsDataURL(file)
  })

/**
 * GIP Tracker → intern → Generate ID: asks for the nickname and an optional photo (the intern's profile
 * picture when they have an account, or an uploaded one for anyone), then previews and prints the ID laid out
 * like public/templates/GIP_ID.docx. Nothing is saved: an uploaded photo stays in the browser.
 */
export function useGipIdCard(intern: Ref<GipInternRecord | null>) {
  const toastAlert = useToastAlert()

  const isOpen = ref(false)
  const step = ref<'form' | 'preview'>('form')
  const nickname = ref('')
  const nicknameError = ref<string | null>(null)

  const profilePhotoUrl = ref<string | null>(null)
  const uploadedPhotoUrl = ref<string | null>(null)
  const photoSource = ref<PhotoSource>('none')
  const photoError = ref<string | null>(null)
  const isLoadingPhoto = ref(false)

  const officeCode = ref<string | null>(null)
  const cardData = ref<GipIdCardData | null>(null)
  const previewSvg = ref('')
  const isGenerating = ref(false)
  const isPrinting = ref(false)

  const photoUrl = computed(() =>
    photoSource.value === 'profile' ? profilePhotoUrl.value : photoSource.value === 'upload' ? uploadedPhotoUrl.value : null,
  )

  /** The office's code from the directory (PPESO), else the name on the deployment */
  async function resolveOffice(name: string): Promise<string> {
    const key = name.trim().toLowerCase()
    if (!key) return ''
    try {
      const offices = await directoryService.fetchActiveOffices()
      const match = offices.find((office) => office.office_name.trim().toLowerCase() === key || office.office_code.trim().toLowerCase() === key)
      return match?.office_code.trim() || name.trim()
    } catch {
      return name.trim()
    }
  }

  async function loadProfilePhoto(profileId: string | null) {
    profilePhotoUrl.value = null
    if (!profileId) return
    isLoadingPhoto.value = true
    try {
      profilePhotoUrl.value = (await mediaService.fetchAvatarUrls([profileId])).get(profileId) ?? null
    } catch {
      // No profile picture: the frame stays empty unless one is uploaded
    } finally {
      isLoadingPhoto.value = false
    }
  }

  async function open() {
    const current = intern.value
    if (!current) return
    isOpen.value = true
    step.value = 'form'
    nickname.value = ''
    nicknameError.value = null
    photoError.value = null
    uploadedPhotoUrl.value = null
    cardData.value = null
    previewSvg.value = ''
    const profileId = (current.rawApplicant?.profile_id as string | null | undefined) ?? null
    await Promise.all([loadProfilePhoto(profileId), resolveOffice(current.assignedOffice).then((code) => (officeCode.value = code))])
    photoSource.value = profilePhotoUrl.value ? 'profile' : 'none'
  }

  async function onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    photoError.value = null
    if (!PHOTO_TYPES.includes(file.type)) {
      photoError.value = 'Use a JPG, PNG or WebP photo.'
      return
    }
    if (file.size > PHOTO_MAX_BYTES) {
      photoError.value = 'The photo is over 10MB.'
      return
    }
    try {
      uploadedPhotoUrl.value = await readAsDataUrl(file)
      photoSource.value = 'upload'
    } catch {
      photoError.value = 'The photo could not be read.'
    }
  }

  function setPhotoSource(source: PhotoSource) {
    photoSource.value = source
    if (source !== 'upload') photoError.value = null
  }

  async function generate() {
    const current = intern.value
    if (!current) return
    const name = nickname.value.replace(/\s+/g, ' ').trim()
    if (!name) {
      nicknameError.value = 'Enter the intern’s nickname.'
      return
    }
    if (name.length > NICKNAME_MAX) {
      nicknameError.value = `Keep the nickname to ${NICKNAME_MAX} characters.`
      return
    }
    nicknameError.value = null
    isGenerating.value = true
    try {
      await loadGipIdFont()
      cardData.value = {
        nickname: name,
        fullName: gipIdFullName(current.rawApplicant, current.fullName),
        position: GIP_ID_POSITION,
        office: officeCode.value || current.assignedOffice,
        photoUrl: photoUrl.value,
      }
      previewSvg.value = gipIdCardSvg(cardData.value, 'gip-id-preview')
      step.value = 'preview'
    } finally {
      isGenerating.value = false
    }
  }

  async function print() {
    const current = intern.value
    if (!cardData.value || !current || isPrinting.value) return
    isPrinting.value = true
    try {
      await printGipId(cardData.value)
      // Printing an ID puts the intern's name and photo on paper (PRIVACY.md §5.2)
      void privacyService.logPersonalDataAccess('EXPORT', 'esmdd.gip', current.id, { document: 'gip_id' })
    } catch (error) {
      toastAlert.error('Print Failed', (error instanceof Error && error.message) || 'The ID could not be printed.')
    } finally {
      isPrinting.value = false
    }
  }

  return {
    isOpen,
    step,
    nickname,
    nicknameMax: NICKNAME_MAX,
    nicknameError,
    profilePhotoUrl,
    uploadedPhotoUrl,
    photoSource,
    photoUrl,
    photoError,
    isLoadingPhoto,
    officeCode,
    previewSvg,
    isGenerating,
    isPrinting,
    open,
    onPhotoSelected,
    setPhotoSource,
    generate,
    print,
    backToForm: () => (step.value = 'form'),
  }
}
