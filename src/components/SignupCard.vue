<script setup lang="ts">
import { Check, Circle, Dot, CalendarIcon } from '@lucide/vue'
import { toTypedSchema } from '@vee-validate/zod'
import { h, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'sonner'
import * as z from 'zod'
import { format, parseISO } from 'date-fns'
import { CalendarDate } from '@internationalized/date'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
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
import { Stepper, StepperDescription, StepperItem, StepperSeparator, StepperTitle, StepperTrigger } from '@/components/ui/stepper'

// Form schema unchanged
const router = useRouter()

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
    password: z.string().min(6, 'Password must be at least 6 characters').max(50),
    confirmPassword: z.string(),
  }).refine(
    (values) => values.password === values.confirmPassword,
    {
      message: 'Passwords must match!',
      path: ['confirmPassword'],
    },
  ),
]

const stepIndex = ref(1)
const steps = [
  { step: 1, title: 'Personal Details', description: 'Basic Information' },
  { step: 2, title: 'Contacts', description: 'Address and Contact' },
  { step: 3, title: 'Account Information', description: 'Credentials' },
]

// Helper: convert an ISO date string <-> CalendarDate for the Calendar component
function toCalendarDate(value?: string) {
  if (!value) return undefined
  const d = parseISO(value)
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function onSubmit(values: any) {
  toast('Form structure ready for submission:', {
    description: h('pre', { class: 'mt-2 w-[320px] rounded-md bg-neutral-950 p-4' }, h('code', { class: 'text-white' }, JSON.stringify(values, null, 2))),
  })
}
</script>

<template>
  <Card class="w-full max-w-2xl mx-auto">
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
          <CardHeader class="border-b pb-6 space-y-6">
            <div class="flex items-start justify-between">
              <div>
                <CardTitle class="text-xl">Create your account</CardTitle>
                <CardDescription>Step {{ stepIndex }} of {{ steps.length }} — {{ steps[stepIndex - 1]?.title }}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" type="button" @click="router.push('/login')" class="text-muted-foreground hover:text-foreground">
                Log In
              </Button>
            </div>

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
                    type="button"
                  >
                    <Check v-if="state === 'completed'" class="size-5" />
                    <Circle v-if="state === 'active'" />
                    <Dot v-if="state === 'inactive'" />
                  </Button>
                </StepperTrigger>

                <div class="mt-3 flex flex-col items-center text-center">
                  <StepperTitle
                    :class="[state === 'active' && 'text-primary']"
                    class="text-xs font-semibold transition lg:text-sm"
                  >
                    {{ step.title }}
                  </StepperTitle>
                  <StepperDescription
                    :class="[state === 'active' && 'text-primary']"
                    class="sr-only text-[11px] text-muted-foreground transition md:not-sr-only"
                  >
                    {{ step.description }}
                  </StepperDescription>
                </div>
              </StepperItem>
            </div>
          </CardHeader>

          <CardContent class="pt-6 min-h-85">
            <div class="flex flex-col space-y-5">

              <template v-if="stepIndex === 1">
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
                      <FormLabel>Middle Name</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Optional" v-bind="componentField" />
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

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField v-slot="{ componentField, value, setValue }" name="birthdate">
                    <FormItem class="flex flex-col">
                      <FormLabel>Birthdate</FormLabel>
                      <Popover>
                        <PopoverTrigger as-child>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              class="w-full justify-start text-left font-normal"
                              :class="!value && 'text-muted-foreground'"
                            >
                              <CalendarIcon class="mr-2 size-4" />
                              {{ value ? format(parseISO(value), 'PPP') : 'Select a date' }}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent class="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            :model-value="toCalendarDate(value)"
                            @update:model-value="(d) => setValue(d ? `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` : '')"
                            v-bind="componentField"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  </FormField>

                  <FormField v-slot="{ componentField }" name="gender">
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select v-bind="componentField">
                        <FormControl>
                          <SelectTrigger class="w-full">
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
                </div>
              </template>

              <template v-if="stepIndex === 2">
                <FormField v-slot="{ componentField }" name="contact_number">
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="e.g., +639..." v-bind="componentField" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                <div class="flex flex-col gap-3 border rounded-lg p-4">
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
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" v-bind="componentField" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </template>

            </div>
          </CardContent>

          <CardFooter class="border-t pt-4 flex items-center justify-between">
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
          </CardFooter>
        </form>
      </Stepper>
    </Form>
  </Card>
</template>