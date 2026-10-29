<script setup lang="ts">
import { Check, ChevronRight, Loader2 } from '@lucide/vue'
import { useEmployerCompletion } from '@/composables/employer/useEmployerCompletion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper'
import NsrpForm2Fields from '@/components/NsrpForm2Fields.vue'
import SearchSelect from '@/components/SearchSelect.vue'

// Kept out of the template: the Vue (Official) editor extension (3.3.13) loses slot props like
// componentField on a tag whose attributes contain "//"
const WEBSITE_PLACEHOLDER = 'https://company.com'

const {
  steps,
  currentStep,
  currentStepKey,
  currentStepMeta,
  isLastStep,
  nextStep,
  prevStep,
  goToStep,
  values,
  establishmentAddress,
  establishmentPhones,
  employerType,
  displayName,
  establishmentMatches,
  establishmentMatchOptions,
  claimedEstablishment,
  selectEstablishmentMatch,
  isSubmitting,
  isCheckingEstablishment,
  errorMessage,
  handleSubmit,
  BUSINESS_TYPE_OPTIONS,
} = useEmployerCompletion()
</script>

<template>
  <!--
    Mobile: 44px inputs, 16px select text (no iOS zoom), and a fixed action bar so the
    primary action stays in reach on long steps.
  -->
  <div
    class="mx-auto w-full max-w-3xl space-y-5 sm:space-y-6 **:data-[slot=native-select-wrapper]:w-full!
      max-sm:**:data-[slot=input]:h-11 max-sm:**:data-[slot=native-select]:h-11 max-sm:**:data-[slot=native-select]:text-base"
  >
    <header class="space-y-1">
      <p class="text-xs font-medium text-muted-foreground">Step {{ currentStep + 1 }} of {{ steps.length }}</p>
      <h1 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Register your establishment</h1>
      <p class="text-sm text-muted-foreground">
        Welcome, {{ displayName }}. Submit your NSRP Form 2 for PESO review to start posting jobs.
      </p>
    </header>

    <!-- ─── Progress ─── -->
    <Stepper :model-value="currentStep + 1" class="flex w-full items-start gap-1 sm:gap-2">
      <StepperItem
        v-for="(step, index) in steps"
        :key="step.key"
        :step="index + 1"
        :disabled="index > currentStep"
        class="relative flex flex-1 flex-col items-center"
      >
        <StepperSeparator
          v-if="index !== steps.length - 1"
          class="absolute left-[calc(50%+14px)] right-[calc(-50%+14px)] top-4 h-0.5 rounded-full bg-border transition-colors duration-300 group-data-[state=completed]:bg-primary sm:left-[calc(50%+18px)] sm:right-[calc(-50%+18px)]"
        />
        <StepperTrigger class="z-10 gap-1.5" @click="goToStep(step.key)">
          <StepperIndicator
            class="size-7 border border-border bg-background text-xs font-semibold text-muted-foreground transition-colors duration-300 group-data-[state=active]:border-primary group-data-[state=active]:ring-4 group-data-[state=active]:ring-primary/15 group-data-[state=completed]:border-primary group-data-[state=completed]:bg-primary group-data-[state=completed]:text-primary-foreground sm:size-8"
          >
            <Check v-if="index < currentStep" class="size-3.5 shrink-0" />
            <span v-else>{{ index + 1 }}</span>
          </StepperIndicator>
          <StepperTitle class="hidden text-xs font-medium text-muted-foreground sm:block group-data-[state=active]:text-foreground">
            {{ step.title }}
          </StepperTitle>
        </StepperTrigger>
      </StepperItem>
    </Stepper>

    <div class="sm:hidden">
      <h2 class="text-base font-semibold text-foreground">{{ currentStepMeta.title }}</h2>
      <p class="text-sm text-muted-foreground">{{ currentStepMeta.description }}</p>
    </div>

    <form class="pb-24 sm:pb-0" @submit.prevent="isLastStep ? handleSubmit() : nextStep()">
      <div
        :key="currentStepKey"
        class="space-y-6 rounded-xl border bg-card p-4 animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none sm:p-6"
      >
        <!-- ─── Establishment (employer half of Form 2) ─── -->
        <template v-if="currentStepKey === 'establishment'">
          <!-- PESO already encoded this establishment (job fair, LRA / SRA): link it instead of a duplicate -->
          <section
            v-if="establishmentMatches.length"
            class="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4"
            aria-labelledby="complete-establishment-match"
          >
            <div class="space-y-1">
              <h2 id="complete-establishment-match" class="text-sm font-semibold text-foreground">
                PESO already has a record of this establishment
              </h2>
              <p class="text-sm text-muted-foreground">
                Link it to keep its job fair and recruitment history. PESO will verify the link.
              </p>
            </div>
            <div role="radiogroup" aria-labelledby="complete-establishment-match" class="grid gap-2">
              <label
                v-for="option in establishmentMatchOptions"
                :key="option.id || 'new'"
                class="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 has-checked:border-primary"
              >
                <input
                  type="radio"
                  name="claim_establishment_id"
                  :value="option.id"
                  :checked="values.claim_establishment_id === option.id"
                  class="mt-0.5 size-4 shrink-0 accent-primary"
                  @change="selectEstablishmentMatch(option.id)"
                />
                <span class="min-w-0">
                  <span class="block text-sm font-medium text-foreground">{{ option.title }}</span>
                  <span v-if="option.detail" class="block text-xs text-muted-foreground">{{ option.detail }}</span>
                </span>
              </label>
            </div>
          </section>

          <NsrpForm2Fields name-prefix="establishment." :sections="['employer']" />

          <Separator />

          <section class="space-y-4" aria-labelledby="complete-company-extra">
            <h2 id="complete-company-extra" class="text-sm font-medium text-muted-foreground">Company Profile</h2>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField v-slot="{ componentField }" name="business_type">
                <FormItem>
                  <FormLabel>Business type</FormLabel>
                  <FormControl>
                    <SearchSelect
                      v-bind="componentField"
                      class="w-full"
                      :options="BUSINESS_TYPE_OPTIONS"
                      placeholder="Select business type"
                    />
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
          </section>
        </template>

        <!-- ─── Contact & address (other half of Form 2) ─── -->
        <template v-else-if="currentStepKey === 'contact'">
          <NsrpForm2Fields name-prefix="establishment." :sections="['contact', 'address']" />

          <FormField v-slot="{ componentField }" name="website">
            <FormItem class="sm:max-w-sm">
              <FormLabel>Website <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
              <FormControl>
                <Input v-bind="componentField" type="url" inputmode="url" autocapitalize="off" :placeholder="WEBSITE_PLACEHOLDER" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </template>

        <!-- ─── Review ─── -->
        <template v-else>
          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-foreground">Establishment</h2>
              <Button type="button" variant="ghost" size="sm" class="-mr-2 h-8 text-primary" @click="goToStep('establishment')">Edit</Button>
            </div>
            <dl class="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-4">
              <div>
                <dt class="text-xs text-muted-foreground">Business name</dt>
                <dd class="text-sm font-medium">{{ values.establishment.businessName }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">TIN</dt>
                <dd class="text-sm font-medium">{{ values.establishment.tin }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">Employer</dt>
                <dd class="text-sm font-medium">{{ employerType }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">Business type</dt>
                <dd class="text-sm font-medium">{{ values.business_type }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">Line of industry</dt>
                <dd class="text-sm font-medium">{{ values.establishment.industryLine }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">Owner / President</dt>
                <dd class="text-sm font-medium">{{ values.establishment.ownerPresidentName }}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs text-muted-foreground">PESO record</dt>
                <dd class="text-sm font-medium">
                  {{ claimedEstablishment ? `Links the existing record of ${claimedEstablishment.business_name}` : 'New NSRP Form 2' }}
                </dd>
              </div>
            </dl>
          </section>

          <Separator />

          <section class="space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-foreground">Contact & address</h2>
              <Button type="button" variant="ghost" size="sm" class="-mr-2 h-8 text-primary" @click="goToStep('contact')">Edit</Button>
            </div>
            <dl class="grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-x-4">
              <div>
                <dt class="text-xs text-muted-foreground">Contact person</dt>
                <dd class="text-sm font-medium">
                  {{ values.establishment.contactPersonName }}
                  <span v-if="values.establishment.contactPersonPosition" class="text-muted-foreground">
                    · {{ values.establishment.contactPersonPosition }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">Email</dt>
                <dd class="text-sm font-medium break-all">{{ values.establishment.emailAddress }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">Mobile / Telephone</dt>
                <dd class="text-sm font-medium">{{ establishmentPhones }}</dd>
              </div>
              <div>
                <dt class="text-xs text-muted-foreground">Office</dt>
                <dd class="text-sm font-medium">{{ values.establishment.isMainOffice ? 'Main office' : 'Branch office' }}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs text-muted-foreground">Address</dt>
                <dd class="text-sm font-medium">{{ establishmentAddress || '—' }}</dd>
              </div>
            </dl>
          </section>

          <p v-if="errorMessage" class="text-sm text-destructive" role="alert">{{ errorMessage }}</p>
        </template>
      </div>

      <!-- ─── Actions (fixed on mobile, inline on desktop) ─── -->
      <div
        class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[auto_1fr] gap-3 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-backdrop-filter:bg-background/80
          sm:static sm:z-auto sm:mt-6 sm:flex sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
      >
        <Button
          type="button"
          variant="outline"
          class="h-11 px-5 sm:h-9 sm:px-4"
          :class="currentStep === 0 && 'invisible'"
          :disabled="isSubmitting"
          @click="prevStep"
        >
          Back
        </Button>
        <Button
          v-if="!isLastStep"
          type="submit"
          class="h-11 text-base sm:h-9 sm:text-sm"
          :disabled="isCheckingEstablishment"
        >
          <Loader2 v-if="isCheckingEstablishment" class="size-4 shrink-0 animate-spin" />
          {{ isCheckingEstablishment ? 'Checking...' : 'Continue' }}
          <ChevronRight v-if="!isCheckingEstablishment" class="size-4 shrink-0" />
        </Button>
        <Button v-else type="submit" class="h-11 text-base sm:h-9 sm:text-sm" :disabled="isSubmitting">
          <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
          {{ isSubmitting ? 'Submitting...' : 'Submit to PESO' }}
        </Button>
      </div>
    </form>
  </div>
</template>
