import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const useAuthStore = defineStore('auth', () => {

  // ─── Session State ───
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const profile = ref<{
    firstname: string | null
    middlename: string | null
    lastname: string | null
    status: string | null
    role: Database["public"]["Enums"]["user_role"] | null
    username: string | null
  } | null>(null)
  const isInitialized = ref(false)

  // ─── Signup State ───
  const signupData = ref({
    firstName: '',
    middlename: '',
    lastName: '',
    birthdate: '',
    gender: '',
    contact_number: '',
    current_address: '',
    home_address: '',
    is_4ps: false,
    is_pwd: false,
    email: '',
    password: ''
  })

  // ─── Computed ───
  const isAuthenticated = computed(() => !!session.value)

  const userEmail = computed(() => user.value?.email || '')
  
  const userRole = computed(() => profile.value?.role || null)
  const username = computed(() => profile.value?.username || '')

  const displayName = computed(() => {
    if (!profile.value) return 'User'
    const first = profile.value.firstname || ''
    const middle = profile.value.middlename ? `${profile.value.middlename.charAt(0)}.` : ''
    const last = profile.value.lastname || ''
    return [first, middle, last].filter(Boolean).join(' ') || 'User'
  })

  const userInitials = computed(() => {
    const first = profile.value?.firstname?.charAt(0)?.toUpperCase() || ''
    const last = profile.value?.lastname?.charAt(0)?.toUpperCase() || ''
    return `${first}${last}` || 'U'
  })

  const isVerified = computed(() => profile.value?.status === 'approved')

  const isPersonalDetailsComplete = computed(() => {
    return signupData.value.firstName && signupData.value.lastName
  })

  // ─── Actions ───
  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('firstname, middlename, lastname, status, role, username')
      .eq('id', userId)
      .single()

    if (data) {
      profile.value = data
    }
  }

  async function init() {
    if (isInitialized.value) return

    const { data: { session: currentSession } } = await supabase.auth.getSession()
    session.value = currentSession
    user.value = currentSession?.user ?? null

    if (currentSession?.user) {
      await fetchProfile(currentSession.user.id)
    }

    // Listen for auth state changes (login/logout/token refresh)
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null

      if (newSession?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        await fetchProfile(newSession.user.id)
      }

      if (event === 'SIGNED_OUT') {
        profile.value = null
      }
    })

    isInitialized.value = true
  }

  function updateSignupFields(fields: Partial<typeof signupData.value>) {
    signupData.value = { ...signupData.value, ...fields }
  }

  function updateStepOne(details: { firstName: string; middlename: string; lastName: string; birthdate: string; gender: string; contact_number: string; current_address: string; home_address: string; is_4ps: boolean; is_pwd: boolean }) {
    signupData.value.firstName = details.firstName
    signupData.value.middlename = details.middlename
    signupData.value.lastName = details.lastName
    signupData.value.birthdate = details.birthdate
    signupData.value.gender = details.gender
    signupData.value.contact_number = details.contact_number
    signupData.value.current_address = details.current_address
    signupData.value.home_address = details.home_address
    signupData.value.is_4ps = details.is_4ps
    signupData.value.is_pwd = details.is_pwd
  }

  function clearSignupData() {
    signupData.value = {
        firstName: '',
        middlename: '',
        lastName: '',
        birthdate: '',
        gender: '',
        contact_number: '',
        current_address: '',
        home_address: '',
        is_4ps: false,
        is_pwd: false,
        email: '',
        password: ''
    }
  }

  return { 
    // State
    user,
    session,
    profile,
    isInitialized,
    signupData,
    // Computed
    isAuthenticated,
    userEmail,
    userRole,
    username,
    displayName,
    userInitials,
    isVerified,
    isPersonalDetailsComplete,
    // Actions
    init,
    fetchProfile,
    updateStepOne, 
    clearSignupData,
    updateSignupFields
  }

})