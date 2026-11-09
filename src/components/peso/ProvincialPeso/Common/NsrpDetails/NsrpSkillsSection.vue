<script setup lang="ts">
// ApplicantNsrpDetails.vue — Section VIII: other skills acquired (view / edit)
import SkillTextPicker from '@/components/SkillTextPicker.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Pencil, Plus, Save, X } from '@lucide/vue'
import { useApplicantNsrpDetailsContext } from '@/composables/peso/provincialPeso/applicantNsrpDetailsContext'

const {
  applicant,
  editingSection,
  isSaving,
  startEdit,
  cancelEdit,
  saveSection,
  skillOptions,
  editOtherSkills,
  editNewSkillTag,
  editOtherSkillsSpecified,
  toggleEditSkillOption,
  addEditSkillTag,
  removeEditSkillTag,
} = useApplicantNsrpDetailsContext()
</script>

<template>
  <Card v-if="applicant" class="border shadow-xs">
    <CardHeader class="pb-3 border-b bg-muted/20">
      <div class="flex items-center justify-between">
        <CardTitle class="text-sm font-semibold flex items-center gap-2">
          <span>VIII. Other Skills Acquired</span>
        </CardTitle>

        <Button
          v-if="editingSection !== 'skills'"
          variant="ghost"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer print:hidden h-7 px-2 hover:bg-muted"
          @click="startEdit('skills')"
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
            @click="saveSection('skills')"
          >
            <Loader2 v-if="isSaving" class="h-3.5 w-3.5 animate-spin" />
            <Save v-else class="h-3.5 w-3.5" />
            <span>Save</span>
          </Button>
        </div>
      </div>
    </CardHeader>

    <!-- VIEW MODE -->
    <CardContent v-if="editingSection !== 'skills'" class="p-4 space-y-4 text-xs">
      <div class="space-y-1.5">
        <span class="text-muted-foreground block text-[11px] font-semibold">Skills Acquired Without Certificate</span>
        <div v-if="applicant.otherSkills.length > 0" class="flex flex-wrap gap-1.5">
          <Badge
            v-for="skill in applicant.otherSkills"
            :key="skill"
            variant="outline"
            class="text-[11px] bg-muted/40 font-normal"
          >
            {{ skill }}
          </Badge>
        </div>
        <p v-else class="text-[11px] text-muted-foreground italic">No skills specified</p>

        <div v-if="applicant.otherSkillsSpecified" class="pt-2 border-t mt-2">
          <span class="text-muted-foreground text-[10px]">Other Specified Skills:</span>
          <p class="font-medium text-foreground text-xs mt-0.5">{{ applicant.otherSkillsSpecified }}</p>
        </div>
      </div>
    </CardContent>

    <!-- EDIT MODE -->
    <CardContent v-else class="p-4 space-y-4 text-xs">
      <div class="space-y-2">
        <span class="font-semibold text-foreground text-xs block">Skills Acquired Without Certificate</span>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1">
          <label
            v-for="skill in skillOptions"
            :key="skill"
            class="flex items-center gap-1.5 p-1.5 rounded-lg border cursor-pointer text-[10px]"
            :class="editOtherSkills.includes(skill) ? 'bg-primary/10 border-primary/40 font-medium' : ''"
          >
            <input
              type="checkbox"
              :checked="editOtherSkills.includes(skill)"
              class="h-3 w-3 rounded accent-primary text-primary"
              @change="toggleEditSkillOption(skill)"
            />
            <span>{{ skill }}</span>
          </label>
        </div>

        <!-- Custom skill tags -->
        <div class="pt-2 space-y-1.5 border-t">
          <span class="text-[10px] text-muted-foreground">Additional Skills</span>
          <div class="flex items-center gap-2">
            <Input
              v-model="editNewSkillTag"
              placeholder="e.g. Welding, Cooking"
              class="h-7 text-xs"
              @keyup.enter="addEditSkillTag"
            />
            <Button size="sm" variant="outline" class="h-7 text-xs gap-1 cursor-pointer" @click="addEditSkillTag">
              <Plus class="h-3 w-3" />
              <span>Add</span>
            </Button>
          </div>
          <div class="flex flex-wrap gap-1 pt-1">
            <Badge
              v-for="(skill, idx) in editOtherSkills.filter(s => s && !skillOptions.includes(s))"
              :key="idx"
              variant="secondary"
              class="text-[10px] gap-1 py-0.5"
            >
              <span>{{ skill }}</span>
              <X class="h-3 w-3 cursor-pointer hover:text-destructive" @click="removeEditSkillTag(editOtherSkills.indexOf(skill))" />
            </Badge>
          </div>
        </div>

        <div class="pt-1 space-y-1">
          <span class="text-[10px] text-muted-foreground">Others (Specify)</span>
          <SkillTextPicker v-model="editOtherSkillsSpecified" placeholder="Specialized skills" size="sm" />
        </div>
      </div>
    </CardContent>
  </Card>
</template>
