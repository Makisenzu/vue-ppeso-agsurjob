<script setup lang="ts">
import { onMounted, watch } from 'vue'
import SpotLightCard from './SpotLightCard.vue'
import { useSignup } from '@/composables/common/useSignup.ts'
import { usePsgc } from '@/composables/common/usePsgc.ts'
import { Check, ChevronLeft } from '@lucide/vue'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Label from '@/components/ui/label/Label.vue'
import { Checkbox } from '@/components/ui/checkbox'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

const {
  roles,
  selectedRole,
  isSelected,
  currentStep,
  stepTitle,
  stepDescription,
  progressSteps,
  canProceed,
  nextStep,
  prevStep,
  confirmPassword,
  isSubmitting,
  submitError,
  handleSubmit,
  handleBack,
  signupData,
  applicantData,
  employerData,
} = useSignup()

// ─── PSGC cascading address ───
const {
  regions: psgcRegions,
  provinces: psgcProvinces,
  cities: psgcCities,
  barangays: psgcBarangays,
  selectedRegion,
  selectedProvince,
  selectedCity,
  selectedBarangay,
  initialize: initPsgc,
} = usePsgc()

onMounted(() => {
  initPsgc()
})

// Sync PSGC selections to signupData names
watch(selectedRegion, (val) => {
  signupData.region = val?.name ?? ''
})
watch(selectedProvince, (val) => {
  signupData.province = val?.name ?? ''
})
watch(selectedCity, (val) => {
  signupData.geographic = val?.name ?? ''
})
watch(selectedBarangay, (val) => {
  signupData.barangay = val?.name ?? ''
})

function onRegionChange(code: any) {
  const region = psgcRegions.value.find((r: any) => r.code === String(code))
  if (region) selectedRegion.value = region
}

function onProvinceChange(code: any) {
  const province = psgcProvinces.value.find((p: any) => p.code === String(code))
  if (province) selectedProvince.value = province
}

function onCityChange(code: any) {
  const city = psgcCities.value.find((c: any) => c.code === String(code))
  if (city) selectedCity.value = city
}

function onBarangayChange(code: any) {
  const barangay = psgcBarangays.value.find((b: any) => b.code === String(code))
  if (barangay) selectedBarangay.value = barangay
}
</script>

<template>
  <Card :class="[
    'w-full box-border overflow-hidden transition-[max-width] duration-300 ease-in-out **:data-[slot=native-select-wrapper]:w-full!',
    currentStep >= 4 ? 'max-w-2xl' : 'max-w-md'
  ]">
    <!-- ─── Step 0: Role Selection ─── -->
    <template v-if="currentStep === 0">
      <CardHeader>
        <CardTitle>{{ stepTitle }}</CardTitle>
        <CardDescription>{{ stepDescription }}</CardDescription>
      </CardHeader>

      <CardContent class="space-y-2.5">
        <SpotLightCard
          v-for="(role, index) in roles"
          :key="role.id"
          :class="[
            'py-3.5! px-4! rounded-xl cursor-pointer flex items-center justify-between gap-3 border-[1.5px] transition-all duration-200 ease-in-out animate-in fade-in slide-in-from-bottom-2',
            isSelected(role.id) 
              ? 'border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.1)] bg-primary/4' 
              : 'border-border hover:border-primary/40'
          ]"
          :style="{ animationDelay: `${index * 80}ms`, animationDuration: '350ms' }"
          spotlight-color="rgba(0, 0, 196, 1.5)"
          @click="selectedRole = role.id"
        >
          <div class="flex items-center gap-3">
            <div :class="[
              'flex items-center justify-center w-9 h-9 shrink-0 rounded-lg transition-colors duration-200 ease-in-out',
              isSelected(role.id) ? 'bg-primary/0.12 text-primary' : 'bg-muted text-muted-foreground'
            ]">
              <component :is="role.icon" class="h-5 w-5" />
            </div>
            <div class="min-w-0">
              <p class="font-medium leading-snug">{{ role.label }}</p>
              <p class="text-sm text-muted-foreground leading-snug">
                {{ role.description }}
              </p>
            </div>
          </div>
          <Transition
            enter-active-class="transition-all duration-200 ease-in-out"
            leave-active-class="transition-all duration-150 ease-in-out"
            enter-from-class="opacity-0 scale-50"
            leave-to-class="opacity-0 scale-50"
          >
            <Check
              v-if="isSelected(role.id)"
              class="h-5 w-5 shrink-0 text-primary"
            />
          </Transition>
        </SpotLightCard>
      </CardContent>

      <CardFooter class="flex flex-col gap-3">
        <Button class="w-full" :disabled="!canProceed" @click="nextStep">
          Continue
        </Button>
        <div class="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          <span>Already have an account?</span>
          <Button variant="link" class="h-auto p-0" @click="handleBack">
            Log in
          </Button>
        </div>
      </CardFooter>
    </template>

    <!-- ─── Steps 1-5: Form Steps ─── -->
    <template v-else>
      <CardHeader>
        <CardTitle>{{ stepTitle }}</CardTitle>
        <CardDescription>{{ stepDescription }}</CardDescription>
        <CardAction>
          <span class="text-xs text-muted-foreground whitespace-nowrap">Step {{ currentStep }}/{{ progressSteps.length }}</span>
        </CardAction>
      </CardHeader>

      <!-- Stepper indicator -->
      <div class="px-6 pb-2">
        <div class="flex items-center gap-1">
          <template v-for="s in progressSteps" :key="s.step">
            <div
              :class="[
                'flex items-center justify-center w-6 h-6 shrink-0 rounded-full border-[1.5px] text-[0.625rem] transition-all duration-200 ease-in-out',
                s.step <= currentStep 
                  ? 'border-primary bg-primary text-primary-foreground' 
                  : 'border-border bg-transparent text-muted-foreground'
              ]"
            >
              <Check v-if="s.step < currentStep" class="h-3 w-3" />
              <span v-else class="text-[10px] font-medium">{{ s.step }}</span>
            </div>
            <div
              v-if="s.step < progressSteps.length"
              :class="[
                'flex-1 h-[1.5px] transition-colors duration-200 ease-in-out',
                s.step < currentStep ? 'bg-primary' : 'bg-border'
              ]"
            />
          </template>
        </div>
      </div>

      <CardContent>
        <form @submit.prevent>
          <div class="grid w-full items-center gap-4">

            <!-- ─── Step 1: Personal Details ─── -->
            <template v-if="currentStep === 1">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col space-y-1.5">
                  <Label for="firstName">First Name</Label>
                  <Input id="firstName" v-model="signupData.firstName" placeholder="Juan" />
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="middleName">Middle Name</Label>
                  <Input id="middleName" v-model="signupData.middlename" placeholder="Santos" />
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="lastName">Last Name</Label>
                  <Input id="lastName" v-model="signupData.lastName" placeholder="Dela Cruz" />
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="birthdate">Birthdate</Label>
                  <Input id="birthdate" v-model="signupData.birthdate" type="date" />
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="gender">Gender</Label>
                  <NativeSelect id="gender" v-model="signupData.gender" class="w-full!">
                    <NativeSelectOption value="" disabled>Select gender</NativeSelectOption>
                    <NativeSelectOption value="man">Man</NativeSelectOption>
                    <NativeSelectOption value="woman">Woman</NativeSelectOption>
                    <NativeSelectOption value="non_binary">Non-binary</NativeSelectOption>
                    <NativeSelectOption value="prefer_not_to_say">Prefer not to say</NativeSelectOption>
                  </NativeSelect>
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="contactNumber">Contact Number</Label>
                  <Input
                    id="contactNumber"
                    v-model="signupData.contact_number"
                    type="tel"
                    placeholder="09XXXXXXXXX"
                  />
                </div>
              </div>
            </template>

            <!-- ─── Step 2: Address & Status ─── -->
              <template v-if="currentStep === 2">
                <!-- Region -->
                <div class="flex flex-col space-y-1.5">
                  <Label for="region">Region</Label>
                  <NativeSelect
                    id="region"
                    :model-value="selectedRegion?.code ?? ''"
                    class="w-full!"
                    @update:model-value="onRegionChange"
                  >
                    <NativeSelectOption value="" disabled>
                      {{ psgcRegions.length === 0 ? 'Loading...' : 'Select region' }}
                    </NativeSelectOption>

                    <NativeSelectOption
                      v-for="r in psgcRegions"
                      :key="r.code"
                      :value="r.code"
                    >
                      {{ r.name }}
                    </NativeSelectOption>
                  </NativeSelect>
                </div>

                <!-- Province + City -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <!-- Province -->
                  <div class="flex flex-col space-y-1.5">
                    <Label for="province">Province</Label>
                    <NativeSelect
                      id="province"
                      :model-value="selectedProvince?.code ?? ''"
                      :disabled="!selectedRegion"
                      class="w-full!"
                      @update:model-value="onProvinceChange"
                    >
                      <NativeSelectOption value="" disabled>
                        {{
                          !selectedRegion
                            ? 'Select a region first'
                            : psgcProvinces.length === 0
                              ? 'Loading...'
                              : 'Select province'
                        }}
                      </NativeSelectOption>

                      <NativeSelectOption
                        v-for="p in psgcProvinces"
                        :key="p.code"
                        :value="p.code"
                      >
                        {{ p.name }}
                      </NativeSelectOption>
                    </NativeSelect>
                  </div>

                  <!-- City / Municipality -->
                  <div class="flex flex-col space-y-1.5">
                    <Label for="geographic">City / Municipality</Label>
                    <NativeSelect
                      id="geographic"
                      :model-value="selectedCity?.code ?? ''"
                      :disabled="!selectedProvince"
                      class="w-full!"
                      @update:model-value="onCityChange"
                    >
                      <NativeSelectOption value="" disabled>
                        {{
                          !selectedProvince
                            ? 'Select a province first'
                            : psgcCities.length === 0
                              ? 'Loading...'
                              : 'Select city / municipality'
                        }}
                      </NativeSelectOption>

                      <NativeSelectOption
                        v-for="c in psgcCities"
                        :key="c.code"
                        :value="c.code"
                      >
                        {{ c.name }}
                      </NativeSelectOption>
                    </NativeSelect>
                  </div>
                </div>

                <!-- Barangay -->
                <div class="flex flex-col space-y-1.5">
                  <Label for="barangay">Barangay</Label>
                  <NativeSelect
                    id="barangay"
                    :model-value="selectedBarangay?.code ?? ''"
                    :disabled="!selectedCity"
                    class="w-full!"
                    @update:model-value="onBarangayChange"
                  >
                    <NativeSelectOption value="" disabled>
                      {{
                        !selectedCity
                          ? 'Select a city first'
                          : psgcBarangays.length === 0
                            ? 'Loading...'
                            : 'Select barangay'
                      }}
                    </NativeSelectOption>

                    <NativeSelectOption
                      v-for="b in psgcBarangays"
                      :key="b.code"
                      :value="b.code"
                    >
                      {{ b.name }}
                    </NativeSelectOption>
                  </NativeSelect>
                </div>

                <!-- Checkboxes -->
                <div class="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="is4ps"
                    :checked="signupData.is_4ps"
                    @update:checked="(val: boolean) => (signupData.is_4ps = val)"
                  />
                  <Label
                    for="is4ps"
                    class="text-sm font-normal cursor-pointer"
                  >
                    4Ps member
                  </Label>
                </div>

                <div class="flex items-center gap-2">
                  <Checkbox
                    id="isPwd"
                    :checked="signupData.is_pwd"
                    @update:checked="(val: boolean) => (signupData.is_pwd = val)"
                  />
                  <Label
                    for="isPwd"
                    class="text-sm font-normal cursor-pointer"
                  >
                    Person with Disability (PWD)
                  </Label>
                </div>
              </template>

            <!-- ─── Step 3: Account Credentials ─── -->
            <template v-if="currentStep === 3">
              <div class="flex flex-col space-y-1.5">
                <Label for="email">Email</Label>
                <Input id="email" v-model="signupData.email" type="email" placeholder="example@example.com" />
                <Label for="username">Username</Label>
                <Input id="username" v-model="signupData.username" type="text" placeholder="username"/>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col space-y-1.5">
                  <Label for="password">Password</Label>
                  <Input id="password" v-model="signupData.password" type="password" placeholder="At least 6 characters" />
                  <p v-if="signupData.password.length > 0 && signupData.password.length < 6" class="text-xs text-destructive">
                    Password must be at least 6 characters.
                  </p>
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" v-model="confirmPassword" type="password" />
                  <p v-if="confirmPassword.length > 0 && confirmPassword !== signupData.password" class="text-xs text-destructive">
                    Passwords do not match.
                  </p>
                </div>
              </div>
            </template>

            <!-- ─── Step 4: Role-Specific ─── -->
            <template v-if="currentStep === 4">

              <!-- Applicant -->
              <template v-if="selectedRole === 'applicant'">

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div class="flex flex-col space-y-1.5">
                    <Label for="educationLevel">Education Level</Label>
                    <NativeSelect
                      id="educationLevel"
                      v-model="applicantData.education_level"
                      class="w-full!"
                    >
                      <NativeSelectOption value="" disabled>Select education level</NativeSelectOption>
                      <NativeSelectOption value="Elementary">Elementary</NativeSelectOption>
                      <NativeSelectOption value="High School">High School</NativeSelectOption>
                      <NativeSelectOption value="Senior High School">Senior High School</NativeSelectOption>
                      <NativeSelectOption value="Vocational">Vocational</NativeSelectOption>
                      <NativeSelectOption value="College">College</NativeSelectOption>
                      <NativeSelectOption value="Post Graduate">Post Graduate</NativeSelectOption>
                    </NativeSelect>
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="employmentStatus">Employment Status</Label>
                    <NativeSelect
                      id="employmentStatus"
                      v-model="applicantData.employment_status"
                      class="w-full!"
                    >
                      <NativeSelectOption value="" disabled>Select status</NativeSelectOption>
                      <NativeSelectOption value="Unemployed">Unemployed</NativeSelectOption>
                      <NativeSelectOption value="Employed">Employed</NativeSelectOption>
                      <NativeSelectOption value="Self-Employed">Self-Employed</NativeSelectOption>
                      <NativeSelectOption value="Student">Student</NativeSelectOption>
                    </NativeSelect>
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="course">Course / Program</Label>
                    <Input
                      id="course"
                      v-model="applicantData.course"
                      placeholder="e.g. BS Information Technology"
                    />
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="yearsExperience">Years of Experience</Label>
                    <Input
                      id="yearsExperience"
                      v-model="applicantData.years_experience"
                      type="number"
                      placeholder="0"
                    />
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="preferredJob">Preferred Job</Label>
                    <Input
                      id="preferredJob"
                      v-model="applicantData.preferred_job"
                      placeholder="e.g. Web Developer"
                    />
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="preferredLocation">Preferred Location</Label>
                    <Input
                      id="preferredLocation"
                      v-model="applicantData.preferred_location"
                      placeholder="e.g. Naga City"
                    />
                  </div>

                </div>

                <div class="flex flex-col space-y-1.5 mt-4">
                  <Label for="expectedSalary">Expected Salary</Label>
                  <Input
                    id="expectedSalary"
                    v-model="applicantData.expected_salary"
                    type="number"
                    placeholder="0"
                  />
                </div>

              </template>

  <!-- Company Owner -->
  <template v-if="selectedRole === 'company_owner'">

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

      <div class="flex flex-col space-y-1.5">
        <Label for="companyName">Company Name</Label>
        <Input
          id="companyName"
          v-model="employerData.company_name"
          placeholder="Acme Corp"
        />
      </div>

      <div class="flex flex-col space-y-1.5">
        <Label for="companyEmail">Company Email</Label>
        <Input
          id="companyEmail"
          v-model="employerData.company_email"
          type="email"
          placeholder="hr@company.com"
        />
      </div>

      <div class="flex flex-col space-y-1.5">
        <Label for="companyContact">Company Contact</Label>
        <Input
          id="companyContact"
          v-model="employerData.company_contact"
          type="tel"
          placeholder="09XXXXXXXXX"
        />
      </div>

      <div class="flex flex-col space-y-1.5">
        <Label for="businessType">Business Type</Label>
        <NativeSelect
          id="businessType"
          v-model="employerData.business_type"
          class="w-full!"
        >
          <NativeSelectOption value="" disabled>Select business type</NativeSelectOption>
          <NativeSelectOption value="Sole Proprietorship">Sole Proprietorship</NativeSelectOption>
          <NativeSelectOption value="Partnership">Partnership</NativeSelectOption>
          <NativeSelectOption value="Corporation">Corporation</NativeSelectOption>
          <NativeSelectOption value="Cooperative">Cooperative</NativeSelectOption>
          <NativeSelectOption value="Government">Government</NativeSelectOption>
          <NativeSelectOption value="NGO">NGO</NativeSelectOption>
        </NativeSelect>
      </div>

      <div class="flex flex-col space-y-1.5">
        <Label for="industry">Industry</Label>
        <Input
          id="industry"
          v-model="employerData.industry"
          placeholder="e.g. Information Technology"
        />
      </div>

      <div class="flex flex-col space-y-1.5">
        <Label for="website">Website</Label>
        <Input
          id="website"
          v-model="employerData.website"
          type="url"
          placeholder="https://company.com"
        />
      </div>

    </div>

    <div class="flex flex-col space-y-1.5 mt-4">
      <Label for="registrationNumber">Registration Number</Label>
      <Input
        id="registrationNumber"
        v-model="employerData.registration_number"
        placeholder="DTI / SEC number"
      />
    </div>

    <div class="flex flex-col space-y-1.5 mt-4">
      <Label for="companyAddress">Company Address</Label>
      <Input
        id="companyAddress"
        v-model="employerData.company_address"
        placeholder="Full address"
      />
    </div>

    <div class="flex flex-col space-y-1.5 mt-4">
      <Label for="companyDescription">Company Description</Label>
      <Input
        id="companyDescription"
        v-model="employerData.company_description"
        placeholder="Brief description"
      />
    </div>

  </template>

            </template>
            <!-- ─── Step 5: Review ─── -->
            <template v-if="currentStep === 5">
              <div class="space-y-4 text-sm">
                <!-- Personal + Address side by side -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div class="space-y-1">
                    <p class="font-medium text-foreground">Personal Details</p>
                    <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                      <Label class="text-muted-foreground">Name</Label>
                      <span>{{ signupData.firstName }} {{ signupData.middlename }} {{ signupData.lastName }}</span>
                      <Label class="text-muted-foreground">Birthdate</Label>
                      <span>{{ signupData.birthdate }}</span>
                      <Label class="text-muted-foreground">Gender</Label>
                      <span>{{ signupData.gender }}</span>
                      <Label class="text-muted-foreground">Contact</Label>
                      <span>{{ signupData.contact_number }}</span>
                    </div>
                  </div>
                  <div class="space-y-1">
                    <p class="font-medium text-foreground">Address & Status</p>
                    <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                      <Label class="text-muted-foreground">Region</Label>
                      <span>{{ signupData.region }}</span>
                      <Label class="text-muted-foreground">Province</Label>
                      <span>{{ signupData.province }}</span>
                      <Label class="text-muted-foreground">City</Label>
                      <span>{{ signupData.geographic }}</span>
                      <Label class="text-muted-foreground">Barangay</Label>
                      <span>{{ signupData.barangay }}</span>
                      <Label class="text-muted-foreground">4Ps</Label>
                      <span>{{ signupData.is_4ps ? 'Yes' : 'No' }}</span>
                      <Label class="text-muted-foreground">PWD</Label>
                      <span>{{ signupData.is_pwd ? 'Yes' : 'No' }}</span>
                    </div>
                  </div>
                </div>

                <hr class="border-border" />

                <!-- Account + Role-specific side by side -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div class="space-y-1">
                    <p class="font-medium text-foreground">Account</p>
                    <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                      <Label class="text-muted-foreground">Email</Label>
                      <span>{{ signupData.email }}</span>
                      <Label class="text-muted-foreground">Username</Label>
                      <span>{{ signupData.username }}</span>
                    </div>
                  </div>
                  <div class="space-y-1">
                    <p class="font-medium text-foreground">
                      {{ selectedRole === 'applicant' ? 'Applicant Details' : 'Company Owner Details' }}
                    </p>
                    <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                      <template v-if="selectedRole === 'applicant'">
                        <Label class="text-muted-foreground">Education</Label>
                        <span>{{ applicantData.education_level || '--' }}</span>
                        <Label class="text-muted-foreground">Course</Label>
                        <span>{{ applicantData.course || '--' }}</span>
                        <Label class="text-muted-foreground">Experience</Label>
                        <span>{{ applicantData.years_experience || '0' }} yr(s)</span>
                        <Label class="text-muted-foreground">Status</Label>
                        <span>{{ applicantData.employment_status || '--' }}</span>
                        <Label class="text-muted-foreground">Job</Label>
                        <span>{{ applicantData.preferred_job || '--' }}</span>
                        <Label class="text-muted-foreground">Location</Label>
                        <span>{{ applicantData.preferred_location || '--' }}</span>
                        <Label class="text-muted-foreground">Salary</Label>
                        <span>{{ applicantData.expected_salary || '--' }}</span>
                      </template>
                      <template v-if="selectedRole === 'company_owner'">
                        <Label class="text-muted-foreground">Company</Label>
                        <span>{{ employerData.company_name || '--' }}</span>
                        <Label class="text-muted-foreground">Email</Label>
                        <span>{{ employerData.company_email || '--' }}</span>
                        <Label class="text-muted-foreground">Contact</Label>
                        <span>{{ employerData.company_contact || '--' }}</span>
                        <Label class="text-muted-foreground">Type</Label>
                        <span>{{ employerData.business_type || '--' }}</span>
                        <Label class="text-muted-foreground">Industry</Label>
                        <span>{{ employerData.industry || '--' }}</span>
                        <Label class="text-muted-foreground">Address</Label>
                        <span>{{ employerData.company_address || '--' }}</span>
                        <Label class="text-muted-foreground">Website</Label>
                        <span>{{ employerData.website || '--' }}</span>
                        <Label class="text-muted-foreground">Reg. No.</Label>
                        <span>{{ employerData.registration_number || '--' }}</span>
                      </template>
                    </div>
                  </div>
                </div>
              </div>

              <p v-if="submitError" class="text-sm text-destructive text-center mt-3">
                {{ submitError }}
              </p>
        </template>

          </div>
        </form>
      </CardContent>

      <CardFooter class="flex items-center gap-2">
        <Button variant="outline" class="flex-1" @click="prevStep">
          <ChevronLeft class="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button
          v-if="currentStep < 5"
          class="flex-1"
          :disabled="!canProceed"
          @click="nextStep"
        >
          Continue
        </Button>
        <Button
          v-else
          class="flex-1"
          :disabled="isSubmitting"
          @click="handleSubmit"
        >
          {{ isSubmitting ? 'Creating account...' : 'Create Account' }}
        </Button>
      </CardFooter>
    </template>
  </Card>
</template>