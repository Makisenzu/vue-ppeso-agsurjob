import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProfileRow, CreateAccountPayload } from '@/types/admin/userAccounts'
import { userAccountService } from '@/services/admin/userAccountService'
import { getPersistentCacheValue } from '@/helpers/common/persistentCache'
import { useToastAlert } from '@/composables/common/useToastAlert'

const USER_ACCOUNTS_CACHE_KEY = 'admin:user-accounts:profiles'

export const useUserAccountsStore = defineStore('userAccounts', () => {
  const toastAlert = useToastAlert()

  const profiles = ref<ProfileRow[]>([])
  const isLoading = ref<boolean>(false)
  const isSubmitting = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const selectedProfile = ref<ProfileRow | null>(null)
  const isDetailsOpen = ref<boolean>(false)
  const isAddAccountOpen = ref<boolean>(false)
  const isEditStatusOpen = ref<boolean>(false)

  const fetchProfiles = async () => {
    errorMessage.value = null

    const cachedProfiles = getPersistentCacheValue<ProfileRow[]>(USER_ACCOUNTS_CACHE_KEY)
    if (cachedProfiles !== null) {
      profiles.value = cachedProfiles
    }

    isLoading.value = cachedProfiles === null

    try {
      const fetched = await userAccountService.fetchAllProfiles(false)
      // Re-assign with a new array reference so Vue/Tanstack Table reactivity updates instantly
      profiles.value = [...fetched]
    } catch (err: any) {
      const msg = err.message || 'Failed to load user account profiles.'
      errorMessage.value = msg
      toastAlert.error('Error Loading Profiles', msg)
    } finally {
      isLoading.value = false
    }
  }

  const refreshProfiles = async () => {
    errorMessage.value = null
    isLoading.value = true

    try {
      const fetched = await userAccountService.fetchAllProfiles(true)
      // Re-assign with a new array reference so Vue/Tanstack Table reactivity updates instantly
      profiles.value = [...fetched]
      toastAlert.success('Data Refreshed', 'User accounts data has been refreshed.')
    } catch (err: any) {
      const msg = err.message || 'Failed to refresh user account profiles.'
      errorMessage.value = msg
      toastAlert.error('Refresh Failed', msg)
    } finally {
      isLoading.value = false
    }
  }

  const openProfileDetails = (profile: ProfileRow) => {
    selectedProfile.value = profile
    isDetailsOpen.value = true
  }

  const closeProfileDetails = () => {
    isDetailsOpen.value = false
  }

  const openAddAccountSheet = () => {
    isAddAccountOpen.value = true
  }

  const closeAddAccountSheet = () => {
    isAddAccountOpen.value = false
  }

  const openEditStatusModal = (profile: ProfileRow) => {
    selectedProfile.value = profile
    isEditStatusOpen.value = true
  }

  const closeEditStatusModal = () => {
    isEditStatusOpen.value = false
  }

  const updateAccountStatus = async (profileId: string, newStatus: string) => {
    isSubmitting.value = true
    errorMessage.value = null
    try {
      const updated = await userAccountService.updateProfileStatus(profileId, newStatus)
      // Update local state reactive array with a fresh array reference so Vue & TanStack Table update instantly
      profiles.value = profiles.value.map((p) =>
        p.id === profileId ? { ...p, ...updated, status: updated.status } : p
      )

      // Invalidate cached list so revisit/load stays fresh after mutation
      // (service also removes the cache key after successful writes)
      if (selectedProfile.value?.id === profileId) {
        selectedProfile.value = {
          ...selectedProfile.value,
          ...updated,
          status: updated.status,
        }
      }
      closeEditStatusModal()
      toastAlert.success('Account Status Updated', `Status successfully changed to ${newStatus}.`)
    } catch (err: any) {
      const msg = err.message || 'Failed to update account status.'
      errorMessage.value = msg
      toastAlert.error('Update Failed', msg)
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  const createAccount = async (payload: CreateAccountPayload) => {
    isSubmitting.value = true
    errorMessage.value = null
    try {
      const newProfile = await userAccountService.createProfile(payload)
      closeAddAccountSheet()
      // Prepend newly created profile directly into the local state array
      profiles.value = [newProfile, ...profiles.value]
      toastAlert.success('Account Created', `Account for ${payload.firstname} ${payload.lastname} created successfully.`)
    } catch (err: any) {
      const msg = err.message || 'Failed to create user account.'
      errorMessage.value = msg
      toastAlert.error('Creation Failed', msg)
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    toastAlert.info('Copied to Clipboard', 'User ID copied to clipboard.')
  }

  return {
    profiles,
    isLoading,
    isSubmitting,
    errorMessage,
    selectedProfile,
    isDetailsOpen,
    isAddAccountOpen,
    isEditStatusOpen,
    fetchProfiles,
    refreshProfiles,
    openProfileDetails,
    closeProfileDetails,
    openAddAccountSheet,
    closeAddAccountSheet,
    openEditStatusModal,
    closeEditStatusModal,
    updateAccountStatus,
    createAccount,
    copyId,
  }
})
