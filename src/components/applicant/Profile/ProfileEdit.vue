<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { Pencil, CalendarIcon, AlertCircle, CheckIcon, ChevronsUpDownIcon } from '@lucide/vue'
import { usePsgc } from '@/composables/common/usePsgc'
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
  Combobox,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxViewport,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxGroup,
  ComboboxItemIndicator,
} from '@/components/ui/combobox'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import useProfileEdit from '@/composables/applicant/useProfileEdit'

const {
  selectedRegion,
  selectedProvince,
  selectedCity,
  selectedBarangay,
  regionSearch,
  provinceSearch,
  citySearch,
  barangaySearch,
  filteredRegions,
  filteredProvinces,
  filteredCities,
  filteredBarangays,
  initialize,
  reset,
} = usePsgc()

const {
  formData,
  date,
  birthdateLabel,
  isLoading,
  isOpen,
  errors,
  handleSubmit,
  getFieldLabel,
} = useProfileEdit()

watch(isOpen, async (newVal) => {
  if (newVal) {
    await initialize(
      formData.value.region,
      formData.value.province,
      formData.value.geographic,
      formData.value.barangay
    )
  } else {
    reset()
  }
})

onMounted(() => {
  initialize()
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

        <!-- Location Fields - Region, Province, City, Barangay -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Region -->
          <div class="space-y-2">
            <Label for="region">Region</Label>
            <Combobox v-model="selectedRegion" v-model:search-term="regionSearch" :ignore-filter="true" by="name">
              <ComboboxAnchor as-child>
                <ComboboxTrigger as-child>
                  <Button variant="outline" class="w-full justify-between overflow-hidden">
                      <span class="truncate text-left flex-1">
                        {{ selectedRegion?.name ?? 'Select region...' }}
                      </span>
                    <ChevronsUpDownIcon class="opacity-50" />
                  </Button>
                </ComboboxTrigger>
              </ComboboxAnchor>

              <ComboboxList>
                <ComboboxInput placeholder="Search region..." @input="regionSearch = ($event.target as HTMLInputElement).value"/>
                <ComboboxViewport>
                  <ComboboxEmpty>No region found.</ComboboxEmpty>
                  <ComboboxGroup>
                    <ComboboxItem
                      v-for="region in filteredRegions"
                      :key="region.code"
                      :value="region"
                    >
                      {{ region.name }}
                      <ComboboxItemIndicator>
                        <CheckIcon />
                      </ComboboxItemIndicator>
                    </ComboboxItem>
                  </ComboboxGroup>
                </ComboboxViewport>
              </ComboboxList>
            </Combobox>
          </div>

          <!-- Province -->
          <div class="space-y-2">
            <Label for="province">Province</Label>
            <Combobox v-model="selectedProvince" v-model:search-term="provinceSearch" :ignore-filter="true" :disabled="!selectedRegion" by="name">
              <ComboboxAnchor as-child>
                <ComboboxTrigger as-child>
                  <Button variant="outline" class="w-full justify-between overflow-hidden" :class="!selectedRegion ? 'opacity-60' : ''">
                    <span class="truncate text-left flex-1">
                      {{ selectedProvince?.name ?? 'Select province...' }}
                    </span>
                    <ChevronsUpDownIcon class="opacity-50" />
                  </Button>
                </ComboboxTrigger>
              </ComboboxAnchor>

              <ComboboxList v-if="selectedRegion">
                <ComboboxInput placeholder="Search province..." @input="provinceSearch = ($event.target as HTMLInputElement).value"/>
                <ComboboxViewport>
                  <ComboboxEmpty>No province found.</ComboboxEmpty>
                  <ComboboxGroup>
                    <ComboboxItem
                      v-for="province in filteredProvinces"
                      :key="province.code"
                      :value="province"
                    >
                      {{ province.name }}
                      <ComboboxItemIndicator>
                        <CheckIcon />
                      </ComboboxItemIndicator>
                    </ComboboxItem>
                  </ComboboxGroup>
                </ComboboxViewport>
              </ComboboxList>
            </Combobox>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- City -->
          <div class="space-y-2">
            <Label for="city">City / Municipality</Label>
            <Combobox v-model="selectedCity" v-model:search-term="citySearch" :ignore-filter="true" :disabled="!selectedProvince" by="name">
              <ComboboxAnchor as-child>
                <ComboboxTrigger as-child>
                  <Button variant="outline" class="w-full justify-between overflow-hidden" :class="!selectedProvince ? 'opacity-60' : ''">
                    <span class="truncate text-left flex-1">
                      {{ selectedCity?.name ?? 'Select city...' }}
                    </span>
                    <ChevronsUpDownIcon class="opacity-50" />
                  </Button>
                </ComboboxTrigger>
              </ComboboxAnchor>

              <ComboboxList v-if="selectedProvince">
                <ComboboxInput placeholder="Search city..." @input="citySearch = ($event.target as HTMLInputElement).value"/>
                <ComboboxViewport>
                  <ComboboxEmpty>No city found.</ComboboxEmpty>
                  <ComboboxGroup>
                    <ComboboxItem
                      v-for="city in filteredCities"
                      :key="city.code"
                      :value="city"
                    >
                      {{ city.name }}
                      <ComboboxItemIndicator>
                        <CheckIcon />
                      </ComboboxItemIndicator>
                    </ComboboxItem>
                  </ComboboxGroup>
                </ComboboxViewport>
              </ComboboxList>
            </Combobox>
          </div>

          <!-- Barangay -->
          <div class="space-y-2">
            <Label for="barangay">Barangay</Label>
            <Combobox v-model="selectedBarangay" v-model:search-term="barangaySearch" :ignore-filter="true" :disabled="!selectedCity" by="name">
              <ComboboxAnchor as-child>
                <ComboboxTrigger as-child>
                  <Button variant="outline" class="w-full justify-between overflow-hidden" :class="!selectedCity ? 'opacity-60' : ''">
                    <span class="truncate text-left flex-1">
                      {{ selectedBarangay?.name ?? 'Select barangay...' }}
                    </span>
                    <ChevronsUpDownIcon class="opacity-50" />
                  </Button>
                </ComboboxTrigger>
              </ComboboxAnchor>

              <ComboboxList v-if="selectedCity">
                <ComboboxInput placeholder="Search barangay..." @input="barangaySearch = ($event.target as HTMLInputElement).value"/>
                <ComboboxViewport>
                  <ComboboxEmpty>No barangay found.</ComboboxEmpty>
                  <ComboboxGroup>
                    <ComboboxItem
                      v-for="barangay in filteredBarangays"
                      :key="barangay.code"
                      :value="barangay"
                    >
                      {{ barangay.name }}
                      <ComboboxItemIndicator>
                        <CheckIcon />
                      </ComboboxItemIndicator>
                    </ComboboxItem>
                  </ComboboxGroup>
                </ComboboxViewport>
              </ComboboxList>
            </Combobox>
          </div>
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
          @click="handleSubmit({ region: selectedRegion?.name, province: selectedProvince?.name, geographic: selectedCity?.name, barangay: selectedBarangay?.name })"
          :disabled="isLoading"
        >
          {{ isLoading ? 'Saving...' : 'Save Changes' }}
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>