<script setup lang="ts">
// ApplicantNsrpDetails.vue — Section VII: work experience (view / edit)
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Briefcase, Building2, Loader2, MapPin, Pencil, Plus, Save, Trash2, X } from '@lucide/vue'
import { useApplicantNsrpDetailsContext } from '@/composables/peso/provincialPeso/applicantNsrpDetailsContext'

const {
  applicant,
  editingSection,
  isSaving,
  startEdit,
  cancelEdit,
  saveSection,
  editWorkExperiences,
  addEditWorkRow,
  removeEditWorkRow,
} = useApplicantNsrpDetailsContext()
</script>

<template>
  <Card v-if="applicant" class="border shadow-xs">
      <CardHeader class="pb-3 border-b bg-muted/20">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <CardTitle class="text-sm font-semibold flex items-center gap-2">
              <span>VII. Work Experience</span>
            </CardTitle>
            <Badge variant="outline" class="text-[10px] font-mono">
              {{ applicant.workExperiences.length }} Record(s)
            </Badge>
          </div>
          <Button
            v-if="editingSection !== 'workExperience'"
            variant="ghost"
            size="sm"
            class="gap-1.5 text-xs cursor-pointer print:hidden h-7 px-2 hover:bg-muted"
            @click="startEdit('workExperience')"
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
              @click="saveSection('workExperience')"
            >
              <Loader2 v-if="isSaving" class="h-3.5 w-3.5 animate-spin" />
              <Save v-else class="h-3.5 w-3.5" />
              <span>Save</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <!-- VIEW MODE -->
      <CardContent v-if="editingSection !== 'workExperience'" class="p-4 space-y-3">
        <div v-if="applicant.workExperiences.length > 0" class="space-y-2.5">
          <div
            v-for="(work, idx) in applicant.workExperiences"
            :key="idx"
            class="p-3.5 rounded-lg border bg-card/60 space-y-1.5 transition-colors hover:bg-muted/20"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span class="font-bold text-xs sm:text-sm text-foreground">
                {{ work.position || work.job_title || 'Position Not Specified' }}
              </span>
              <Badge variant="outline" class="text-[11px] font-mono w-fit bg-muted">
                {{ work.inclusive_dates || 'Dates N/A' }}
              </Badge>
            </div>
            <p class="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 class="h-3.5 w-3.5 shrink-0" />
              <span class="font-medium text-foreground">{{ work.company_name }}</span>
            </p>
            <p v-if="work.address" class="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin class="h-3.5 w-3.5 shrink-0" />
              <span>{{ work.address }}</span>
            </p>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
              <span v-if="work.number_of_months">
                Duration: <span class="font-mono text-foreground font-medium">{{ work.number_of_months }} month(s)</span>
              </span>
              <span v-if="work.monthly_salary">
                Monthly Salary: <span class="font-mono text-foreground font-medium">₱{{ Number(work.monthly_salary).toLocaleString() }}</span>
              </span>
              <span v-if="work.status_of_appointment">
                Appointment: <span class="text-foreground font-medium">{{ work.status_of_appointment }}</span>
              </span>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-6 text-xs text-muted-foreground italic border rounded-lg bg-muted/10">
          No previous work experiences recorded.
        </div>
      </CardContent>
      <!-- EDIT MODE -->
      <CardContent v-else class="p-4 space-y-4 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-foreground text-xs flex items-center gap-1.5">
            <Briefcase class="h-3.5 w-3.5 text-primary" />
            Previous Work History
          </span>
          <Button size="sm" variant="outline" class="h-7 text-xs gap-1 cursor-pointer" @click="addEditWorkRow">
            <Plus class="h-3 w-3" />
            <span>Add Work Experience</span>
          </Button>
        </div>
        <div v-if="editWorkExperiences.length === 0" class="text-center py-4 text-muted-foreground italic border rounded-lg">
          No previous work experience added. Click "Add Work Experience" to add one.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="(work, idx) in editWorkExperiences"
            :key="idx"
            class="p-3.5 rounded-xl border bg-card/60 space-y-2.5"
          >
            <div class="flex items-center justify-between border-b pb-1.5">
              <span class="font-semibold text-primary text-xs">Experience #{{ idx + 1 }}</span>
              <Button
                variant="ghost"
                size="sm"
                class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                @click="removeEditWorkRow(idx)"
              >
                <Trash2 class="h-3 w-3" />
              </Button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Company / Employer Name</span>
                <Input v-model="work.company_name" placeholder="e.g. San Francisco Agro-Industrial Corp." class="h-8 text-xs" />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Address (City / Municipality)</span>
                <Input v-model="work.address" placeholder="e.g. Prosperidad, Agusan del Sur" class="h-8 text-xs" />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Job Position / Title</span>
                <Input v-model="work.position" placeholder="e.g. Administrative Officer" class="h-8 text-xs" />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Inclusive Dates</span>
                <Input v-model="work.inclusive_dates" placeholder="e.g. Jan 2022 - Dec 2023" class="h-8 text-xs" />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Number of Months</span>
                <Input v-model="work.number_of_months" type="number" min="0" placeholder="e.g. 24" class="h-8 text-xs font-mono" />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Monthly Salary (PHP)</span>
                <Input v-model="work.monthly_salary" type="number" placeholder="e.g. 18000" class="h-8 text-xs font-mono" />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Status of Appointment</span>
                <select
                  v-model="work.status_of_appointment"
                  class="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Permanent">Permanent</option>
                  <option value="Contractual">Contractual</option>
                  <option value="Casual">Casual</option>
                  <option value="Job Order">Job Order</option>
                  <option value="Part-Time">Part-Time</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
</template>
