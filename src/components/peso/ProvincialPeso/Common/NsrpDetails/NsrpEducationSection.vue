<script setup lang="ts">
// ApplicantNsrpDetails.vue — Section IV: educational background (view / edit)
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Award, BookOpen, Building2, Loader2, Pencil, Plus, Save, Trash2, X } from '@lucide/vue'
import { useApplicantNsrpDetailsContext } from '@/composables/peso/provincialPeso/applicantNsrpDetailsContext'

const {
  applicant,
  editingSection,
  isSaving,
  startEdit,
  cancelEdit,
  saveSection,
  editCurrentlyInSchool,
  editEducationalBackground,
  addEditEducationRow,
  removeEditEducationRow,
} = useApplicantNsrpDetailsContext()
</script>

<template>
  <Card v-if="applicant" class="border shadow-xs">
      <CardHeader class="pb-3 border-b bg-muted/20">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <CardTitle class="text-sm font-semibold flex items-center gap-2">
              <span>IV. Educational Background</span>
            </CardTitle>
            <Badge variant="secondary" class="text-[10px] font-normal">
              Highest: {{ applicant.highestEducationalAttainment }}
            </Badge>
          </div>
          <Button
            v-if="editingSection !== 'education'"
            variant="ghost"
            size="sm"
            class="gap-1.5 text-xs cursor-pointer print:hidden h-7 px-2 hover:bg-muted"
            @click="startEdit('education')"
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
              @click="saveSection('education')"
            >
              <Loader2 v-if="isSaving" class="h-3.5 w-3.5 animate-spin" />
              <Save v-else class="h-3.5 w-3.5" />
              <span>Save</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <!-- VIEW MODE -->
      <CardContent v-if="editingSection !== 'education'" class="p-4 space-y-3">
        <div v-if="applicant.currentlyInSchool" class="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2 text-xs text-primary font-medium">
          <BookOpen class="h-4 w-4" />
          <span>Applicant is currently enrolled in school.</span>
        </div>
        <div v-if="applicant.educationalBackground.length > 0" class="space-y-2.5">
          <div
            v-for="(edu, idx) in applicant.educationalBackground"
            :key="idx"
            class="p-3.5 rounded-lg border bg-card/60 space-y-1.5 transition-colors hover:bg-muted/20"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div class="flex items-center gap-2">
                <Badge variant="outline" class="text-[10px] uppercase bg-muted">
                  {{ edu.level || 'Education' }}
                </Badge>
                <span class="font-bold text-xs sm:text-sm text-foreground">
                  {{ edu.course && edu.course !== 'N/A' ? edu.course : edu.level }}
                </span>
              </div>
              <Badge variant="secondary" class="text-[11px] font-mono w-fit">
                Year Graduated: {{ edu.year_graduated }}
              </Badge>
            </div>
            <p class="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 class="h-3.5 w-3.5 shrink-0" />
              <span>{{ edu.school }}</span>
            </p>
            <div v-if="edu.awards" class="flex items-center gap-1.5 text-xs text-primary pt-1">
              <Award class="h-3.5 w-3.5 shrink-0" />
              <span>Honors / Awards: {{ edu.awards }}</span>
            </div>
            <div v-if="edu.undergraduate_level_reached" class="text-[11px] text-muted-foreground">
              Undergraduate Level Reached: <span class="font-medium text-foreground">{{ edu.undergraduate_level_reached }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-6 text-xs text-muted-foreground italic border rounded-lg bg-muted/10">
          No educational background records found for this applicant.
        </div>
      </CardContent>
      <!-- EDIT MODE -->
      <CardContent v-else class="p-4 space-y-4 text-xs">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/10">
            <input
              type="checkbox"
              v-model="editCurrentlyInSchool"
              id="editInSchool"
              class="h-4 w-4 rounded accent-primary text-primary cursor-pointer"
            />
            <label for="editInSchool" class="font-medium text-foreground cursor-pointer">
              Applicant is currently enrolled in school / pursuing a degree
            </label>
          </div>
          <Button size="sm" variant="outline" class="h-8 text-xs gap-1.5 cursor-pointer" @click="addEditEducationRow">
            <Plus class="h-3.5 w-3.5" />
            <span>Add Record</span>
          </Button>
        </div>
        <div class="space-y-3">
          <div
            v-for="(edu, idx) in editEducationalBackground"
            :key="idx"
            class="p-3.5 rounded-xl border bg-card/60 space-y-2.5 relative group"
          >
            <div class="flex items-center justify-between border-b pb-1.5">
              <span class="font-semibold text-primary text-xs">Record #{{ idx + 1 }}</span>
              <Button
                v-if="editEducationalBackground.length > 1"
                variant="ghost"
                size="sm"
                class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                @click="removeEditEducationRow(idx)"
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
                <Input v-model="edu.school" placeholder="e.g. ASSCAT, Father Saturnino Urios University" class="h-8 text-xs" />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div class="space-y-1 sm:col-span-2">
                <span class="text-[11px] text-muted-foreground">Course / Degree / Track</span>
                <Input v-model="edu.course" placeholder="e.g. BS in Information Technology" class="h-8 text-xs" />
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
