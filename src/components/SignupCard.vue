<script setup lang="ts">
import { useSignup } from '@/composables/common/useSignup'
import { Check, ChevronRight, Loader2 } from '@lucide/vue'
import agsurlogo from '@/assets/images/agsur.png'
import pesologo from '@/assets/images/pesologo.png'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
} from '@/components/ui/stepper'

const {
  roles,
  selectedRole,
  isSelected,
  selectRole,
  currentStep,
  currentStepKey,
  currentStepMeta,
  progressSteps,
  isLastStep,
  nextStep,
  prevStep,
  goToStep,
  handleBack,
  values,
  age,
  fullName,
  fullAddress,
  passwordStrength,
  maxBirthDate,
  minPasswordLength,
  isSubmitting,
  isCheckingEmail,
  submitError,
  handleSubmit,
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
  SEX_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  SUFFIX_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
} = useSignup()
</script>

<template>
  <!--
    Mobile: 44px touch targets (h-11), 16px select text (stops iOS zoom), tighter card padding,
    and a sticky action bar. overflow-clip (not hidden) so the sticky footer can stick to the viewport.
  -->
  <Card
    :class="[
      'w-full box-border overflow-clip gap-5 pt-5 pb-0 transition-[max-width] duration-300 ease-in-out sm:gap-6 sm:py-6',
      '**:data-[slot=native-select-wrapper]:w-full!',
      'max-sm:**:data-[slot=input]:h-11 max-sm:**:data-[slot=native-select]:h-11 max-sm:**:data-[slot=native-select]:text-base',
      currentStepKey === 'role' ? 'max-w-md' : 'max-w-2xl',
    ]"
  >
    <CardHeader class="px-4 sm:px-6">
      <!-- Brand (first screen only, keeps later steps compact on small screens) -->
      <div v-if="currentStepKey === 'role'" class="mb-3 flex items-center gap-3">
        <div class="flex -space-x-2">
          <Avatar class="size-11 ring-2 ring-card">
            <AvatarImage :src="agsurlogo" alt="Province of Agusan del Sur" />
            <AvatarFallback>AS</AvatarFallback>
          </Avatar>
          <Avatar class="size-11 ring-2 ring-card">
            <AvatarImage :src="pesologo" alt="PESO" />
            <AvatarFallback>PESO</AvatarFallback>
          </Avatar>
        </div>
        <div class="min-w-0 leading-tight">
          <p class="text-sm font-bold tracking-tight text-foreground">AGSURJOBS</p>
          <p class="text-xs text-muted-foreground">PESO Agusan del Sur</p>
        </div>
      </div>

      <CardTitle>
        <h1 class="text-xl font-bold tracking-tight sm:text-lg sm:font-semibold">{{ currentStepMeta.title }}</h1>
      </CardTitle>
      <CardDescription>{{ currentStepMeta.description }}</CardDescription>
      <CardAction v-if="currentStep > 0">
        <span class="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground whitespace-nowrap">
          {{ currentStep }} / {{ progressSteps.length }}
        </span>
      </CardAction>
    </CardHeader>

    <!-- ─── Progress ─── -->
    <div v-if="currentStep > 0" class="px-4 sm:px-6">
      <Stepper :model-value="currentStep" class="flex w-full items-start gap-1 sm:gap-2">
        <StepperItem
          v-for="s in progressSteps"
          :key="s.key"
          :step="s.step"
          class="relative flex flex-1 flex-col items-center gap-1.5"
        >
          <StepperSeparator
            v-if="s.step !== progressSteps.length"
            class="absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-3 h-0.5 rounded-full bg-border transition-colors duration-300 group-data-[state=completed]:bg-primary sm:left-[calc(50%+16px)] sm:right-[calc(-50%+16px)] sm:top-3.5"
          />
          <StepperIndicator
            class="z-10 size-6 border border-border bg-background text-[11px] font-semibold text-muted-foreground transition-colors duration-300 group-data-[state=active]:border-primary group-data-[state=active]:ring-4 group-data-[state=active]:ring-primary/15 group-data-[state=completed]:border-primary group-data-[state=completed]:bg-primary group-data-[state=completed]:text-primary-foreground sm:size-7 sm:text-xs"
          >
            <Check v-if="s.step < currentStep" class="size-3.5 shrink-0" />
            <span v-else>{{ s.step }}</span>
          </StepperIndicator>
          <StepperTitle
            class="hidden text-center text-xs font-medium text-muted-foreground sm:block group-data-[state=active]:text-foreground"
          >
            {{ s.title }}
          </StepperTitle>
        </StepperItem>
      </Stepper>
    </div>

    <CardContent class="px-4 sm:px-6">
      <!-- Re-keyed per step so each step slides in; motion is dropped for reduced-motion users -->
      <div
        :key="currentStepKey"
        class="animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
      >
        <!-- ─── Role selection ─── -->
        <div v-if="currentStepKey === 'role'" role="radiogroup" aria-label="Account type" class="space-y-3">
          <button
            v-for="role in roles"
            :key="role.id"
            type="button"
            role="radio"
            :aria-checked="isSelected(role.id)"
            :class="[
              'flex min-h-16 w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected(role.id) ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40',
            ]"
            @click="selectRole(role.id)"
          >
            <span
              :class="[
                'flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                isSelected(role.id) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              ]"
            >
              <component :is="role.icon" class="size-5 shrink-0" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-base font-semibold text-foreground sm:text-sm">{{ role.label }}</span>
              <span class="block text-sm text-muted-foreground">{{ role.description }}</span>
            </span>
            <span
              :class="[
                'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                isSelected(role.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
              ]"
            >
              <Check v-if="isSelected(role.id)" class="size-3 shrink-0" />
            </span>
          </button>
        </div>

        <form v-else class="space-y-6" @submit.prevent="isLastStep ? handleSubmit() : nextStep()">
          <!-- ─── Personal information (NSRP) ─── -->
          <template v-if="currentStepKey === 'personal'">
            <section class="space-y-4">
              <h2 class="text-sm font-semibold text-foreground">Full name</h2>
              <div class="grid grid-cols-2 gap-x-3 gap-y-4 sm:gap-x-4">
                <FormField v-slot="{ componentField }" name="surname">
                  <FormItem class="col-span-2 sm:col-span-1">
                    <FormLabel>Surname</FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" placeholder="Dela Cruz" autocomplete="family-name" autocapitalize="words" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="first_name">
                  <FormItem class="col-span-2 sm:col-span-1">
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" placeholder="Juan" autocomplete="given-name" autocapitalize="words" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="middle_name">
                  <FormItem>
                    <FormLabel>Middle name <span class="font-normal text-muted-foreground">(opt.)</span></FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" placeholder="Santos" autocomplete="additional-name" autocapitalize="words" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="suffix">
                  <FormItem>
                    <FormLabel>Suffix <span class="font-normal text-muted-foreground">(opt.)</span></FormLabel>
                    <FormControl>
                      <NativeSelect v-bind="componentField" class="w-full">
                        <NativeSelectOption value="">None</NativeSelectOption>
                        <NativeSelectOption v-for="opt in SUFFIX_OPTIONS" :key="opt" :value="opt">
                          {{ opt }}
                        </NativeSelectOption>
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>
            </section>

            <Separator />

            <section class="space-y-4">
              <h2 class="text-sm font-semibold text-foreground">Birth & background</h2>
              <div class="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 sm:gap-x-4">
                <FormField v-slot="{ componentField }" name="date_of_birth">
                  <FormItem>
                    <FormLabel>Date of birth</FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" type="date" :max="maxBirthDate" autocomplete="bday" class="block" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <div class="space-y-2">
                  <label for="signup-age" class="text-sm font-medium leading-none">Age</label>
                  <Input
                    id="signup-age"
                    :model-value="age ?? ''"
                    readonly
                    tabindex="-1"
                    placeholder="Auto"
                    class="bg-muted/50"
                  />
                </div>
                <FormField v-slot="{ componentField }" name="sex">
                  <FormItem>
                    <FormLabel>Sex</FormLabel>
                    <FormControl>
                      <NativeSelect v-bind="componentField" class="w-full">
                        <NativeSelectOption value="" disabled>Select</NativeSelectOption>
                        <NativeSelectOption v-for="opt in SEX_OPTIONS" :key="opt.value" :value="opt.value">
                          {{ opt.label }}
                        </NativeSelectOption>
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="civil_status">
                  <FormItem>
                    <FormLabel>Civil status</FormLabel>
                    <FormControl>
                      <NativeSelect v-bind="componentField" class="w-full">
                        <NativeSelectOption value="" disabled>Select</NativeSelectOption>
                        <NativeSelectOption v-for="opt in CIVIL_STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                          {{ opt.label }}
                        </NativeSelectOption>
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="religion">
                  <FormItem>
                    <FormLabel>Religion <span class="font-normal text-muted-foreground">(opt.)</span></FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" placeholder="Catholic" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="height_ft">
                  <FormItem>
                    <FormLabel>Height (ft) <span class="font-normal text-muted-foreground">(opt.)</span></FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" type="number" inputmode="decimal" step="0.1" min="3" max="8" placeholder="5.4" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="tin">
                  <FormItem class="col-span-2 sm:col-span-1">
                    <FormLabel>TIN <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" inputmode="numeric" placeholder="123-456-789-000" />
                    </FormControl>
                    <FormDescription>Tax Identification Number, if you have one.</FormDescription>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>
            </section>
          </template>

          <!-- ─── Address & contact ─── -->
          <template v-if="currentStepKey === 'address'">
            <section class="space-y-4">
              <h2 class="text-sm font-semibold text-foreground">Present address</h2>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField name="region">
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <NativeSelect
                        :model-value="selectedRegion?.code ?? ''"
                        class="w-full"
                        @update:model-value="onRegionChange"
                      >
                        <NativeSelectOption value="" disabled>
                          {{ psgcRegions.length === 0 ? 'Loading...' : 'Select region' }}
                        </NativeSelectOption>
                        <NativeSelectOption v-for="r in psgcRegions" :key="r.code" :value="r.code">
                          {{ r.name }}
                        </NativeSelectOption>
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField name="province">
                  <FormItem>
                    <FormLabel>Province</FormLabel>
                    <FormControl>
                      <NativeSelect
                        :model-value="selectedProvince?.code ?? ''"
                        :disabled="!selectedRegion"
                        class="w-full"
                        @update:model-value="onProvinceChange"
                      >
                        <NativeSelectOption value="" disabled>
                          {{ !selectedRegion ? 'Select a region first' : psgcProvinces.length === 0 ? 'Loading...' : 'Select province' }}
                        </NativeSelectOption>
                        <NativeSelectOption v-for="p in psgcProvinces" :key="p.code" :value="p.code">
                          {{ p.name }}
                        </NativeSelectOption>
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField name="municipality">
                  <FormItem>
                    <FormLabel>City / Municipality</FormLabel>
                    <FormControl>
                      <NativeSelect
                        :model-value="selectedCity?.code ?? ''"
                        :disabled="!selectedProvince"
                        class="w-full"
                        @update:model-value="onCityChange"
                      >
                        <NativeSelectOption value="" disabled>
                          {{ !selectedProvince ? 'Select a province first' : psgcCities.length === 0 ? 'Loading...' : 'Select city / municipality' }}
                        </NativeSelectOption>
                        <NativeSelectOption v-for="c in psgcCities" :key="c.code" :value="c.code">
                          {{ c.name }}
                        </NativeSelectOption>
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField name="barangay">
                  <FormItem>
                    <FormLabel>Barangay</FormLabel>
                    <FormControl>
                      <NativeSelect
                        :model-value="selectedBarangay?.code ?? ''"
                        :disabled="!selectedCity"
                        class="w-full"
                        @update:model-value="onBarangayChange"
                      >
                        <NativeSelectOption value="" disabled>
                          {{ !selectedCity ? 'Select a city first' : psgcBarangays.length === 0 ? 'Loading...' : 'Select barangay' }}
                        </NativeSelectOption>
                        <NativeSelectOption v-for="b in psgcBarangays" :key="b.code" :value="b.code">
                          {{ b.name }}
                        </NativeSelectOption>
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="street">
                  <FormItem>
                    <FormLabel>House no. / Street <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" placeholder="Purok 4, Maharlika Hwy" autocomplete="address-line1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="village">
                  <FormItem>
                    <FormLabel>Village / Sitio <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" autocomplete="address-line2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>
            </section>

            <Separator />

            <section class="space-y-4">
              <h2 class="text-sm font-semibold text-foreground">Contact</h2>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField v-slot="{ componentField }" name="contact_number">
                  <FormItem>
                    <FormLabel>Mobile number</FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" type="tel" inputmode="tel" placeholder="09123456789" autocomplete="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="email">
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        v-bind="componentField"
                        type="email"
                        inputmode="email"
                        placeholder="juan@example.com"
                        autocomplete="email"
                        autocapitalize="off"
                      />
                    </FormControl>
                    <FormDescription>You'll use this email to sign in.</FormDescription>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>
            </section>
          </template>

          <!-- ─── Account credentials ─── -->
          <template v-if="currentStepKey === 'account'">
            <div class="space-y-4">
              <FormField v-slot="{ componentField }" name="username">
                <FormItem class="sm:max-w-sm">
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      v-bind="componentField"
                      placeholder="juandelacruz"
                      autocomplete="username"
                      autocapitalize="off"
                      spellcheck="false"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField v-slot="{ componentField }" name="password">
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" type="password" autocomplete="new-password" />
                    </FormControl>
                    <FormDescription>At least {{ minPasswordLength }} characters. Mix letters, numbers, and symbols.</FormDescription>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="confirm_password">
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" type="password" autocomplete="new-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>
              <div v-if="values.password" class="space-y-1.5 sm:max-w-sm">
                <Progress :model-value="passwordStrength.score" class="h-1.5" />
                <p class="text-xs text-muted-foreground">Strength: {{ passwordStrength.label }}</p>
              </div>
            </div>
          </template>

          <!-- ─── Company details (company owner) ─── -->
          <template v-if="currentStepKey === 'company'">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField v-slot="{ componentField }" name="company_name">
                <FormItem>
                  <FormLabel>Company name</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" placeholder="Acme Corp" autocomplete="organization" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="company_email">
                <FormItem>
                  <FormLabel>Company email</FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" type="email" inputmode="email" autocapitalize="off" placeholder="hr@company.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="business_type">
                <FormItem>
                  <FormLabel>Business type</FormLabel>
                  <FormControl>
                    <NativeSelect v-bind="componentField" class="w-full">
                      <NativeSelectOption value="" disabled>Select business type</NativeSelectOption>
                      <NativeSelectOption v-for="opt in BUSINESS_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </NativeSelectOption>
                    </NativeSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="company_contact">
                <FormItem>
                  <FormLabel>Company contact <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" type="tel" inputmode="tel" placeholder="09XXXXXXXXX" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="industry">
                <FormItem>
                  <FormLabel>Industry <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" placeholder="Information Technology" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="website">
                <FormItem>
                  <FormLabel>Website <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" type="url" inputmode="url" autocapitalize="off" placeholder="https://company.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="registration_number">
                <FormItem>
                  <FormLabel>Registration number <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" placeholder="DTI / SEC number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="company_address">
                <FormItem>
                  <FormLabel>Company address <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" placeholder="Full address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField v-slot="{ componentField }" name="company_description">
                <FormItem class="sm:col-span-2">
                  <FormLabel>Company description <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" placeholder="Brief description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>
          </template>

          <!-- ─── Review ─── -->
          <template v-if="currentStepKey === 'review'">
            <div class="space-y-3">
              <!-- Personal -->
              <section class="rounded-xl border p-4">
                <div class="mb-3 flex items-center justify-between">
                  <h2 class="text-sm font-semibold text-foreground">Personal information</h2>
                  <Button type="button" variant="ghost" size="sm" class="-mr-2 h-8 text-primary" @click="goToStep('personal')">Edit</Button>
                </div>
                <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div class="col-span-2">
                    <dt class="text-xs text-muted-foreground">Full name</dt>
                    <dd class="text-sm font-medium">{{ fullName }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted-foreground">Date of birth</dt>
                    <dd class="text-sm font-medium">{{ values.date_of_birth }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted-foreground">Age</dt>
                    <dd class="text-sm font-medium">{{ age }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted-foreground">Sex</dt>
                    <dd class="text-sm font-medium">{{ values.sex }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted-foreground">Civil status</dt>
                    <dd class="text-sm font-medium">{{ values.civil_status }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted-foreground">Religion</dt>
                    <dd class="text-sm font-medium">{{ values.religion || '—' }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted-foreground">Height</dt>
                    <dd class="text-sm font-medium">{{ values.height_ft ? `${values.height_ft} ft` : '—' }}</dd>
                  </div>
                  <div class="col-span-2 sm:col-span-1">
                    <dt class="text-xs text-muted-foreground">TIN</dt>
                    <dd class="text-sm font-medium">{{ values.tin || '—' }}</dd>
                  </div>
                </dl>
              </section>

              <!-- Address & contact -->
              <section class="rounded-xl border p-4">
                <div class="mb-3 flex items-center justify-between">
                  <h2 class="text-sm font-semibold text-foreground">Address & contact</h2>
                  <Button type="button" variant="ghost" size="sm" class="-mr-2 h-8 text-primary" @click="goToStep('address')">Edit</Button>
                </div>
                <dl class="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-4">
                  <div class="sm:col-span-2">
                    <dt class="text-xs text-muted-foreground">Address</dt>
                    <dd class="text-sm font-medium">{{ fullAddress }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted-foreground">Mobile number</dt>
                    <dd class="text-sm font-medium">{{ values.contact_number }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted-foreground">Email</dt>
                    <dd class="text-sm font-medium break-all">{{ values.email }}</dd>
                  </div>
                </dl>
              </section>

              <!-- Account -->
              <section class="rounded-xl border p-4">
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="text-sm font-semibold text-foreground">Account</h2>
                    <p class="truncate text-sm text-muted-foreground">@{{ values.username }}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" class="-mr-2 h-8 text-primary" @click="goToStep('account')">Edit</Button>
                </div>
              </section>

              <!-- Company -->
              <section v-if="selectedRole === 'company_owner'" class="rounded-xl border p-4">
                <div class="mb-3 flex items-center justify-between">
                  <h2 class="text-sm font-semibold text-foreground">Company</h2>
                  <Button type="button" variant="ghost" size="sm" class="-mr-2 h-8 text-primary" @click="goToStep('company')">Edit</Button>
                </div>
                <dl class="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-4">
                  <div>
                    <dt class="text-xs text-muted-foreground">Company name</dt>
                    <dd class="text-sm font-medium">{{ values.company_name }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted-foreground">Company email</dt>
                    <dd class="text-sm font-medium break-all">{{ values.company_email }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted-foreground">Business type</dt>
                    <dd class="text-sm font-medium">{{ values.business_type }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs text-muted-foreground">Industry</dt>
                    <dd class="text-sm font-medium">{{ values.industry || '—' }}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <p v-if="selectedRole === 'applicant'" class="text-xs text-muted-foreground">
              After signing in, you'll be asked to complete the rest of your NSRP profile (employment status,
              education, and job preferences) before using the portal.
            </p>

            <p v-if="submitError" class="text-sm text-destructive" role="alert">{{ submitError }}</p>
          </template>
        </form>
      </div>
    </CardContent>

    <!-- ─── Footer ─── -->
    <CardFooter v-if="currentStepKey === 'role'" class="flex flex-col gap-3 px-4 pb-5 sm:px-6 sm:pb-0">
      <Button class="h-11 w-full text-base sm:h-9 sm:text-sm" :disabled="!selectedRole" @click="nextStep">
        Continue
      </Button>
      <p class="text-sm text-muted-foreground">
        Already have an account?
        <Button variant="link" class="h-auto p-0" @click="handleBack">Log in</Button>
      </p>
    </CardFooter>

    <!-- Sticky on mobile so the primary action is always within thumb reach -->
    <CardFooter
      v-else
      class="sticky bottom-0 z-20 grid grid-cols-[auto_1fr] gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:border-t max-sm:bg-card/95 max-sm:backdrop-blur max-sm:supports-backdrop-filter:bg-card/80 sm:static sm:flex sm:justify-between sm:px-6 sm:py-0"
    >
      <Button variant="outline" class="h-11 px-5 sm:h-9 sm:px-4" :disabled="isSubmitting" @click="prevStep">Back</Button>
      <Button v-if="!isLastStep" class="h-11 text-base sm:h-9 sm:text-sm" :disabled="isCheckingEmail" @click="nextStep">
        <Loader2 v-if="isCheckingEmail" class="size-4 shrink-0 animate-spin" />
        {{ isCheckingEmail ? 'Checking...' : 'Continue' }}
        <ChevronRight v-if="!isCheckingEmail" class="size-4 shrink-0" />
      </Button>
      <Button v-else class="h-11 text-base sm:h-9 sm:text-sm" :disabled="isSubmitting" @click="handleSubmit">
        <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
        {{ isSubmitting ? 'Creating account...' : 'Create account' }}
      </Button>
    </CardFooter>
  </Card>
</template>
