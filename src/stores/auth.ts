import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {

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

  const isPersonalDetailsComplete = computed(() => {
    return signupData.value.firstName && signupData.value.lastName
  })

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
    signupData, 
    isPersonalDetailsComplete, 
    updateStepOne, 
    clearSignupData,
    updateSignupFields
  }

})