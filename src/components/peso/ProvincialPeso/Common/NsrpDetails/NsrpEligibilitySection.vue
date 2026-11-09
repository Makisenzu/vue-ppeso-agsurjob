<script setup lang="ts">
// ApplicantNsrpDetails.vue — Section VI: eligibility / professional license (view / edit)
import ReferencePicker from '@/components/ReferencePicker.vue'
import SupportingDocumentLink from '@/components/SupportingDocumentLink.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FileCheck, Loader2, Pencil, Plus, Save, Trash2, X } from '@lucide/vue'
import { useApplicantNsrpDetailsContext } from '@/composables/peso/provincialPeso/applicantNsrpDetailsContext'

const {
  applicant,
  formatDateDisplay,
  editingSection,
  isSaving,
  startEdit,
  cancelEdit,
  saveSection,
  eligibilityTitleOptions,
  isLoadingReferenceLists,
  todayMax,
  editEligibilities,
  addEditEligibilityRow,
  removeEditEligibilityRow,
} = useApplicantNsrpDetailsContext()
</script>

<template>
  <Card v-if="applicant" class="border shadow-xs">
      <CardHeader class="pb-3 border-b bg-muted/20">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <CardTitle class="text-sm font-semibold flex items-center gap-2">
              <span>VI. Eligibility</span>
            </CardTitle>
            <Badge variant="outline" class="text-[10px] font-mono">
              {{ applicant.eligibilities.length }} Eligibility
            </Badge>
          </div>
          <Button
            v-if="editingSection !== 'eligibility'"
            variant="ghost"
            size="sm"
            class="gap-1.5 text-xs cursor-pointer print:hidden h-7 px-2 hover:bg-muted"
            @click="startEdit('eligibility')"
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
              @click="saveSection('eligibility')"
            >
              <Loader2 v-if="isSaving" class="h-3.5 w-3.5 animate-spin" />
              <Save v-else class="h-3.5 w-3.5" />
              <span>Save</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <!-- VIEW MODE -->
      <CardContent v-if="editingSection !== 'eligibility'" class="p-4 space-y-3">
        <div v-if="applicant.eligibilities.length > 0" class="space-y-2.5">
          <div
            v-for="(el, idx) in applicant.eligibilities"
            :key="idx"
            class="p-3.5 rounded-lg border bg-card/60 space-y-1.5"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span class="font-bold text-xs sm:text-sm text-foreground">
                {{ el.eligibility_title }}
              </span>
              <Badge variant="outline" class="text-[10px] font-mono bg-primary/10 text-primary border-primary/20 w-fit">
                Rating: {{ el.rating }}
              </Badge>
            </div>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span v-if="el.date_of_examination">
                Exam Date: <span class="text-foreground font-medium">{{ formatDateDisplay(el.date_of_examination) }}</span>
              </span>
              <span v-if="el.place_of_examination">
                Exam Place: <span class="text-foreground font-medium">{{ el.place_of_examination }}</span>
              </span>
            </div>
            <SupportingDocumentLink
              v-if="el.document_path"
              :path="el.document_path"
              :label="el.document_name || 'View license'"
            />
            <p v-else class="text-xs text-muted-foreground italic">No supporting document attached.</p>
          </div>
        </div>
        <div v-else class="text-center py-6 text-xs text-muted-foreground italic border rounded-lg bg-muted/10">
          No civil service or professional board eligibilities recorded.
        </div>
      </CardContent>
      <!-- EDIT MODE -->
      <CardContent v-else class="p-4 space-y-4 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-foreground text-xs flex items-center gap-1.5">
            <FileCheck class="h-3.5 w-3.5 text-primary" />
            Civil Service & Professional Board Eligibilities
          </span>
          <Button size="sm" variant="outline" class="h-7 text-xs gap-1 cursor-pointer" @click="addEditEligibilityRow">
            <Plus class="h-3 w-3" />
            <span>Add Eligibility</span>
          </Button>
        </div>
        <div v-if="editEligibilities.length === 0" class="text-center py-4 text-muted-foreground italic border rounded-lg">
          No civil service or board eligibilities recorded. Click "Add Eligibility" to add one.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="(el, idx) in editEligibilities"
            :key="idx"
            class="p-3.5 rounded-xl border bg-card/60 space-y-2.5"
          >
            <div class="flex items-center justify-between border-b pb-1.5">
              <span class="font-semibold text-primary text-xs">Eligibility #{{ idx + 1 }}</span>
              <Button
                variant="ghost"
                size="sm"
                class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                @click="removeEditEligibilityRow(idx)"
              >
                <Trash2 class="h-3 w-3" />
              </Button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Title / Exam Name</span>
                <ReferencePicker
                  v-model="el.eligibility_title"
                  :options="eligibilityTitleOptions"
                  :loading="isLoadingReferenceLists"
                  placeholder="Select eligibility / license"
                  search-placeholder="Search name or abbreviation (e.g. CSE-PRO, LPT)..."
                  specify-placeholder="Specify eligibility / license"
                  class="h-8 text-xs"
                />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Rating Obtained (%)</span>
                <Input v-model="el.rating" placeholder="e.g. 84.50" class="h-8 text-xs font-mono" />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Date of Examination</span>
                <Input v-model="el.date_of_examination" type="date" :max="todayMax" class="h-8 text-xs" />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Place of Examination</span>
                <Input v-model="el.place_of_examination" placeholder="e.g. Butuan City" class="h-8 text-xs" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
</template>
