<script setup lang="ts">
import { Check, Circle, Dot } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { h, ref } from 'vue'
import { toast } from 'sonner'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Stepper, StepperDescription, StepperItem, StepperSeparator, StepperTitle, StepperTrigger } from '@/components/ui/stepper'

// Form schema broken into steps following your profiles structure
const formSchema = [
  // Step 1: Account Setup
  z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(50),
    confirmPassword: z.string(),
  }).refine(
    (values) => values.password === values.confirmPassword,
    {
      message: 'Passwords must match!',
      path: ['confirmPassword'],
    },
  ),
  
  // Step 2: Personal Identity
  z.object({
    firstname: z.string().min(1, 'First name is required'),
    middlename: z.string().optional(),
    lastname: z.string().min(1, 'Last name is required'),
    birthdate: z.string().min(1, 'Birthdate is required'), // Format: YYYY-MM-DD
    gender: z.union([z.literal('male'), z.literal('female'), z.literal('other')]),
    contact_number: z.string().min(1, 'Contact number is required'),
  }),

  // Step 3: Address & Info
  z.object({
    current_address: z.string().min(1, 'Current address is required'),
    home_address: z.string().min(1, 'Home address is required'),
    is_4ps: z.boolean().default(false),
    is_pwd: z.boolean().default(false),
  }),
]

const stepIndex = ref(1)
const steps = [
  {
    step: 1,
    title: 'Account',
    description: 'Email and credentials',
  },
  {
    step: 2,
    title: 'Identity',
    description: 'Your personal information',
  },
  {
    step: 3,
    title: 'Profile Details',
    description: 'Address and background',
  },
]

function onSubmit(values: any) {
  // Structure this payload to match your Supabase auth sign-up 
  // and metadata/profile table insert requirements
  toast('Form structure ready for submission:', {
    description: h('pre', { class: 'mt-2 w-[320px] rounded-md bg-neutral-950 p-4' }, h('code', { class: 'text-white' }, JSON.stringify(values, null, 2))),
  })
}
</script>

<template>
  <Form
    v-slot="{ meta, values, validate }"
    as="" keep-values :validation-schema="toTypedSchema(formSchema[stepIndex - 1]!)"
  >
    <Stepper v-slot="{ isNextDisabled, isPrevDisabled, nextStep, prevStep, modelValue }" v-model="stepIndex" class="block w-full">
      <form
        @submit="(e) => {
          e.preventDefault()
          validate()

          if (stepIndex === steps.length && meta.valid) {
            onSubmit(values)
          }
        }"
      >
        <!-- Stepper Header Navigation -->
        <div class="flex w-full flex-start gap-2">
          <StepperItem
            v-for="(step, index) in steps"
            :key="step.step"
            v-slot="{ state }"
            class="relative flex w-full flex-col items-center justify-center"
            :step="step.step"
          >
            <StepperSeparator
              v-if="step.step !== steps[steps.length - 1]!.step"
              class="absolute left-[calc(50%+20px)] right-[calc(-50%+10px)] top-5 block h-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
            />

            <StepperTrigger as-child>
              <Button
                :variant="state === 'completed' || state === 'active' ? 'default' : 'outline'"
                size="icon"
                class="z-10 rounded-full shrink-0"
                :class="[state === 'active' && 'ring-2 ring-ring ring-offset-2 ring-offset-background']"
                :disabled="state !== 'completed' && (index >= (modelValue || 0) && !meta.valid)"
              >
                <Check v-if="state === 'completed'" class="size-5" />
                <Circle v-if="state === 'active'" />
                <Dot v-if="state === 'inactive'" />
              </Button>
            </StepperTrigger>

            <div class="mt-5 flex flex-col items-center text-center">
              <StepperTitle
                :class="[state === 'active' && 'text-primary']"
                class="text-sm font-semibold transition lg:text-base"
              >
                {{ step.title }}
              </StepperTitle>
              <StepperDescription
                :class="[state === 'active' && 'text-primary']"
                class="sr-only text-xs text-muted-foreground transition md:not-sr-only lg:text-sm"
              >
                {{ step.description }}
              </StepperDescription>
            </div>
          </StepperItem>
        </div>

        <!-- Dynamic Form Content -->
        <div class="flex flex-col gap-4 mt-4">
          
          <!-- STEP 1: Credentials -->
          <template v-if="stepIndex === 1">
            <FormField v-slot="{ componentField }" name="email">
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input type="email" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="password">
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="confirmPassword">
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input type="password" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </template>

          <!-- STEP 2: Identity (Profile Basics) -->
          <template v-if="stepIndex === 2">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField v-slot="{ componentField }" name="firstname">
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input type="text" v-bind="componentField" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="middlename">
                <FormItem>
                  <FormLabel>Middle Name (Optional)</FormLabel>
                  <FormControl>
                    <Input type="text" v-bind="componentField" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="lastname">
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input type="text" v-bind="componentField" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            <FormField v-slot="{ componentField }" name="birthdate">
              <FormItem>
                <FormLabel>Birthdate</FormLabel>
                <FormControl>
                  <Input type="date" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="gender">
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select v-bind="componentField">
                  <FormControl>
                    <SelectTrigger>
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
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="contact_number">
              <FormItem>
                <FormLabel>Contact Number</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="e.g., +639..." v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </template>

          <!-- STEP 3: Context & Location -->
          <template v-if="stepIndex === 3">
            <FormField v-slot="{ componentField }" name="current_address">
              <FormItem>
                <FormLabel>Current Address</FormLabel>
                <FormControl>
                  <Input type="text" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="home_address">
              <FormItem>
                <FormLabel>Home Address</FormLabel>
                <FormControl>
                  <Input type="text" v-bind="componentField" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <div class="flex flex-col gap-3 mt-2 border rounded-lg p-4 bg-muted/20">
              <FormField v-slot="{ value, handleChange }" name="is_4ps">
                <FormItem class="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox :checked="value" @update:checked="handleChange" />
                  </FormControl>
                  <div class="space-y-1 leading-none">
                    <FormLabel>4Ps Beneficiary</FormLabel>
                  </div>
                </FormItem>
              </FormField>

              <FormField v-slot="{ value, handleChange }" name="is_pwd">
                <FormItem class="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox :checked="value" @update:checked="handleChange" />
                  </FormControl>
                  <div class="space-y-1 leading-none">
                    <FormLabel>Person with Disability (PWD)</FormLabel>
                  </div>
                </FormItem>
              </FormField>
            </div>
          </template>
        </div>

        <!-- Stepper Navigation Actions -->
        <div class="flex items-center justify-between mt-6">
          <Button :disabled="isPrevDisabled" variant="outline" size="sm" type="button" @click="prevStep()">
            Back
          </Button>
          <div class="flex items-center gap-3">
            <Button v-if="stepIndex !== 3" :type="meta.valid ? 'button' : 'submit'" :disabled="isNextDisabled" size="sm" @click="meta.valid && nextStep()">
              Next
            </Button>
            <Button v-if="stepIndex === 3" size="sm" type="submit">
              Submit
            </Button>
          </div>
        </div>
      </form>
    </Stepper>
  </Form>
</template>