<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { updateApplicantProfile } from '@/services/applicantProfileService'
import { Pencil, CalendarIcon } from '@lucide/vue'
import { useToastAlert } from '@/composables/useToastAlert'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  DateFormatter,
  getLocalTimeZone,
  parseDate,
} from '@internationalized/date'

import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const authStore = useAuthStore()

const formData = ref({
  firstname: authStore.profile?.firstname || '',
  middlename: authStore.profile?.middlename || '',
  lastname: authStore.profile?.lastname || '',
  username: authStore.profile?.username || '',
  birthdate: authStore.profile?.birthdate || '',
  current_address: authStore.profile?.current_address || '',
  home_address: authStore.profile?.home_address || '',
  contact_number: authStore.profile?.contact_number || '',
  gender: authStore.profile?.gender || '',
  is_pwd: authStore.profile?.is_pwd || false,
  is_4ps: authStore.profile?.is_4ps || false,
})

// Parse the current birthdate from the profile
const date = ref<any>(
  formData.value.birthdate
    ? parseDate(formData.value.birthdate.slice(0, 10))
    : undefined
)

const df = new DateFormatter('en-US', {
  dateStyle: 'long',
})

const isLoading = ref(false)
const isOpen = ref(false)
const toastAlert = useToastAlert()

const birthdateLabel = computed(() => {
  if (!date.value) return 'Select birthdate'
  return df.format(date.value.toDate(getLocalTimeZone()))
})

// Watch sheet visibility to sync with authStore profile state when opened
watch(isOpen, (newVal) => {
  if (newVal) {
    formData.value = {
      firstname: authStore.profile?.firstname || '',
      middlename: authStore.profile?.middlename || '',
      lastname: authStore.profile?.lastname || '',
      username: authStore.profile?.username || '',
      birthdate: authStore.profile?.birthdate || '',
      current_address: authStore.profile?.current_address || '',
      home_address: authStore.profile?.home_address || '',
      contact_number: authStore.profile?.contact_number || '',
      gender: authStore.profile?.gender || '',
      is_pwd: authStore.profile?.is_pwd || false,
      is_4ps: authStore.profile?.is_4ps || false,
    }
    date.value = formData.value.birthdate
      ? parseDate(formData.value.birthdate.slice(0, 10))
      : undefined
  }
})

const handleSubmit = async () => {
  isLoading.value = true
  errors.value = {}

  try {
    if (!validateForm()) {
      
      return
    }

    formData.value.birthdate = date.value
      ? date.value.toString()
      : ''

    const userId = authStore.user?.id
    if (!userId) throw new Error('No authenticated user found')

    await updateApplicantProfile(userId, {
      firstname: formData.value.firstname.trim(),
      middlename: formData.value.middlename.trim(),
      lastname: formData.value.lastname.trim(),
      username: formData.value.username.trim(),
      birthdate: formData.value.birthdate || null,
      current_address: formData.value.current_address.trim() || null,
      home_address: formData.value.home_address.trim() || null,
      contact_number: formData.value.contact_number.trim() || null,
      gender: formData.value.gender || null,
      is_pwd: formData.value.is_pwd || null,
      is_4ps: formData.value.is_4ps || null,
    })

    await authStore.fetchProfile(userId)

    toastAlert.success('Profile updated successfully')
    isOpen.value = false
  } catch (error: any) {
    console.error('Failed to update profile:', error)
    toastAlert.error('Update Failed', error.message || 'Failed to update profile')
  } finally {
    isLoading.value = false
  }
}
const requiredFields = ['firstname', 'lastname', 'username', 'contact_number', 'gender'] as const
const errors = ref<Record<string, string>>({})
const validateForm = () => {
  const nextErrors: Record<string, string> = {}

  if (!formData.value.firstname.trim()) nextErrors.firstname = 'First name is required'
  if (!formData.value.lastname.trim()) nextErrors.lastname = 'Last name is required'
  if (!formData.value.username.trim()) nextErrors.username = 'Username is required'
  if (!formData.value.contact_number.trim()) nextErrors.contact_number = 'Contact number is required'
  if (!formData.value.gender) nextErrors.gender = 'Gender is required'

  errors.value = nextErrors
  return Object.keys(nextErrors).length === 0
}
</script>

<template>
  <Sheet v-model:open="isOpen">
    <SheetTrigger as-child>
      <Button class="flex-1 rounded-xl gap-2 shadow-sm hover:shadow-md transition-shadow">
        <Pencil class="size-4" />
        Edit Profile
      </Button>
    </SheetTrigger>

    <SheetContent class="sm:max-w-lg flex flex-col h-full p-0">
      <SheetHeader class="px-6 pt-6 pb-2 shrink-0">
        <SheetTitle>Edit Profile</SheetTitle>
        <SheetDescription>
          Update your personal information
        </SheetDescription>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <!-- Names Grid -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="firstname">First Name</Label>
            <Input
              id="firstname"
              v-model="formData.firstname"
              placeholder="First name"
              :class="errors.firstname ? 'border-destructive' : ''"
            />
          </div>

          <div class="space-y-2">
            <Label for="lastname">Last Name</Label>
            <Input
              id="lastname"
              v-model="formData.lastname"
              placeholder="Last name"
              :class="errors.lastname ? 'border-destructive' : ''"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="middlename">Middle Name</Label>
            <Input
              id="middlename"
              v-model="formData.middlename"
              placeholder="Middle name"
              :class="errors.middlename ? 'border-destructive' : ''"
            />
          </div>

          <div class="space-y-2">
            <Label for="username">Username</Label>
            <Input
              id="username"
              v-model="formData.username"
              placeholder="Username"
              :class="errors.username ? 'border-destructive' : ''"
            />
          </div>
        </div>

        <!-- Contact & Gender Grid -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="contact_number">Contact Number</Label>
            <Input
              id="contact_number"
              v-model="formData.contact_number"
              placeholder="Contact number"
              :class="errors.contact_number ? 'border-destructive' : ''"
            />
          </div>

          <div class="space-y-2">
            <Label for="gender">Gender</Label>
            <Select v-model="formData.gender">
              <SelectTrigger 
                id="gender" 
                class="w-full" 
                :class="errors.gender ? 'border-destructive' : ''">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Birthdate -->
        <div class="space-y-2">
          <Label>Birthdate</Label>
          <Popover v-slot="{ close }">
            <PopoverTrigger as-child>
              <Button
                variant="outline"
                :class="
                  cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )
                "
              >
                <CalendarIcon class="mr-2 h-4 w-4" />
                {{ birthdateLabel }}
              </Button>
            </PopoverTrigger>

            <PopoverContent class="w-auto p-0" align="start">
              <Calendar
                v-model="date"
                layout="month-and-year"
                initial-focus
                @update:model-value="close"
              />
            </PopoverContent>
          </Popover>
        </div>

        <!-- Addresses -->
        <div class="space-y-2">
          <Label for="current_address">Current Address</Label>
          <Input
            id="current_address"
            v-model="formData.current_address"
            placeholder="Current address"
          />
        </div>

        <div class="space-y-2">
          <Label for="home_address">Home Address</Label>
          <Input
            id="home_address"
            v-model="formData.home_address"
            placeholder="Home address"
          />
        </div>
      </div>

      <div class="flex justify-end gap-3 border-t border-border p-6 bg-transparent shrink-0">
        <Button
          variant="outline"
          @click="isOpen = false"
          :disabled="isLoading"
        >
          Cancel
        </Button>

        <Button
          @click="handleSubmit"
          :disabled="isLoading"
        >
          {{ isLoading ? 'Saving...' : 'Save Changes' }}
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>