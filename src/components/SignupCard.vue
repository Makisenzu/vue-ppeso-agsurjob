<script setup lang="ts">
import { ref, computed } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperTitle,
  StepperTrigger,
  StepperSeparator,
} from '@/components/ui/stepper'

const steps = [
  {
    step: 1,
    title: 'Account',
    description: 'Login credentials'
  },
  {
    step: 2,
    title: 'Personal',
    description: 'Basic information'
  },
  {
    step: 3,
    title: 'Contact',
    description: 'Address & Phone'
  },
  {
    step: 4,
    title: 'Additional',
    description: 'Other details'
  }
]

const currentStep = ref(1)

const form = ref({
  email: '',
  password: '',
  confirmPassword: '',
  firstname: '',
  middlename: '',
  lastname: '',
  birthdate: '',
  gender: '',
  contact_number: '',
  home_address: '',
  current_address: '',
  is_4ps: false,
  is_pwd: false,
  role: 'applicant', // default
})

const progressValue = computed(() => {
  return ((currentStep.value) / steps.length) * 100
})

const emit = defineEmits(['switch-to-login'])

const handleNext = () => {
  if (currentStep.value < steps.length) {
    currentStep.value++
  } else {
    handleCreate()
  }
}

const handleBack = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const handleCreate = () => {
  console.log('Account payload:', form.value)
  // Call supabase registration here
}
</script>

<template>
  <Card class="signup-card border-0 shadow-lg rounded-3xl! flex w-full max-w-240 min-h-140 mx-auto p-0 overflow-hidden font-sans">
    <!-- Left Column -->
    <div class="signup-left w-2/5 p-10 flex flex-col relative z-1 bg-gray-50 border-r border-gray-100">
      <div class="flex items-center gap-2 mb-6">
        <div class="signup-seal flex items-center shrink-0">
          <img
            src="/src/assets/images/agsur-logo.png"
            alt="AGSURJOBS Logo"
            class="h-16 w-auto max-w-55 object-contain"
          />
        </div>
      </div>

      <div class="mt-2">
        <h1 class="text-2xl font-extrabold text-[#0f1d3d] mb-1 leading-tight tracking-tight">Create an Account</h1>
        <p class="text-sm text-gray-500 font-medium">Join AGSURJOB today</p>
      </div>

      <!-- Wave decoration -->
      <div class="absolute bottom-0 left-0 w-full z-0 pointer-events-none">
        <img
          src="/src/assets/images/wave.png"
          alt=""
          class="w-full h-auto block object-contain object-bottom-left"
        />
      </div>
    </div>

    <!-- Right Column (Form Steps) -->
    <CardContent class="signup-right flex-1 flex flex-col p-10 z-2 box-border relative">
      
      <div class="mb-6">
        <Stepper v-model.number="currentStep" class="flex w-full items-start mb-6">
          <template v-for="(s, index) in steps" :key="s.step">
            <StepperItem
              :step="s.step"
              class="relative flex w-full justify-center"
            >
              <StepperTrigger class="flex flex-col items-center gap-2 pointer-events-none">
                <StepperIndicator class="w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold text-sm transition-colors" 
                  :class="currentStep === s.step ? 'bg-[#0b1d4e] text-white border-[#0b1d4e]' : currentStep > s.step ? 'bg-[#0b1d4e] text-white border-[#0b1d4e]' : 'bg-gray-100 text-gray-400 border-transparent'">
                  <span v-if="currentStep > s.step">✓</span>
                  <span v-else>{{ s.step }}</span>
                </StepperIndicator>
                <div class="flex flex-col items-center text-center">
                  <StepperTitle :class="currentStep >= s.step ? 'text-[#0b1d4e]' : 'text-gray-400'" class="text-xs font-bold transition-colors">
                    {{ s.title }}
                  </StepperTitle>
                </div>
              </StepperTrigger>
              
              <StepperSeparator
                v-if="index !== steps.length - 1"
                class="absolute left-[calc(50%+1rem)] right-[calc(-50%+1rem)] top-4 h-0.5 -translate-y-1/2 rounded-full"
                :class="currentStep > s.step ? 'bg-[#0b1d4e]' : 'bg-gray-200'"
              />
            </StepperItem>
          </template>
        </Stepper>
        
        <Progress :model-value="progressValue" class="h-1.5 bg-gray-100" />
      </div>

      <div class="flex-1 mb-6">
        <!-- STEP 1: Account -->
        <div v-show="currentStep === 1" class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-sm font-bold text-gray-700">Email Address</label>
            <input class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all" type="email" v-model="form.email" placeholder="Enter your email" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-bold text-gray-700">Password</label>
            <input class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all" type="password" v-model="form.password" placeholder="Create a password" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-bold text-gray-700">Confirm Password</label>
            <input class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all" type="password" v-model="form.confirmPassword" placeholder="Confirm your password" />
          </div>
        </div>

        <!-- STEP 2: Personal -->
        <div v-show="currentStep === 2" class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-sm font-bold text-gray-700">First Name</label>
            <input class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all" type="text" v-model="form.firstname" placeholder="First Name" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-bold text-gray-700">Middle Name</label>
            <input class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all" type="text" v-model="form.middlename" placeholder="Middle Name" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-bold text-gray-700">Last Name</label>
            <input class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all" type="text" v-model="form.lastname" placeholder="Last Name" />
          </div>
          <div class="flex flex-col sm:flex-row gap-4">
            <div class="w-full space-y-1.5">
              <label class="text-sm font-bold text-gray-700">Gender</label>
              <select class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all" v-model="form.gender">
                <option value="" disabled>Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="w-full space-y-1.5">
              <label class="text-sm font-bold text-gray-700">Birthdate</label>
              <input class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all" type="date" v-model="form.birthdate" />
            </div>
          </div>
        </div>

        <!-- STEP 3: Contact -->
        <div v-show="currentStep === 3" class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-sm font-bold text-gray-700">Contact Number</label>
            <input class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all" type="text" v-model="form.contact_number" placeholder="ex. 09123456789" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-bold text-gray-700">Home Address</label>
            <input class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all" type="text" v-model="form.home_address" placeholder="Full Home Address" />
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-bold text-gray-700">Current Address</label>
            <input class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all" type="text" v-model="form.current_address" placeholder="Current Address (if different)" />
          </div>
        </div>

        <!-- STEP 4: Additional -->
        <div v-show="currentStep === 4" class="space-y-4">
          <div class="flex items-center space-x-3 mb-4">
            <Checkbox id="is_4ps" :checked="form.is_4ps" @update:checked="(val: any) => form.is_4ps = !!val" />
            <label for="is_4ps" class="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
              Yes, I am a 4Ps Member
            </label>
          </div>
          <div class="flex items-center space-x-3 mb-6">
            <Checkbox id="is_pwd" :checked="form.is_pwd" @update:checked="(val: any) => form.is_pwd = !!val" />
            <label for="is_pwd" class="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
              Yes, I am a Person With Disability (PWD)
            </label>
          </div>
          
          <div class="space-y-1.5">
            <label class="text-sm font-bold text-gray-700">Account Type</label>
            <select class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all" v-model="form.role">
              <option value="applicant">Applicant</option>
              <option value="employer">Employer</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center mt-auto justify-between pt-4">
        <Button 
          variant="outline"
          class="font-bold text-gray-500 hover:text-black border-0 bg-transparent hover:bg-gray-100 rounded-full px-4"
          :class="{'invisible': currentStep === 1}"
          @click="handleBack"
        >
          BACK
        </Button>

        <Button 
          class="font-bold uppercase tracking-wider rounded-full px-8 py-5 bg-[#0b1d4e] hover:bg-[#091640] shadow-md hover:shadow-lg transition-all text-white"
          @click="handleNext"
        >
          {{ currentStep === steps.length ? 'CREATE' : 'NEXT' }}
        </Button>
      </div>

      <div class="text-center mt-6 text-sm text-gray-500 font-medium">
        Already have an account? 
        <a href="#" class="text-blue-600 font-bold hover:underline" @click.prevent="$emit('switch-to-login')">Sign In</a>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
@media (max-width: 768px) {
  .signup-card {
    flex-direction: column !important;
  }
  .signup-left {
    width: 100% !important;
    padding: 32px !important;
  }
  .signup-right {
    padding: 32px !important;
  }
}
</style>
