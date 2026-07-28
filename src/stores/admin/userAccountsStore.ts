import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProfileRow, CreateAccountPayload } from '@/types/admin/userAccounts'
import { userAccountService } from '@/services/admin/userAccountService'

export const useUserAccountsStore = defineStore('userAccounts', () => {
  const profiles = ref<ProfileRow[]>([])
  const isLoading = ref<boolean>(false)
  const isSubmitting = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const selectedProfile = ref<ProfileRow | null>(null)
  const isDetailsOpen = ref<boolean>(false)
  const isAddAccountOpen = ref<boolean>(false)

  const fetchProfiles = async () => {
    isLoading.value = true
    errorMessage.value = null
    try {
      const fetched = await userAccountService.fetchAllProfiles()
      // Re-assign with a new array reference so Vue/Tanstack Table reactivity updates instantly
      profiles.value = [...fetched]
    } catch (err: any) {
      errorMessage.value = err.message || 'Failed to load user account profiles.'
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

  const createAccount = async (payload: CreateAccountPayload) => {
    isSubmitting.value = true
    errorMessage.value = null
    try {
      const newProfile = await userAccountService.createProfile(payload)
      // Close sheet immediately
      closeAddAccountSheet()
      // Prepend newly created profile directly into the local state array (pure AJAX-like immediate UI update)
      profiles.value = [newProfile, ...profiles.value]
    } catch (err: any) {
      errorMessage.value = err.message || 'Failed to create user account.'
      throw err
    } finally {
      isSubmitting.value = false
    }
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
  }

  return {
    profiles,
    isLoading,
    isSubmitting,
    errorMessage,
    selectedProfile,
    isDetailsOpen,
    isAddAccountOpen,
    fetchProfiles,
    openProfileDetails,
    closeProfileDetails,
    openAddAccountSheet,
    closeAddAccountSheet,
    createAccount,
    copyId,
  }
})
