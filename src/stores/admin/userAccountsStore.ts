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

  const updateAccountStatus = async (profileId: string, newStatus: string, remarks?: string | null) => {
    isSubmitting.value = true
    errorMessage.value = null
    try {
      const updated = await userAccountService.updateProfileStatus(profileId, newStatus, remarks)
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

  // ─── Delete account ───
  /** Account waiting for the admin to confirm its deletion */
  const accountToDelete = ref<ProfileRow | null>(null)
  const isDeleting = ref(false)

  const requestDeleteAccount = (profile: ProfileRow) => {
    accountToDelete.value = profile
  }

  const cancelDeleteAccount = () => {
    if (!isDeleting.value) accountToDelete.value = null
  }

  /** A tap on the hold-to-delete button: say how to confirm */
  const remindHoldToDelete = () => {
    toastAlert.info('Keep holding', 'Press and hold the button to delete this account.')
  }

  const deleteAccount = async (): Promise<boolean> => {
    const target = accountToDelete.value
    if (!target) return false
    isDeleting.value = true
    try {
      const { filesLeft } = await userAccountService.deleteAccount(target.id)
      profiles.value = profiles.value.filter((p) => p.id !== target.id)
      if (selectedProfile.value?.id === target.id) {
        selectedProfile.value = null
        isDetailsOpen.value = false
        isEditStatusOpen.value = false
      }
      accountToDelete.value = null
      const name = [target.firstname, target.lastname].filter(Boolean).join(' ') || target.email || 'The account'
      toastAlert.success('Account Deleted', `${name} and all its data have been deleted.`)
      if (filesLeft) toastAlert.info('Some files remain', 'A few uploaded files could not be removed from storage.')
      return true
    } catch (err: any) {
      toastAlert.error('Delete Failed', err.message || 'Failed to delete the account.')
      return false
    } finally {
      isDeleting.value = false
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
    accountToDelete,
    isDeleting,
    requestDeleteAccount,
    cancelDeleteAccount,
    deleteAccount,
    remindHoldToDelete,
    copyId,
  }
})
