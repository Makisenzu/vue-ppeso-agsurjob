import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProfileRow, CreateAccountPayload } from '@/types/admin/userAccounts'
import { userAccountService } from '@/services/admin/userAccountService'
import { useToastAlert } from '@/composables/common/useToastAlert'

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
    isLoading.value = true
    errorMessage.value = null
    try {
      const fetched = await userAccountService.fetchAllProfiles()
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
      // Close sheet immediately
      closeAddAccountSheet()
      // Prepend newly created profile directly into the local state array (pure AJAX-like immediate UI update)
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
