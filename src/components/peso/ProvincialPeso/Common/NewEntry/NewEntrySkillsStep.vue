<script setup lang="ts">
// ApplicantNewEntry.vue — step 5: eligibilities, skills and languages
import ReferencePicker from '@/components/ReferencePicker.vue'
import SkillTextPicker from '@/components/SkillTextPicker.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileCheck, Languages, Plus, Trash2, X } from '@lucide/vue'
import { useApplicantNewEntryPageContext } from '@/composables/peso/provincialPeso/applicantNewEntryPageContext'

const {
  currentStep,
  eligibilityTitleOptions,
  isLoadingReferenceLists,
  formResetCount,
  todayMax,
  eligibilities,
  addEligibilityRow,
  removeEligibilityRow,
  otherSkills,
  newSkillTag,
  otherSkillsSpecified,
  addSkillTag,
  removeSkillTag,
  toggleSkillOption,
  skillOptions,
  languageProficiencies,
  newLanguageName,
  addLanguage,
  removeLanguage,
} = useApplicantNewEntryPageContext()
</script>

<template>
  <Card v-show="currentStep === 5" class="border shadow-xs">
    <CardHeader class="pb-4 border-b bg-muted/20">
      <CardTitle class="text-base font-semibold flex items-center gap-2">
        <span>Step 5: Eligibilities, Skills & Language Proficiencies</span>
      </CardTitle>
      <CardDescription class="text-xs">
        Civil Service / Professional Board eligibilities, acquired skills, and dialect fluency.
      </CardDescription>
    </CardHeader>
    <CardContent class="p-5 space-y-6 text-xs">
      <!-- Eligibilities Section -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-foreground text-xs flex items-center gap-1.5">
            <FileCheck class="h-3.5 w-3.5 text-primary" />
            Civil Service & Professional Board Eligibilities
          </span>
          <Button size="sm" variant="outline" class="h-7 text-xs gap-1 cursor-pointer" @click="addEligibilityRow">
            <Plus class="h-3 w-3" />
            <span>Add Eligibility</span>
          </Button>
        </div>

        <div v-if="eligibilities.length === 0" class="text-center py-4 text-muted-foreground italic border rounded-lg">
          No formal civil service or board eligibilities recorded.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(el, idx) in eligibilities"
            :key="idx"
            class="p-3.5 rounded-xl border bg-card/60 space-y-2.5"
          >
            <div class="flex items-center justify-between border-b pb-1.5">
              <span class="font-semibold text-primary text-xs">Eligibility #{{ idx + 1 }}</span>
              <Button
                variant="ghost"
                size="sm"
                class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                @click="removeEligibilityRow(idx)"
              >
                <Trash2 class="h-3 w-3" />
              </Button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Title / Exam Name</span>
                <ReferencePicker
                  :key="`eligibility-${formResetCount}-${idx}`"
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
      </div>

      <!-- Other Skills Acquired Without Certificate (NSRP Section VIII) -->
      <div class="space-y-2.5 pt-4 border-t">
        <span class="font-semibold text-foreground text-xs block">Other Skills Acquired Without Certificate</span>
        <span class="text-[11px] text-muted-foreground block -mt-1">Select all applicable skills from the NSRP standard list below.</span>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <label
            v-for="skill in skillOptions"
            :key="skill"
            class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors hover:bg-muted/40"
            :class="otherSkills.includes(skill) ? 'bg-primary/10 border-primary/40 font-medium' : ''"
          >
            <input
              type="checkbox"
              :checked="otherSkills.includes(skill)"
              class="h-3.5 w-3.5 rounded accent-primary text-primary"
              @change="toggleSkillOption(skill)"
            />
            <span class="text-[11px]">{{ skill }}</span>
          </label>
        </div>

        <!-- Additional custom skill tags -->
        <div class="pt-2 space-y-2">
          <span class="text-[11px] text-muted-foreground">Additional Skills (Not Listed Above)</span>
          <div class="flex items-center gap-2 max-w-sm">
            <Input
              v-model="newSkillTag"
              placeholder="e.g. Welding, Cooking, IT Support"
              class="h-8 text-xs"
              @keyup.enter="addSkillTag"
            />
            <Button size="sm" variant="outline" class="h-8 text-xs gap-1 cursor-pointer" @click="addSkillTag">
              <Plus class="h-3 w-3" />
              <span>Add</span>
            </Button>
          </div>

          <!-- Show only non-standard skill tags (custom ones) -->
          <div class="flex flex-wrap gap-1.5 pt-1">
            <Badge
              v-for="(skill, idx) in otherSkills.filter(s => s && !skillOptions.includes(s))"
              :key="idx"
              variant="secondary"
              class="text-[11px] gap-1 py-0.5"
            >
              <span>{{ skill }}</span>
              <button
                type="button"
                class="inline-flex items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer transition-colors focus:outline-none"
                @click.stop="removeSkillTag(otherSkills.indexOf(skill))"
              >
                <X class="h-3 w-3" />
              </button>
            </Badge>
          </div>
        </div>

        <div class="pt-2 space-y-1">
          <span class="text-[11px] text-muted-foreground">Others (Specify)</span>
          <SkillTextPicker v-model="otherSkillsSpecified" placeholder="Additional specialized talents, tools, or machinery operated" size="sm" />
        </div>
      </div>

      <!-- Language Proficiencies Table -->
      <div class="space-y-3 pt-4 border-t">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-foreground text-xs flex items-center gap-1.5">
            <Languages class="h-3.5 w-3.5 text-primary" />
            Language & Dialect Proficiencies
          </span>
          <div class="flex items-center gap-2">
            <Input
              v-model="newLanguageName"
              placeholder="Add dialect/language"
              class="h-7 text-xs w-40"
              @keyup.enter="addLanguage"
            />
            <Button size="sm" variant="outline" class="h-7 text-xs gap-1 cursor-pointer" @click="addLanguage">
              <Plus class="h-3 w-3" />
              <span>Add</span>
            </Button>
          </div>
        </div>

        <div class="overflow-x-auto border rounded-xl">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="text-[11px] font-semibold h-8 py-1">Language / Dialect</TableHead>
                <TableHead class="text-[11px] font-semibold h-8 py-1 text-center w-20">Read</TableHead>
                <TableHead class="text-[11px] font-semibold h-8 py-1 text-center w-20">Write</TableHead>
                <TableHead class="text-[11px] font-semibold h-8 py-1 text-center w-20">Speak</TableHead>
                <TableHead class="text-[11px] font-semibold h-8 py-1 text-center w-20">Understand</TableHead>
                <TableHead class="text-[11px] font-semibold h-8 py-1 text-right w-14">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(lang, idx) in languageProficiencies" :key="idx">
                <TableCell class="py-2 font-medium">{{ lang.language }}</TableCell>
                <TableCell class="py-2 text-center">
                  <input type="checkbox" v-model="lang.read" class="h-4 w-4 rounded accent-primary text-primary cursor-pointer" />
                </TableCell>
                <TableCell class="py-2 text-center">
                  <input type="checkbox" v-model="lang.write" class="h-4 w-4 rounded accent-primary text-primary cursor-pointer" />
                </TableCell>
                <TableCell class="py-2 text-center">
                  <input type="checkbox" v-model="lang.speak" class="h-4 w-4 rounded accent-primary text-primary cursor-pointer" />
                </TableCell>
                <TableCell class="py-2 text-center">
                  <input type="checkbox" v-model="lang.understand" class="h-4 w-4 rounded accent-primary text-primary cursor-pointer" />
                </TableCell>
                <TableCell class="py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                    @click="removeLanguage(idx)"
                  >
                    <Trash2 class="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
