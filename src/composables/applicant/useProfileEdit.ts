import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/common/auth'
import { updateApplicantProfile, type UpdateProfileInput } from '@/services/applicant/applicantProfileService'
import { applicantCompletionService } from '@/services/applicant/applicantCompletionService'
import type { ApplicantRecordRow } from '@/types/applicant/applicantCompletion'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { DateFormatter, getLocalTimeZone, parseDate } from '@internationalized/date'

export function useProfileEdit() {
  const authStore = useAuthStore()
  const toastAlert = useToastAlert()
  const route = useRoute()
  const router = useRouter()

  const formData = ref({
    firstname: authStore.profile?.firstname || '',
    middlename: authStore.profile?.middlename || '',
    lastname: authStore.profile?.lastname || '',
    username: authStore.profile?.username || '',
    birthdate: authStore.profile?.birthdate || '',
    contact_number: authStore.profile?.contact_number || '',
    region: authStore.profile?.region || '',
    province: authStore.profile?.province || '',
    geographic: authStore.profile?.geographic || '',
    barangay: authStore.profile?.barangay || '',
    gender: authStore.profile?.gender ?? null,
    is_pwd: authStore.profile?.is_pwd || false,
    is_4ps: authStore.profile?.is_4ps || false,
  })

  const date = ref<any>(
    formData.value.birthdate
      ? parseDate(formData.value.birthdate.slice(0, 10))
      : undefined
  )

  const df = new DateFormatter('en-US', {
    dateStyle: 'long',
  })

  const birthdateLabel = computed(() => {
    if (!date.value) return 'Select birthdate'
    return df.format(date.value.toDate(getLocalTimeZone()))
  })

  const isLoading = ref(false)
  const isOpen = ref(false)
  const errors = ref<Record<string, string>>({})

  const resetForm = (profile?: any) => {
    const p = profile || authStore.profile
    formData.value = {
      firstname: p?.firstname || '',
      middlename: p?.middlename || '',
      lastname: p?.lastname || '',
      username: p?.username || '',
      birthdate: p?.birthdate || '',
      contact_number: p?.contact_number || '',
      gender: p?.gender ?? null,
      is_pwd: p?.is_pwd || false,
      is_4ps: p?.is_4ps || false,
      region: p?.region || '',
      province: p?.province || '',
      geographic: p?.geographic || '',
      barangay: p?.barangay || '',
    }

    date.value = formData.value.birthdate
      ? parseDate(formData.value.birthdate.slice(0, 10))
      : undefined
  }

  watch(isOpen, (newVal) => {
    if (newVal) {
      errors.value = {}
      resetForm()
    }
  })

  watch(
    formData,
    (newVal) => {
      if (newVal.firstname && errors.value.firstname) delete errors.value.firstname
      if (newVal.lastname && errors.value.lastname) delete errors.value.lastname
      if (newVal.username && errors.value.username) delete errors.value.username
      if (newVal.contact_number && errors.value.contact_number) delete errors.value.contact_number
      if (newVal.gender && errors.value.gender) delete errors.value.gender
      if (newVal.region && errors.value.region) delete errors.value.region
      if (newVal.province && errors.value.province) delete errors.value.province
      if (newVal.geographic && errors.value.geographic) delete errors.value.geographic
      if (newVal.barangay && errors.value.barangay) delete errors.value.barangay
    },
    { deep: true }
  )

  const validateForm = () => {
    const nextErrors: Record<string, string> = {}

    if (!formData.value.firstname.trim()) nextErrors.firstname = 'First name is required'
    if (!formData.value.lastname.trim()) nextErrors.lastname = 'Last name is required'
    if (!formData.value.username.trim()) nextErrors.username = 'Username is required'
    if (!formData.value.contact_number.trim()) nextErrors.contact_number = 'Contact number is required'
    if (!formData.value.gender) nextErrors.gender = 'Gender is required'

    errors.value = nextErrors
    return Object.keys(nextErrors).length === 0
  }

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      firstname: 'First Name',
      lastname: 'Last Name',
      username: 'Username',
      contact_number: 'Contact Number',
      gender: 'Gender',
    }
    return labels[field] || field
  }

  /**
   * The database mirrors profile edits onto the NSRP record in the same update
   * (trg_profiles_sync_applicant, migration 029); reload it so the NSRP details show the change.
   */
  const refreshNsrpRecord = async (userId: string) => {
    if (authStore.userRole !== 'applicant') return
    const record: ApplicantRecordRow | null = await applicantCompletionService.fetchMyRecord(userId)
    if (record) authStore.setApplicantProfile(record)
  }

  const handleSubmit = async (location?: { region?: string; province?: string; geographic?: string; barangay?: string }) => {
    errors.value = {}

    if (!validateForm()) return

    isLoading.value = true
    try {
      formData.value.birthdate = date.value ? date.value.toString() : ''

      const userId = authStore.user?.id
      if (!userId) throw new Error('No authenticated user found')

      const updates: UpdateProfileInput = {
        firstname: formData.value.firstname.trim(),
        middlename: formData.value.middlename.trim(),
        lastname: formData.value.lastname.trim(),
        username: formData.value.username.trim(),
        birthdate: formData.value.birthdate || null,
        contact_number: formData.value.contact_number.trim() || null,
        gender: (formData.value?.gender as any) ?? null,
        is_pwd: formData.value.is_pwd || null,
        is_4ps: formData.value.is_4ps || null,
        region: location?.region ?? null,
        province: location?.province ?? null,
        geographic: location?.geographic ?? null,
        barangay: location?.barangay ?? null,
      }
      await updateApplicantProfile(userId, updates)
      await refreshNsrpRecord(userId)

      const previousUsername = authStore.username
      await authStore.fetchProfile(userId)

      // The profile page is addressed by username; move it to the new one so it keeps loading this profile
      if (
        route.name === 'profile' &&
        authStore.username &&
        authStore.username !== previousUsername &&
        String(route.params.username ?? '') === previousUsername
      ) {
        await router.replace({ name: 'profile', params: { username: authStore.username } })
      }

      toastAlert.success('Profile updated successfully')
      isOpen.value = false
    } catch (error: any) {
      toastAlert.error('Update Failed', error.message || 'Failed to update profile')
    } finally {
      isLoading.value = false
    }
  }

  return {
    formData,
    date,
    birthdateLabel,
    isLoading,
    isOpen,
    errors,
    resetForm,
    validateForm,
    handleSubmit,
    getFieldLabel,
  }
}

export default useProfileEdit
