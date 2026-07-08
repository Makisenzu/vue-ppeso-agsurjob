import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { storeToRefs } from 'pinia'

export function useAuth() {
  const router = useRouter()
  const authStore = useAuthStore()
  const { displayName, userInitials, userEmail, isVerified, username } = storeToRefs(authStore)

  // Show skeleton while store hasn't loaded yet
  const isLoading = ref(!authStore.isInitialized)
  const profileUsername = computed(() => username.value || '')

  const redirectToLogin = async () => {
    try {
      await router.replace('/login')
    } catch {
      window.location.assign('/login')
    }
  }

  const handleSignOut = async () => {
    try {
      await authService.logout()
      await redirectToLogin()
    } catch (error: any) {
      toast.error(error.message || 'Error signing out')
    }
  }

  return {
    displayName,
    userInitials,
    userEmail,
    isVerified,
    profileUsername,
    isLoading,
    handleSignOut
  }
}
