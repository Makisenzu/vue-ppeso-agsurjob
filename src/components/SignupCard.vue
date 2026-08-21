<script setup lang="ts">
import SpotLightCard from './SpotLightCard.vue'
import { useSignup } from '@/composables/common/useSignup.ts'
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
  profileForm,
  applicantForm,
  companyForm,
  // PSGC
  psgcRegions,
  psgcProvinces,
  psgcCities,
  psgcBarangays,
  selectedRegion,
  selectedProvince,
  selectedCity,
  selectedBarangay,
  onRegionChange,
  onProvinceChange,
  onCityChange,
  onBarangayChange,
  // Select options
  GENDER_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
} = useSignup()
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
                  <Input id="firstName" v-model="profileForm.firstname" placeholder="Juan" />
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="middleName">Middle Name</Label>
                  <Input id="middleName" v-model="profileForm.middlename" placeholder="Santos" />
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="lastName">Last Name</Label>
                  <Input id="lastName" v-model="profileForm.lastname" placeholder="Dela Cruz" />
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="birthdate">Birthdate</Label>
                  <Input id="birthdate" v-model="profileForm.birthdate" type="date" />
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="gender">Gender</Label>
                  <NativeSelect id="gender" v-model="profileForm.gender" class="w-full!">
                    <NativeSelectOption value="" disabled>Select gender</NativeSelectOption>
                    <NativeSelectOption
                      v-for="opt in GENDER_OPTIONS"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </NativeSelectOption>
                  </NativeSelect>
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="contactNumber">Contact Number</Label>
                  <Input
                    id="contactNumber"
                    v-model="profileForm.contact_number"
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
                  :checked="profileForm.is_4ps"
                  @update:checked="(val: boolean) => (profileForm.is_4ps = val)"
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
                  :checked="profileForm.is_pwd"
                  @update:checked="(val: boolean) => (profileForm.is_pwd = val)"
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
                <Input id="email" v-model="profileForm.email" type="email" placeholder="example@example.com" />
                <Label for="username">Username</Label>
                <Input id="username" v-model="profileForm.username" type="text" placeholder="username"/>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="flex flex-col space-y-1.5">
                  <Label for="password">Password</Label>
                  <Input id="password" v-model="profileForm.password" type="password" placeholder="At least 6 characters" />
                  <p v-if="profileForm.password.length > 0 && profileForm.password.length < 6" class="text-xs text-destructive">
                    Password must be at least 6 characters.
                  </p>
                </div>
                <div class="flex flex-col space-y-1.5">
                  <Label for="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" v-model="confirmPassword" type="password" />
                  <p v-if="confirmPassword.length > 0 && confirmPassword !== profileForm.password" class="text-xs text-destructive">
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
                    <Label for="civilStatus">Civil Status</Label>
                    <NativeSelect
                      id="civilStatus"
                      v-model="applicantForm.civil_status"
                      class="w-full!"
                    >
                      <NativeSelectOption value="" disabled>Select civil status</NativeSelectOption>
                      <NativeSelectOption
                        v-for="opt in CIVIL_STATUS_OPTIONS"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </NativeSelectOption>
                    </NativeSelect>
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="employmentStatus">Employment Status</Label>
                    <NativeSelect
                      id="employmentStatus"
                      v-model="applicantForm.employment_status"
                      class="w-full!"
                    >
                      <NativeSelectOption value="" disabled>Select status</NativeSelectOption>
                      <NativeSelectOption
                        v-for="opt in EMPLOYMENT_STATUS_OPTIONS"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </NativeSelectOption>
                    </NativeSelect>
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="employmentType">Employment Type</Label>
                    <NativeSelect
                      id="employmentType"
                      v-model="applicantForm.employment_type"
                      class="w-full!"
                    >
                      <NativeSelectOption value="" disabled>Select type</NativeSelectOption>
                      <NativeSelectOption
                        v-for="opt in EMPLOYMENT_TYPE_OPTIONS"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </NativeSelectOption>
                    </NativeSelect>
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="educationLevel">Education Level</Label>
                    <NativeSelect
                      id="educationLevel"
                      v-model="applicantForm.educational_background.level"
                      class="w-full!"
                    >
                      <NativeSelectOption value="" disabled>Select education level</NativeSelectOption>
                      <NativeSelectOption
                        v-for="opt in EDUCATION_LEVEL_OPTIONS"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </NativeSelectOption>
                    </NativeSelect>
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="course">Course / Program</Label>
                    <Input
                      id="course"
                      v-model="applicantForm.educational_background.course"
                      placeholder="e.g. BS Information Technology"
                    />
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="preferredOccupations">Preferred Occupations</Label>
                    <Input
                      id="preferredOccupations"
                      v-model="applicantForm.preferred_occupations"
                      placeholder="e.g. Web Developer, Data Analyst"
                    />
                    <p class="text-xs text-muted-foreground">Separate multiple with commas</p>
                  </div>

                </div>

                <div class="flex flex-col space-y-1.5 mt-4">
                  <Label for="preferredLocations">Preferred Work Locations</Label>
                  <Input
                    id="preferredLocations"
                    v-model="applicantForm.preferred_local_locations"
                    placeholder="e.g. Naga City, Butuan City"
                  />
                  <p class="text-xs text-muted-foreground">Separate multiple with commas</p>
                </div>

              </template>

              <!-- Company Owner -->
              <template v-if="selectedRole === 'company_owner'">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div class="flex flex-col space-y-1.5">
                    <Label for="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      v-model="companyForm.company_name"
                      placeholder="Acme Corp"
                    />
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="companyEmail">Company Email</Label>
                    <Input
                      id="companyEmail"
                      v-model="companyForm.company_email"
                      type="email"
                      placeholder="hr@company.com"
                    />
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="companyContact">Company Contact</Label>
                    <Input
                      id="companyContact"
                      v-model="companyForm.company_contact"
                      type="tel"
                      placeholder="09XXXXXXXXX"
                    />
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="businessType">Business Type</Label>
                    <NativeSelect
                      id="businessType"
                      v-model="companyForm.business_type"
                      class="w-full!"
                    >
                      <NativeSelectOption value="" disabled>Select business type</NativeSelectOption>
                      <NativeSelectOption
                        v-for="opt in BUSINESS_TYPE_OPTIONS"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </NativeSelectOption>
                    </NativeSelect>
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="industry">Industry</Label>
                    <Input
                      id="industry"
                      v-model="companyForm.industry"
                      placeholder="e.g. Information Technology"
                    />
                  </div>

                  <div class="flex flex-col space-y-1.5">
                    <Label for="website">Website</Label>
                    <Input
                      id="website"
                      v-model="companyForm.website"
                      type="url"
                      placeholder="https://company.com"
                    />
                  </div>

                </div>

                <div class="flex flex-col space-y-1.5 mt-4">
                  <Label for="registrationNumber">Registration Number</Label>
                  <Input
                    id="registrationNumber"
                    v-model="companyForm.registration_number"
                    placeholder="DTI / SEC number"
                  />
                </div>

                <div class="flex flex-col space-y-1.5 mt-4">
                  <Label for="companyAddress">Company Address</Label>
                  <Input
                    id="companyAddress"
                    v-model="companyForm.company_address"
                    placeholder="Full address"
                  />
                </div>

                <div class="flex flex-col space-y-1.5 mt-4">
                  <Label for="companyDescription">Company Description</Label>
                  <Input
                    id="companyDescription"
                    v-model="companyForm.company_description"
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
                      <span>{{ profileForm.firstname }} {{ profileForm.middlename }} {{ profileForm.lastname }}</span>
                      <Label class="text-muted-foreground">Birthdate</Label>
                      <span>{{ profileForm.birthdate }}</span>
                      <Label class="text-muted-foreground">Gender</Label>
                      <span>{{ profileForm.gender }}</span>
                      <Label class="text-muted-foreground">Contact</Label>
                      <span>{{ profileForm.contact_number }}</span>
                    </div>
                  </div>
                  <div class="space-y-1">
                    <p class="font-medium text-foreground">Address & Status</p>
                    <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                      <Label class="text-muted-foreground">Region</Label>
                      <span>{{ profileForm.region }}</span>
                      <Label class="text-muted-foreground">Province</Label>
                      <span>{{ profileForm.province }}</span>
                      <Label class="text-muted-foreground">City</Label>
                      <span>{{ profileForm.geographic }}</span>
                      <Label class="text-muted-foreground">Barangay</Label>
                      <span>{{ profileForm.barangay }}</span>
                      <Label class="text-muted-foreground">4Ps</Label>
                      <span>{{ profileForm.is_4ps ? 'Yes' : 'No' }}</span>
                      <Label class="text-muted-foreground">PWD</Label>
                      <span>{{ profileForm.is_pwd ? 'Yes' : 'No' }}</span>
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
                      <span>{{ profileForm.email }}</span>
                      <Label class="text-muted-foreground">Username</Label>
                      <span>{{ profileForm.username }}</span>
                    </div>
                  </div>
                  <div class="space-y-1">
                    <p class="font-medium text-foreground">
                      {{ selectedRole === 'applicant' ? 'Applicant Details' : 'Company Owner Details' }}
                    </p>
                    <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                      <template v-if="selectedRole === 'applicant'">
                        <Label class="text-muted-foreground">Civil Status</Label>
                        <span>{{ applicantForm.civil_status || '--' }}</span>
                        <Label class="text-muted-foreground">Employment</Label>
                        <span>{{ applicantForm.employment_status || '--' }}</span>
                        <Label class="text-muted-foreground">Type</Label>
                        <span>{{ applicantForm.employment_type || '--' }}</span>
                        <Label class="text-muted-foreground">Education</Label>
                        <span>{{ applicantForm.educational_background.level || '--' }}</span>
                        <Label class="text-muted-foreground">Course</Label>
                        <span>{{ applicantForm.educational_background.course || '--' }}</span>
                        <Label class="text-muted-foreground">Occupations</Label>
                        <span>{{ applicantForm.preferred_occupations || '--' }}</span>
                        <Label class="text-muted-foreground">Locations</Label>
                        <span>{{ applicantForm.preferred_local_locations || '--' }}</span>
                      </template>
                      <template v-if="selectedRole === 'company_owner'">
                        <Label class="text-muted-foreground">Company</Label>
                        <span>{{ companyForm.company_name || '--' }}</span>
                        <Label class="text-muted-foreground">Email</Label>
                        <span>{{ companyForm.company_email || '--' }}</span>
                        <Label class="text-muted-foreground">Contact</Label>
                        <span>{{ companyForm.company_contact || '--' }}</span>
                        <Label class="text-muted-foreground">Type</Label>
                        <span>{{ companyForm.business_type || '--' }}</span>
                        <Label class="text-muted-foreground">Industry</Label>
                        <span>{{ companyForm.industry || '--' }}</span>
                        <Label class="text-muted-foreground">Address</Label>
                        <span>{{ companyForm.company_address || '--' }}</span>
                        <Label class="text-muted-foreground">Website</Label>
                        <span>{{ companyForm.website || '--' }}</span>
                        <Label class="text-muted-foreground">Reg. No.</Label>
                        <span>{{ companyForm.registration_number || '--' }}</span>
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