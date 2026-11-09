<script setup lang="ts">
// ApplicantNsrpDetails.vue — Employment status and special classifications (view / edit)
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Pencil, Save, X } from '@lucide/vue'
import { useApplicantNsrpDetailsContext } from '@/composables/peso/provincialPeso/applicantNsrpDetailsContext'

const {
  applicant,
  formatDateDisplay,
  editingSection,
  isSaving,
  startEdit,
  cancelEdit,
  saveSection,
  disabilityOptions,
  programOptions,
  todayMax,
  editEmploymentStatus,
  editEmploymentType,
  editUnemployedReason,
  editMonthsLookingForWork,
  editSelfEmployedType,
  editIs4psBeneficiary,
  editHouseholdId4ps,
  editHasDisability,
  editSelectedDisabilities,
  editDisabilityOthers,
  editIsOfw,
  editOfwCountry,
  editIsFormerOfw,
  editFormerOfwCountry,
  editFormerOfwReturnDate,
  editReferredPrograms,
  toggleEditDisability,
  toggleEditProgram,
} = useApplicantNsrpDetailsContext()
</script>

<template>
  <Card v-if="applicant" class="border shadow-xs">
    <CardHeader class="pb-3 border-b bg-muted/20">
      <div class="flex items-center justify-between">
        <CardTitle class="text-sm font-semibold flex items-center gap-2">
          <span>Employment Status &amp; Classifications</span>
          <Badge variant="outline" class="text-[10px] font-normal">Section I</Badge>
        </CardTitle>

        <Button
          v-if="editingSection !== 'doleStatus'"
          variant="ghost"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer print:hidden h-7 px-2 hover:bg-muted"
          @click="startEdit('doleStatus')"
        >
          <Pencil class="h-3.5 w-3.5 text-muted-foreground" />
          <span>Edit</span>
        </Button>
        <div v-else class="flex items-center gap-1.5 print:hidden">
          <Button
            variant="ghost"
            size="sm"
            class="gap-1 text-xs h-7 px-2 cursor-pointer"
            :disabled="isSaving"
            @click="cancelEdit"
          >
            <X class="h-3.5 w-3.5" />
            <span>Cancel</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            class="gap-1 text-xs h-7 px-2.5 cursor-pointer shadow-xs"
            :disabled="isSaving"
            @click="saveSection('doleStatus')"
          >
            <Loader2 v-if="isSaving" class="h-3.5 w-3.5 animate-spin" />
            <Save v-else class="h-3.5 w-3.5" />
            <span>Save</span>
          </Button>
        </div>
      </div>
    </CardHeader>

    <!-- VIEW MODE -->
    <CardContent v-if="editingSection !== 'doleStatus'" class="p-4 space-y-3 text-xs">
      <div class="p-3 rounded-lg border bg-card/60 space-y-1">
        <span class="text-muted-foreground block text-[11px]">Employment Status</span>
        <p class="font-semibold text-foreground text-sm">{{ applicant.employmentStatus }}</p>
        <p v-if="applicant.employmentType" class="text-[11px] text-muted-foreground">
          Type: <span class="font-medium text-foreground">{{ applicant.employmentType }}</span>
        </p>
      </div>

      <div v-if="applicant.unemployedReason" class="p-3 rounded-lg border bg-card/60 space-y-1">
        <span class="text-muted-foreground block text-[11px]">Unemployment Reason</span>
        <p class="font-medium text-foreground">{{ applicant.unemployedReason }}</p>
        <p v-if="applicant.monthsLookingForWork !== null" class="text-[11px] text-muted-foreground">
          Looking for Work: <span class="font-medium text-foreground font-mono">{{ applicant.monthsLookingForWork }} month(s)</span>
        </p>
      </div>

      <div v-if="applicant.selfEmployedType" class="p-3 rounded-lg border bg-card/60 space-y-1">
        <span class="text-muted-foreground block text-[11px]">Self-Employed Category</span>
        <p class="font-medium text-foreground">{{ applicant.selfEmployedType }}</p>
      </div>

      <!-- Beneficiary Badges Card -->
      <div class="p-3 rounded-lg border bg-card/60 space-y-2">
        <span class="text-muted-foreground block text-[11px] font-semibold">Special Classifications</span>
        <div class="space-y-2 pt-1">
          <!-- 4Ps -->
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">4Ps Beneficiary</span>
            <Badge :variant="applicant.is4psBeneficiary ? 'default' : 'outline'" class="text-[10px]">
              {{ applicant.is4psBeneficiary ? `Yes (ID: ${applicant.householdId4ps || 'N/A'})` : 'No' }}
            </Badge>
          </div>

          <!-- PWD -->
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Person with Disability</span>
            <Badge :variant="applicant.hasDisability ? 'default' : 'outline'" class="text-[10px]">
              {{ applicant.hasDisability ? 'Yes' : 'No' }}
            </Badge>
          </div>
          <div v-if="applicant.hasDisability && applicant.disabilities.length > 0" class="pl-2 text-[11px] text-muted-foreground">
            Disabilities: <span class="font-medium text-foreground">{{ applicant.disabilities.join(', ') }}</span>
          </div>

          <!-- OFW -->
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">OFW Status</span>
            <Badge :variant="applicant.isOfw || applicant.isFormerOfw ? 'default' : 'outline'" class="text-[10px]">
              {{ applicant.isOfw ? 'Current OFW' : applicant.isFormerOfw ? 'Former OFW' : 'No' }}
            </Badge>
          </div>
          <div v-if="applicant.isOfw" class="pl-2 text-[11px] text-muted-foreground">
            Country: <span class="font-medium text-foreground">{{ applicant.ofwCountry || 'N/A' }}</span>
          </div>
          <div v-if="applicant.isFormerOfw" class="pl-2 text-[11px] text-muted-foreground">
            Former Country: <span class="font-medium text-foreground">{{ applicant.formerOfwCountry || 'N/A' }}</span>
            <span v-if="applicant.formerOfwReturnDate"> (Returned: {{ formatDateDisplay(applicant.formerOfwReturnDate) }})</span>
          </div>
        </div>
      </div>

      <!-- Referred Programs -->
      <div class="p-3 rounded-lg border bg-card/60 space-y-1.5">
        <span class="text-muted-foreground block text-[11px] font-semibold">Referred Programs</span>
        <div v-if="applicant.referredPrograms.length > 0" class="flex flex-wrap gap-1">
          <Badge
            v-for="prog in applicant.referredPrograms"
            :key="prog"
            variant="secondary"
            class="text-[11px] font-medium"
          >
            {{ prog }}
          </Badge>
        </div>
        <p v-else class="text-[11px] text-muted-foreground italic">No specific program assigned</p>
      </div>
    </CardContent>

    <!-- EDIT MODE -->
    <CardContent v-else class="p-4 space-y-4 text-xs">
      <!-- Employment Status -->
      <div class="space-y-1">
        <span class="text-[11px] text-muted-foreground">Employment Status <span class="text-destructive">*</span></span>
        <select
          v-model="editEmploymentStatus"
          class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
        >
          <option value="Unemployed">Unemployed</option>
          <option value="Employed">Employed</option>
          <option value="Self-Employed">Self-Employed</option>
        </select>
      </div>

      <div v-if="editEmploymentStatus === 'Employed'" class="space-y-1">
        <span class="text-[11px] text-muted-foreground">Employment Type</span>
        <select
          v-model="editEmploymentType"
          class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
        >
          <option value="Wage employed">Wage Employed</option>
          <option value="Self-employed">Self-Employed</option>
        </select>
      </div>

      <div v-if="editEmploymentStatus === 'Unemployed'" class="p-3 rounded-xl border bg-muted/15 space-y-2.5">
        <span class="font-semibold text-foreground text-xs block">Unemployment Background</span>
        <div class="space-y-1">
          <span class="text-[11px] text-muted-foreground">Reason for Unemployment</span>
          <select
            v-model="editUnemployedReason"
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
          <Input v-model.number="editMonthsLookingForWork" type="number" min="0" placeholder="e.g. 6" class="h-9 text-xs" />
        </div>
      </div>

      <div v-if="editEmploymentStatus === 'Self-Employed' || (editEmploymentStatus === 'Employed' && editEmploymentType === 'Self-employed')" class="p-3 rounded-xl border bg-muted/15 space-y-1">
        <span class="text-[11px] text-muted-foreground">Self-Employment Classification</span>
        <Input v-model="editSelfEmployedType" placeholder="e.g. Sari-sari Store Vendor, Farmer" class="h-9 text-xs" />
      </div>

      <!-- 4Ps Beneficiary Section -->
      <div class="p-3 rounded-xl border space-y-2.5">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-semibold text-foreground text-xs block">4Ps Beneficiary</span>
            <span class="text-[10px] text-muted-foreground">Active 4Ps household member?</span>
          </div>
          <input
            type="checkbox"
            v-model="editIs4psBeneficiary"
            class="h-4 w-4 rounded accent-primary text-primary focus:ring-ring cursor-pointer"
          />
        </div>
        <div v-if="editIs4psBeneficiary" class="pt-2 border-t space-y-1">
          <span class="text-[11px] text-muted-foreground">Household ID No.</span>
          <Input v-model="editHouseholdId4ps" placeholder="e.g. 4PS-CARAGA-ADS-12345" class="h-8 text-xs font-mono" />
        </div>
      </div>

      <!-- Disability / PWD Section -->
      <div class="p-3 rounded-xl border space-y-2.5">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-semibold text-foreground text-xs block">Person with Disability (PWD)</span>
            <span class="text-[10px] text-muted-foreground">Physical or visual impairment?</span>
          </div>
          <input
            type="checkbox"
            v-model="editHasDisability"
            class="h-4 w-4 rounded accent-primary text-primary focus:ring-ring cursor-pointer"
          />
        </div>
        <div v-if="editHasDisability" class="pt-2 border-t space-y-2">
          <span class="text-[11px] text-muted-foreground block">Disability Types</span>
          <div class="grid grid-cols-2 gap-1.5">
            <label
              v-for="d in disabilityOptions"
              :key="d"
              class="flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer text-[10px]"
              :class="editSelectedDisabilities.includes(d) ? 'bg-primary/10 border-primary/40 font-medium' : ''"
            >
              <input
                type="checkbox"
                :checked="editSelectedDisabilities.includes(d)"
                class="h-3 w-3 rounded accent-primary text-primary"
                @change="toggleEditDisability(d)"
              />
              <span>{{ d }}</span>
            </label>
          </div>
          <div class="space-y-1 pt-1">
            <span class="text-[10px] text-muted-foreground">Other Disability</span>
            <Input v-model="editDisabilityOthers" placeholder="Specific condition" class="h-7 text-xs" />
          </div>
        </div>
      </div>

      <!-- OFW History Section -->
      <div class="p-3 rounded-xl border space-y-3">
        <span class="font-semibold text-foreground text-xs block">OFW Profile</span>
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground text-[11px]">Currently Active OFW?</span>
            <input type="checkbox" v-model="editIsOfw" class="h-4 w-4 rounded accent-primary text-primary cursor-pointer" />
          </div>
          <div v-if="editIsOfw">
            <Input v-model="editOfwCountry" placeholder="Country of deployment" class="h-8 text-xs mt-1" />
          </div>
        </div>

        <div class="space-y-1.5 pt-2 border-t">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground text-[11px]">Former / Returned OFW?</span>
            <input type="checkbox" v-model="editIsFormerOfw" class="h-4 w-4 rounded accent-primary text-primary cursor-pointer" />
          </div>
          <div v-if="editIsFormerOfw" class="space-y-1.5 pt-1">
            <Input v-model="editFormerOfwCountry" placeholder="Previous country" class="h-8 text-xs" />
            <Input v-model="editFormerOfwReturnDate" type="date" :max="todayMax" class="h-8 text-xs" />
          </div>
        </div>
      </div>

      <!-- Referred DOLE Programs -->
      <div class="p-3 rounded-xl border space-y-2">
        <span class="font-semibold text-foreground text-xs block">Referred DOLE Programs</span>
        <div class="flex flex-wrap gap-1.5">
          <label
            v-for="prog in programOptions"
            :key="prog"
            class="flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer text-xs"
            :class="editReferredPrograms.includes(prog) ? 'bg-primary/15 border-primary/40 font-bold text-primary' : ''"
          >
            <input
              type="checkbox"
              :checked="editReferredPrograms.includes(prog)"
              class="h-3.5 w-3.5 rounded accent-primary text-primary cursor-pointer"
              @change="toggleEditProgram(prog)"
            />
            <span>{{ prog }}</span>
          </label>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
