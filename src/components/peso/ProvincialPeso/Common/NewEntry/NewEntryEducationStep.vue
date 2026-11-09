<script setup lang="ts">
// ApplicantNewEntry.vue — step 3: educational background
import ReferencePicker from '@/components/ReferencePicker.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from '@lucide/vue'
import { useApplicantNewEntryPageContext } from '@/composables/peso/provincialPeso/applicantNewEntryPageContext'

const {
  currentStep,
  getCourseOptions,
  isLoadingReferenceLists,
  formResetCount,
  currentlyInSchool,
  educationalBackground,
  addEducationRow,
  removeEducationRow,
} = useApplicantNewEntryPageContext()
</script>

<template>
  <Card v-show="currentStep === 3" class="border shadow-xs">
    <CardHeader class="pb-4 border-b bg-muted/20">
      <div class="flex items-center justify-between">
        <div>
          <CardTitle class="text-base font-semibold flex items-center gap-2">
            <span>Step 3: Educational Background</span>
          </CardTitle>
          <CardDescription class="text-xs">
            Academic records from primary, secondary, tertiary, and post-graduate levels.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" class="h-8 text-xs gap-1.5 cursor-pointer" @click="addEducationRow">
          <Plus class="h-3.5 w-3.5" />
          <span>Add Record</span>
        </Button>
      </div>
    </CardHeader>
    <CardContent class="p-5 space-y-5 text-xs">
      <!-- Currently in school checkbox -->
      <div class="flex items-center gap-2 p-3 rounded-lg border bg-muted/10">
        <input
          type="checkbox"
          v-model="currentlyInSchool"
          id="inSchool"
          class="h-4 w-4 rounded accent-primary text-primary cursor-pointer"
        />
        <label for="inSchool" class="font-medium text-foreground cursor-pointer">
          Applicant is currently enrolled in school / pursuing a degree
        </label>
      </div>

      <!-- Dynamic Education Rows -->
      <div class="space-y-4">
        <div
          v-for="(edu, idx) in educationalBackground"
          :key="idx"
          class="p-4 rounded-xl border bg-card/60 space-y-3 relative group"
        >
          <div class="flex items-center justify-between border-b pb-2">
            <span class="font-semibold text-primary text-xs">Record #{{ idx + 1 }}</span>
            <Button
              v-if="educationalBackground.length > 1"
              variant="ghost"
              size="sm"
              class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
              @click="removeEducationRow(idx)"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </Button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="space-y-1">
              <span class="text-[11px] text-muted-foreground">Education Level</span>
              <select
                v-model="edu.level"
                class="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Elementary">Elementary</option>
                <option value="Secondary / High School">Secondary / High School</option>
                <option value="Senior High School">Senior High School</option>
                <option value="Technical-Vocational">Technical-Vocational</option>
                <option value="College / Tertiary">College / Tertiary</option>
                <option value="Post-Graduate / Masteral">Post-Graduate / Masteral</option>
              </select>
            </div>
            <div class="space-y-1 sm:col-span-2">
              <span class="text-[11px] text-muted-foreground">School / University Name</span>
              <Input v-model="edu.school" placeholder="e.g. Agusan del Sur State College of Agriculture and Technology (ASSCAT)" class="h-8 text-xs" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div class="space-y-1 sm:col-span-2">
              <span class="text-[11px] text-muted-foreground">Course / Degree / Track</span>
              <ReferencePicker
                v-if="getCourseOptions(edu.level)"
                :key="`course-${formResetCount}-${idx}-${edu.level}`"
                v-model="edu.course"
                :options="getCourseOptions(edu.level) ?? []"
                :loading="isLoadingReferenceLists"
                placeholder="Select course / strand"
                search-placeholder="Search name or abbreviation (e.g. BSIT)..."
                specify-placeholder="Specify course / degree / track"
                class="h-8 text-xs"
              />
              <Input v-else v-model="edu.course" placeholder="Not applicable for this level" class="h-8 text-xs" />
            </div>
            <div class="space-y-1">
              <span class="text-[11px] text-muted-foreground">Year Graduated</span>
              <Input v-model="edu.year_graduated" placeholder="e.g. 2023" class="h-8 text-xs font-mono" />
            </div>
            <div class="space-y-1">
              <span class="text-[11px] text-muted-foreground">Awards / Honors</span>
              <Input v-model="edu.awards" placeholder="e.g. Cum Laude" class="h-8 text-xs" />
            </div>
          </div>

          <div class="space-y-1">
            <span class="text-[11px] text-muted-foreground">Undergraduate Level Reached (if non-graduate)</span>
            <Input v-model="edu.undergraduate_level_reached" placeholder="e.g. 3rd Year Completed" class="h-8 text-xs" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
