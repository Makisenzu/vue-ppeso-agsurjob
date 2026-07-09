<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { getRegions, getProvinces, getCities, getBarangays } from '@/helpers/psgcHelpers'
import { useAuthStore } from '@/stores/auth'
import { updateApplicantProfile } from '@/services/applicantProfileService'
import { Pencil, CalendarIcon, AlertCircle } from '@lucide/vue'
import { useToastAlert } from '@/composables/useToastAlert'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
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
  contact_number: authStore.profile?.contact_number || '',
  gender: authStore.profile?.gender ?? null,
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
    errors.value = {}
    formData.value = {
      firstname: authStore.profile?.firstname || '',
      middlename: authStore.profile?.middlename || '',
      lastname: authStore.profile?.lastname || '',
      username: authStore.profile?.username || '',
      birthdate: authStore.profile?.birthdate || '',
      contact_number: authStore.profile?.contact_number || '',
      gender: authStore.profile?.gender ?? null,
      is_pwd: authStore.profile?.is_pwd || false,
      is_4ps: authStore.profile?.is_4ps || false,
    }
    date.value = formData.value.birthdate
      ? parseDate(formData.value.birthdate.slice(0, 10))
      : undefined
  }
})

// Watch formData fields to clear validation errors dynamically when they are filled in
watch(
  formData,
  (newVal) => {
    if (newVal.firstname.trim() && errors.value.firstname) delete errors.value.firstname
    if (newVal.lastname.trim() && errors.value.lastname) delete errors.value.lastname
    if (newVal.username.trim() && errors.value.username) delete errors.value.username
    if (newVal.contact_number.trim() && errors.value.contact_number) delete errors.value.contact_number
    if (newVal.gender && errors.value.gender) delete errors.value.gender
  },
  { deep: true }
)

const handleSubmit = async () => {
  errors.value = {}

  if (!validateForm()) {
    return
  }

  isLoading.value = true
  try {
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
      contact_number: formData.value.contact_number.trim() || null,
      gender: (formData.value?.gender as 'male' | 'female' | 'non-binary' | 'prefer_not_to_say' | null) ?? null,
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

const getFieldLabel = (field: string) => {
  const labels: Record<string, string> = {
    firstname: 'First Name',
    lastname: 'Last Name',
    username: 'Username',
    contact_number: 'Contact Number',
    gender: 'Gender',
  }
  return labels[field] || field
}

const regions = ref([])
const provinces = ref([])
const cities = ref([])
const barangays = ref([])

const loadRegions = async () => {
  regions.value = await getRegions()
}

const loadProvinces = async (regionCode: string) => {
  provinces.value = await getProvinces(regionCode)
}

const loadCities = async (provinceCode: string) => {
  cities.value = await getCities(provinceCode)
}

const loadBarangays = async (cityCode: string) => {
  barangays.value = await getBarangays(cityCode)
}

onMounted(() => {
  loadRegions()
})
  
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
            <p v-if="errors.firstname" class="text-xs text-destructive">{{ errors.firstname }}</p>
          </div>

          <div class="space-y-2">
            <Label for="lastname">Last Name</Label>
            <Input
              id="lastname"
              v-model="formData.lastname"
              placeholder="Last name"
              :class="errors.lastname ? 'border-destructive' : ''"
            />
            <p v-if="errors.lastname" class="text-xs text-destructive">{{ errors.lastname }}</p>
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
            <p v-if="errors.username" class="text-xs text-destructive">{{ errors.username }}</p>
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
            <p v-if="errors.contact_number" class="text-xs text-destructive">{{ errors.contact_number }}</p>
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
                <SelectItem value="non-binary">Non-binary</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.gender" class="text-xs text-destructive">{{ errors.gender }}</p>
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

        <!-- Alert for incomplete inputs -->
        <Alert v-if="Object.keys(errors).length > 0" variant="destructive" class="mt-4">
          <AlertCircle class="h-4 w-4" />
          <AlertTitle class="font-semibold">Incomplete Form</AlertTitle>
          <AlertDescription>
            Please fill in the required fields: {{ Object.keys(errors).map(k => getFieldLabel(k)).join(', ') }}.
          </AlertDescription>
        </Alert>
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