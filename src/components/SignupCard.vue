<script setup lang="ts">
import { Check, Circle, Dot, CalendarIcon } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { h, ref, onMounted} from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'sonner'
import * as z from 'zod'
import { parseISO } from 'date-fns'
import { CalendarDate } from '@internationalized/date'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress' // 1. Import Progress Bar Component
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Stepper, StepperItem, StepperSeparator, StepperTitle, StepperTrigger, StepperDescription } from '@/components/ui/stepper'

import logoUrl from '@/assets/images/agsur-logo.png'
import waveUrl from '@/assets/images/wave.png'

const router = useRouter()
const STORAGE_KEY = 'registration_draft'

// Define validation schemas for individual validation passes
const formSchema = [
  // Step 1: Personal Details
  z.object({
    firstname: z.string().min(1, 'First name is required'),
    middlename: z.string().optional(),
    lastname: z.string().min(1, 'Last name is required'),
    birthdate: z.string().min(1, 'Birthdate is required'),
    gender: z.union([z.literal('male'), z.literal('female'), z.literal('other')]),
  }),

  // Step 2: Contacts & Background
  z.object({
    contact_number: z.string().min(1, 'Contact number is required'),
    current_address: z.string().min(1, 'Current address is required'),
    home_address: z.string().min(1, 'Home address is required'),
    is_4ps: z.boolean().default(false),
    is_pwd: z.boolean().default(false),
  }),

  // Step 3: Account Information
  z.object({
    email: z.string().email('Invalid email address'),
    // Updated requirement: min(15)
    password: z.string().min(15, 'Password must be at least 15 characters long').max(50),
    confirmPassword: z.string(),
  }).refine(
    (values) => values.password === values.confirmPassword,
    {
      message: 'Passwords must match!',
      path: ['confirmPassword'],
    },
  ),

  // Step 4: Summary / Review (Empty validation object since entries are checked)
  z.object({})
]

const stepIndex = ref(1)
const steps = [
  { step: 1, title: 'Personal Details', description: 'Basic Information' },
  { step: 2, title: 'Contacts', description: 'Address and Contact' },
  { step: 3, title: 'Account Information', description: 'Credentials' },
  { step: 4, title: 'Review', description: 'Confirm Details' },
]

// Rehydrate initial registration values from localStorage if they exist
const initialValues = ref<Record<string, any>>({
  firstname: '',
  middlename: '',
  lastname: '',
  birthdate: '',
  gender: undefined,
  contact_number: '',
  current_address: '',
  home_address: '',
  is_4ps: false,
  is_pwd: false,
  email: '',
  password: '',
  confirmPassword: ''
})

onMounted(() => {
  const savedData = localStorage.getItem(STORAGE_KEY)
  if (savedData) {
    try {
      initialValues.value = { ...initialValues.value, ...JSON.parse(savedData) }
    } catch (e) {
      console.error('Failed parsing registration cache data', e)
    }
  }
})

function toCalendarDate(value?: string) {
  if (!value || value.length < 10) return undefined
  const d = parseISO(value)
  if (isNaN(d.getTime())) return undefined
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function handleCacheSync(values: Record<string, any>) {
  if (Object.keys(values).length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
  }
}

function onSubmit(values: any) {
  toast('Form registration successful!', {
    description: h('pre', { class: 'mt-2 w-[320px] rounded-md bg-neutral-950 p-4' }, h('code', { class: 'text-white' }, JSON.stringify(values, null, 2))),
  })
  
  // Clear data after submission is verified
  localStorage.removeItem(STORAGE_KEY)
}

// Password Strength Evaluation Utility
const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, label: 'Too short', color: 'bg-neutral-200' }
  
  let score = 0
  
  // Rule checks
  if (password.length >= 15) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  // Handle lengths under 15 strictly as weak for this specific logic if preferred
  if (password.length < 15) {
    return { score: 20, label: 'Weak (Must be 15+ characters)', color: 'bg-red-500' }
  }

  switch (score) {
    case 1:
    case 2:
      return { score: 40, label: 'Weak', color: 'bg-red-500' }
    case 3:
      return { score: 60, label: 'Medium', color: 'bg-yellow-500' }
    case 4:
      return { score: 80, label: 'Strong', color: 'bg-emerald-500' }
    case 5:
      return { score: 100, label: 'Very Strong', color: 'bg-green-600' }
    default:
      return { score: 0, label: 'Too short', color: 'bg-neutral-200' }
  }
}
</script>

<template>
  <div class="w-full max-w-4xl mx-auto flex overflow-hidden rounded-[28px] bg-white shadow-xl">

    <div class="relative hidden w-[38%] shrink-0 flex-col items-start overflow-hidden bg-white px-8 pt-8 md:flex">
      <img :src="logoUrl" alt="AgSurJobs" class="h-8 w-auto shrink-0 object-contain select-none" />
      <img
        :src="waveUrl"
        alt=""
        class="pointer-events-none absolute bottom-0 left-0 max-h-[55%] w-full object-contain object-bottom-left select-none"
      />
    </div>

    <div class="flex flex-1 flex-col">
      <!-- Mobile-only header: shows the logo since the visual panel is hidden below md -->
      <div class="flex items-center border-b border-neutral-100 px-6 py-4 md:hidden">
        <img :src="logoUrl" alt="AgSurJobs" class="h-7 w-auto object-contain select-none" />
      </div>

      <Form
        v-slot="{ meta, values, validate }"
        as="" keep-values 
        :validation-schema="toTypedSchema(formSchema[stepIndex - 1]!)"
        :initial-values="initialValues"
      >
        <span class="hidden" :data-sync="handleCacheSync(values)"></span>

        <Stepper v-slot="{ isNextDisabled, isPrevDisabled, nextStep, prevStep, modelValue }" v-model="stepIndex" class="flex h-full flex-col">
          <form
            class="flex h-full flex-col"
            @submit="(e) => {
              e.preventDefault()
              validate()

              if (stepIndex === steps.length && meta.valid) {
                onSubmit(values)
              }
            }"
          >
            <div class="flex items-start gap-6 px-8 pt-8">
              <div class="flex w-full gap-2">
                <StepperItem
                  v-for="(step) in steps"
                  :key="step.step"
                  v-slot="{ state }"
                  class="relative flex w-full flex-col items-center"
                  :step="step.step"
                >
                  <StepperSeparator
                    v-if="step.step !== steps[steps.length - 1]!.step"
                    class="absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-4 block h-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
                  />

                  <StepperTrigger as-child>
                    <Button
                      size="icon"
                      class="z-10 size-8 shrink-0 rounded-full border-2 transition-colors"
                      :class="[
                        (state === 'completed' || state === 'active')
                          ? 'border-[#4f46e5] bg-[#4f46e5] text-white hover:bg-[#4f46e5] hover:text-white'
                          : 'border-neutral-300 bg-white text-neutral-400 hover:bg-white hover:text-neutral-400',
                      ]"
                      :disabled="state !== 'completed' && (step.step - 1 >= (modelValue || 0) && !meta.valid)"
                      type="button"
                    >
                      <Check v-if="state === 'completed'" class="size-4" />
                      <Circle v-if="state === 'active'" class="size-3" />
                      <Dot v-if="state === 'inactive'" />
                    </Button>
                  </StepperTrigger>

                  <div class="mt-3 flex flex-col items-center text-center">
                    <StepperTitle
                      :class="[state === 'active' ? 'text-[#4f46e5]' : 'text-neutral-800']"
                      class="text-[11px] font-semibold transition md:text-xs"
                    >
                      {{ step.title }}
                    </StepperTitle>
                    <StepperDescription
                      class="sr-only text-[10px] text-muted-foreground transition md:not-sr-only"
                    >
                      {{ step.description }}
                    </StepperDescription>
                  </div>
                </StepperItem>
              </div>
            </div>

            <div class="flex-1 px-8 py-8">
              <div class="flex flex-col gap-5">

                <template v-if="stepIndex === 1">
                  <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FormField v-slot="{ componentField }" name="firstname">
                      <FormItem>
                        <div class="relative">
                          <input
                            type="text"
                            v-bind="componentField"
                            class="w-full rounded-md border border-neutral-300 px-3 pb-2.5 pt-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                          />
                          <FormLabel class="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-neutral-500">
                            First name
                          </FormLabel>
                        </div>
                        <FormMessage class="text-[11px] leading-none mt-1" />
                      </FormItem>
                    </FormField>

                    <FormField v-slot="{ componentField }" name="middlename">
                      <FormItem>
                        <div class="relative">
                          <input
                            type="text"
                            v-bind="componentField"
                            class="w-full rounded-md border border-neutral-300 px-3 pb-2.5 pt-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                          />
                          <FormLabel class="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-neutral-500">
                            Middle name
                          </FormLabel>
                        </div>
                        <FormMessage class="text-[11px] leading-none mt-1" />
                      </FormItem>
                    </FormField>

                    <FormField v-slot="{ componentField }" name="lastname">
                      <FormItem>
                        <div class="relative">
                          <input
                            type="text"
                            v-bind="componentField"
                            class="w-full rounded-md border border-neutral-300 px-3 pb-2.5 pt-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                          />
                          <FormLabel class="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-neutral-500">
                            Last name
                          </FormLabel>
                        </div>
                        <FormMessage class="text-[11px] leading-none mt-1" />
                      </FormItem>
                    </FormField>
                  </div>

                  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField v-slot="{ value, setValue }" name="birthdate">
                      <FormItem>
                        <Popover>
                          <PopoverTrigger as-child>
                            <div class="relative">
                              <input
                                type="text"
                                placeholder="YYYY-MM-DD"
                                :value="value"
                                @input="(e) => {
                                  const target = e.target as HTMLInputElement;
                                  setValue(target.value);
                                }"
                                class="w-full rounded-md border border-neutral-300 px-3 pb-2.5 pt-3.5 pl-9 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                              />
                              <CalendarIcon class="pointer-events-none absolute left-3 top-4 size-4 shrink-0 text-neutral-400" />
                              <FormLabel class="pointer-events-none absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-neutral-500">
                                Birthdate
                              </FormLabel>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent class="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              :model-value="toCalendarDate(value)"
                              @update:model-value="(d) => setValue(d ? `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` : '')"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage class="text-[11px] leading-none mt-1" />
                      </FormItem>
                    </FormField>

                    <FormField v-slot="{ componentField }" name="gender">
                      <FormItem>
                        <div class="relative">
                          <Select v-bind="componentField">
                            <FormControl>
                              <SelectTrigger class="w-full rounded-md border-neutral-300 px-3 pb-2.5 pt-3.5">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <FormLabel class="pointer-events-none absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-neutral-500">
                            Gender
                          </FormLabel>
                        </div>
                        <FormMessage class="text-[11px] leading-none mt-1" />
                      </FormItem>
                    </FormField>
                  </div>
                </template>

                <template v-if="stepIndex === 2">
                  <FormField v-slot="{ componentField }" name="contact_number">
                    <FormItem>
                      <div class="relative">
                        <input
                          type="text"
                          placeholder="e.g., +639..."
                          v-bind="componentField"
                          class="w-full rounded-md border border-neutral-300 px-3 pb-2.5 pt-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                        />
                        <FormLabel class="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-neutral-500">
                          Contact number
                        </FormLabel>
                      </div>
                      <FormMessage class="text-[11px] leading-none mt-1" />
                    </FormItem>
                  </FormField>

                  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField v-slot="{ componentField }" name="current_address">
                      <FormItem>
                        <div class="relative">
                          <input
                            type="text"
                            v-bind="componentField"
                            class="w-full rounded-md border border-neutral-300 px-3 pb-2.5 pt-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                          />
                          <FormLabel class="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-neutral-500">
                            Current address
                          </FormLabel>
                        </div>
                        <FormMessage class="text-[11px] leading-none mt-1" />
                      </FormItem>
                    </FormField>

                    <FormField v-slot="{ componentField }" name="home_address">
                      <FormItem>
                        <div class="relative">
                          <input
                            type="text"
                            v-bind="componentField"
                            class="w-full rounded-md border border-neutral-300 px-3 pb-2.5 pt-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                          />
                          <FormLabel class="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-neutral-500">
                            Home address
                          </FormLabel>
                        </div>
                        <FormMessage class="text-[11px] leading-none mt-1" />
                      </FormItem>
                    </FormField>
                  </div>

                  <div class="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4">
                    <FormField v-slot="{ value, handleChange }" name="is_4ps">
                      <FormItem class="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox :checked="value" @update:checked="handleChange" />
                        </FormControl>
                        <FormLabel class="font-normal">4Ps Beneficiary</FormLabel>
                      </FormItem>
                    </FormField>

                    <FormField v-slot="{ value, handleChange }" name="is_pwd">
                      <FormItem class="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox :checked="value" @update:checked="handleChange" />
                        </FormControl>
                        <FormLabel class="font-normal">Person with Disability (PWD)</FormLabel>
                      </FormItem>
                    </FormField>
                  </div>
                </template>

                <template v-if="stepIndex === 3">
                  <FormField v-slot="{ componentField }" name="email">
                    <FormItem>
                      <div class="relative">
                        <input
                          type="email"
                          v-bind="componentField"
                          class="w-full rounded-md border border-neutral-300 px-3 pb-2.5 pt-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                        />
                        <FormLabel class="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-neutral-500">
                          Email address
                        </FormLabel>
                      </div>
                      <FormMessage class="text-[11px] leading-none mt-1" />
                    </FormItem>
                  </FormField>

                  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField v-slot="{ componentField }" name="password">
                      <FormItem>
                        <div class="relative">
                          <input
                            type="password"
                            v-bind="componentField"
                            class="w-full rounded-md border border-neutral-300 px-3 pb-2.5 pt-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                          />
                          <FormLabel class="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-neutral-500">
                            Password
                          </FormLabel>
                        </div>
                        
                        <div class="mt-2.5 px-0.5">
                          <Progress 
                            :model-value="getPasswordStrength(values.password).score" 
                            class="h-1.5 transition-all"
                            :class="getPasswordStrength(values.password).color"
                          />
                          <div class="flex justify-between items-center mt-1 text-[11px]">
                            <span class="text-neutral-400">Password strength:</span>
                            <span :class="[
                              getPasswordStrength(values.password).score >= 80 ? 'text-emerald-600 font-semibold' : 
                              getPasswordStrength(values.password).score >= 60 ? 'text-yellow-600 font-semibold' : 'text-red-500'
                            ]">
                              {{ getPasswordStrength(values.password).label }}
                            </span>
                          </div>
                        </div>

                        <FormMessage class="text-[11px] leading-none mt-1" />
                      </FormItem>
                    </FormField>

                    <FormField v-slot="{ componentField }" name="confirmPassword">
                      <FormItem>
                        <div class="relative">
                          <input
                            type="password"
                            v-bind="componentField"
                            class="w-full rounded-md border border-neutral-300 px-3 pb-2.5 pt-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                          />
                          <FormLabel class="absolute -top-2 left-3 bg-white px-1 text-xs font-medium text-neutral-500">
                            Confirm password
                          </FormLabel>
                        </div>
                        <FormMessage class="text-[11px] leading-none mt-1" />
                      </FormItem>
                    </FormField>
                  </div>
                </template>

                <template v-if="stepIndex === 4">
                  <div class="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-800">
                    <h3 class="mb-4 text-xs font-bold uppercase tracking-wider text-neutral-400">Review Inputted Credentials</h3>
                    
                    <div class="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                      <div><span class="font-semibold text-neutral-500">Full Name:</span> {{ values.firstname }} {{ values.middlename || '' }} {{ values.lastname }}</div>
                      <div><span class="font-semibold text-neutral-500">Birthdate:</span> {{ values.birthdate }}</div>
                      <div><span class="font-semibold text-neutral-500">Gender:</span> <span class="capitalize">{{ values.gender }}</span></div>
                      <div><span class="font-semibold text-neutral-500">Contact Number:</span> {{ values.contact_number }}</div>
                      <div class="md:col-span-2"><span class="font-semibold text-neutral-500">Current Address:</span> {{ values.current_address }}</div>
                      <div class="md:col-span-2"><span class="font-semibold text-neutral-500">Home Address:</span> {{ values.home_address }}</div>
                      <div><span class="font-semibold text-neutral-500">Email:</span> {{ values.email }}</div>
                      <div>
                        <span class="font-semibold text-neutral-500">Affiliations:</span> 
                        {{ [values.is_4ps ? '4Ps Beneficiary' : '', values.is_pwd ? 'PWD' : ''].filter(Boolean).join(', ') || 'None' }}
                      </div>
                    </div>

                    <div class="mt-4 border-t border-neutral-200 pt-3 text-xs text-neutral-400 italic">
                      Please double-check everything before finalizing registration.
                    </div>
                  </div>
                </template>

              </div>
            </div>

            <div class="flex items-center justify-end gap-5 px-8 pb-8">
              <button
                v-if="stepIndex === 1"
                type="button"
                class="text-sm font-medium text-neutral-400 transition hover:text-neutral-700"
                @click="router.push('/login')"
              >
                Log In
              </button>

              <button
                v-if="stepIndex > 1"
                type="button"
                :disabled="isPrevDisabled"
                class="text-sm font-bold uppercase tracking-wide text-neutral-900 transition hover:text-neutral-600 disabled:opacity-40"
                @click="prevStep()"
              >
                Back
              </button>

              <button
                v-if="stepIndex < steps.length"
                :type="meta.valid ? 'button' : 'submit'"
                :disabled="isNextDisabled"
                class="rounded-full bg-[#0b1d4e] px-7 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#0b1d4e]/90 disabled:opacity-40"
                @click="meta.valid && nextStep()"
              >
                Next
              </button>

              <button
                v-if="stepIndex === steps.length"
                type="submit"
                class="rounded-full bg-[#0b1d4e] px-7 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#0b1d4e]/90"
              >
                Submit
              </button>
            </div>
          </form>
        </Stepper>
      </Form>
    </div>
  </div>
</template>