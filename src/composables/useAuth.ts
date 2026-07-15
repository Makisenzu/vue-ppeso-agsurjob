import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { storeToRefs } from 'pinia'

export function useAuth() {
  const router = useRouter()
  const authStore = useAuthStore()

  let displayName; let userInitials; let userEmail; let isVerified; let username; let isHydrating; let isInitialized;
  try {
    const refs = storeToRefs(authStore)
    displayName = refs.displayName
    userInitials = refs.userInitials
    userEmail = refs.userEmail
    isVerified = refs.isVerified
    username = refs.username
    isHydrating = refs.isHydrating
    isInitialized = refs.isInitialized
  } catch (err) {
    displayName = computed(() => 'User')
    userInitials = computed(() => 'U')
    userEmail = computed(() => '')
    isVerified = computed(() => false)
    username = computed(() => '')
    isHydrating = computed(() => false)
    isInitialized = computed(() => true)
  }

  // Show skeleton while store hasn't loaded yet
  const isLoading = computed(() => !isInitialized.value || isHydrating.value)
  const profileUsername = computed(() => username.value || '')

  const redirectToLogin = async () => {
    try {
      await router.replace({ name: 'login' })
    } catch {
      window.location.assign('/login')
    }
  }

  const handleSignOut = async () => {
    try {
      await authService.logout()
      // proactively clear local auth state to avoid a race with the router guard
      try {
        // clear session/user and other session data
        // use $patch to ensure reactive store values are updated
        // @ts-ignore - Pinia store has $patch at runtime
        authStore.$patch({ session: null, user: null })
        authStore.clearSessionData()
      } catch (e) {
        // non-fatal
      }

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
