<script setup lang="ts">
// ApplicantNewEntry.vue — step 2: DOLE status and beneficiary classifications
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useApplicantNewEntryPageContext } from '@/composables/peso/provincialPeso/applicantNewEntryPageContext'

const {
  currentStep,
  todayMax,
  employmentStatus,
  employmentType,
  unemployedReason,
  monthsLookingForWork,
  selfEmployedType,
  is4psBeneficiary,
  householdId4ps,
  hasDisability,
  selectedDisabilities,
  disabilityOthers,
  isOfw,
  ofwCountry,
  isFormerOfw,
  formerOfwCountry,
  formerOfwReturnDate,
  toggleDisability,
  disabilityOptions,
} = useApplicantNewEntryPageContext()
</script>

<template>
  <Card v-show="currentStep === 2" class="border shadow-xs">
    <CardHeader class="pb-4 border-b bg-muted/20">
      <CardTitle class="text-base font-semibold flex items-center gap-2">
        <span>Step 2: DOLE Status & Beneficiary Classifications</span>
      </CardTitle>
      <CardDescription class="text-xs">
        Current employment disposition, 4Ps beneficiary, disability status, and OFW history.
      </CardDescription>
    </CardHeader>
    <CardContent class="p-5 space-y-5 text-xs">
      <!-- Employment Disposition -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Employment Status <span class="text-destructive">*</span></span>
          <select
            v-model="employmentStatus"
            class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
          >
            <option value="Unemployed">Unemployed</option>
            <option value="Employed">Employed</option>
            <option value="Self-Employed">Self-Employed</option>
          </select>
        </div>
        <div v-if="employmentStatus === 'Employed'" class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Employment Type <span class="text-destructive">*</span></span>
          <select
            v-model="employmentType"
            class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
          >
            <option value="Wage employed">Wage Employed</option>
            <option value="Self-employed">Self-Employed</option>
          </select>
        </div>
      </div>

      <!-- Conditional: Unemployed Details -->
      <div v-if="employmentStatus === 'Unemployed'" class="p-3.5 rounded-xl border bg-muted/15 space-y-3">
        <span class="font-semibold text-foreground text-xs block">Unemployment Background</span>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Reason for Unemployment</span>
            <select
              v-model="unemployedReason"
              class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            >
              <option value="Fresh Graduate">Fresh Graduate</option>
              <option value="Finished Contract">Finished Contract</option>
              <option value="Resigned">Resigned</option>
              <option value="Laid Off / Terminated">Laid Off / Terminated</option>
              <option value="Retired">Retired</option>
              <option value="Family Responsibilities">Family Responsibilities</option>
              <option value="Other">Other Reasons</option>
            </select>
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Months Looking for Work</span>
            <Input v-model.number="monthsLookingForWork" type="number" min="0" placeholder="e.g. 6" class="h-9 text-xs" />
          </div>
        </div>
      </div>

      <!-- Conditional: Self-Employed Details -->
      <div v-if="employmentStatus === 'Self-Employed' || (employmentStatus === 'Employed' && employmentType === 'Self-employed')" class="p-3.5 rounded-xl border bg-muted/15 space-y-2">
        <span class="font-semibold text-foreground text-xs block">Self-Employment Classification</span>
        <Input v-model="selfEmployedType" placeholder="e.g. Sari-sari Store Vendor, Farmer, Freelance Programmer" class="h-9 text-xs" />
      </div>

      <!-- 4Ps Beneficiary Section -->
      <div class="p-4 rounded-xl border space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-semibold text-foreground text-xs block">Pantawid Pamilyang Pilipino Program (4Ps)</span>
            <span class="text-[11px] text-muted-foreground">Is the applicant an active 4Ps beneficiary?</span>
          </div>
          <input
            type="checkbox"
            v-model="is4psBeneficiary"
            class="h-4 w-4 rounded accent-primary text-primary focus:ring-ring cursor-pointer"
          />
        </div>
        <div v-if="is4psBeneficiary" class="pt-2 border-t space-y-1">
          <span class="text-[11px] text-muted-foreground">Household ID No.</span>
          <Input v-model="householdId4ps" placeholder="e.g. 4PS-CARAGA-ADS-12345" class="h-9 text-xs font-mono max-w-sm" />
        </div>
      </div>

      <!-- Disability / PWD Section -->
      <div class="p-4 rounded-xl border space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-semibold text-foreground text-xs block">Person with Disability (PWD)</span>
            <span class="text-[11px] text-muted-foreground">Does the applicant possess any physical or visual impairment?</span>
          </div>
          <input
            type="checkbox"
            v-model="hasDisability"
            class="h-4 w-4 rounded accent-primary text-primary focus:ring-ring cursor-pointer"
          />
        </div>
        <div v-if="hasDisability" class="pt-2 border-t space-y-3">
          <span class="text-[11px] text-muted-foreground block">Disability Types (Select all that apply)</span>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <label
              v-for="d in disabilityOptions"
              :key="d"
              class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors hover:bg-muted/40"
              :class="selectedDisabilities.includes(d) ? 'bg-primary/10 border-primary/40 font-medium' : ''"
            >
              <input
                type="checkbox"
                :checked="selectedDisabilities.includes(d)"
                class="h-3.5 w-3.5 rounded accent-primary text-primary"
                @change="toggleDisability(d)"
              />
              <span class="text-[11px]">{{ d }}</span>
            </label>
          </div>
          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Other Disability Specifications</span>
            <Input v-model="disabilityOthers" placeholder="Additional details or specific condition" class="h-8 text-xs" />
          </div>
        </div>
      </div>

      <!-- OFW History Section -->
      <div class="p-4 rounded-xl border space-y-4">
        <span class="font-semibold text-foreground text-xs block">Overseas Filipino Worker (OFW) Profile</span>

        <!-- Current OFW -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Currently an Active OFW?</span>
            <input type="checkbox" v-model="isOfw" class="h-4 w-4 rounded accent-primary text-primary cursor-pointer" />
          </div>
          <div v-if="isOfw" class="pt-1">
            <span class="text-[11px] text-muted-foreground">Country of Deployment</span>
            <Input v-model="ofwCountry" placeholder="e.g. United Arab Emirates, Saudi Arabia" class="h-8 text-xs max-w-sm mt-0.5" />
          </div>
        </div>

        <!-- Former OFW -->
        <div class="space-y-2 pt-2 border-t">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Former / Returned OFW?</span>
            <input type="checkbox" v-model="isFormerOfw" class="h-4 w-4 rounded accent-primary text-primary cursor-pointer" />
          </div>
          <div v-if="isFormerOfw" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div class="space-y-1">
              <span class="text-[11px] text-muted-foreground">Previous Country</span>
              <Input v-model="formerOfwCountry" placeholder="e.g. Taiwan, Singapore" class="h-8 text-xs" />
            </div>
            <div class="space-y-1">
              <span class="text-[11px] text-muted-foreground">Date of Return to Philippines</span>
              <Input v-model="formerOfwReturnDate" type="date" :max="todayMax" class="h-8 text-xs" />
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
