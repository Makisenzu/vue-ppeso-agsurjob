<script setup lang="ts">
// ApplicantNsrpDetails.vue — Section V: technical / vocational training (view / edit)
import SkillTextPicker from '@/components/SkillTextPicker.vue'
import SupportingDocumentLink from '@/components/SupportingDocumentLink.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Award, Loader2, Pencil, Plus, Save, Trash2, X } from '@lucide/vue'
import { useApplicantNsrpDetailsContext } from '@/composables/peso/provincialPeso/applicantNsrpDetailsContext'

const {
  applicant,
  editingSection,
  isSaving,
  startEdit,
  cancelEdit,
  saveSection,
  editVocationalTrainings,
  addEditVocationalRow,
  removeEditVocationalRow,
} = useApplicantNsrpDetailsContext()
</script>

<template>
  <Card v-if="applicant" class="border shadow-xs">
      <CardHeader class="pb-3 border-b bg-muted/20">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <CardTitle class="text-sm font-semibold flex items-center gap-2">
              <span>V. Technical/Vocational</span>
            </CardTitle>
            <Badge variant="outline" class="text-[10px] font-mono">
              {{ applicant.vocationalTrainings.length }} Training(s)
            </Badge>
          </div>
          <Button
            v-if="editingSection !== 'vocational'"
            variant="ghost"
            size="sm"
            class="gap-1.5 text-xs cursor-pointer print:hidden h-7 px-2 hover:bg-muted"
            @click="startEdit('vocational')"
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
              @click="saveSection('vocational')"
            >
              <Loader2 v-if="isSaving" class="h-3.5 w-3.5 animate-spin" />
              <Save v-else class="h-3.5 w-3.5" />
              <span>Save</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <!-- VIEW MODE -->
      <CardContent v-if="editingSection !== 'vocational'" class="p-4 space-y-3">
        <div v-if="applicant.vocationalTrainings.length > 0" class="space-y-2.5">
          <div
            v-for="(voc, idx) in applicant.vocationalTrainings"
            :key="idx"
            class="p-3.5 rounded-lg border bg-card/60 space-y-1.5"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span class="font-bold text-xs sm:text-sm text-foreground">
                {{ voc.course_training_title }}
              </span>
              <Badge variant="secondary" class="text-[10px] font-mono w-fit">
                {{ voc.duration || 'Duration N/A' }}
              </Badge>
            </div>
            <p class="text-xs text-muted-foreground">
              Institution: <span class="text-foreground font-medium">{{ voc.training_institution }}</span>
            </p>
            <p v-if="voc.skills_acquired" class="text-xs text-muted-foreground">
              Skills Acquired: <span class="text-foreground font-medium">{{ voc.skills_acquired }}</span>
            </p>
            <p v-if="voc.certificates_received" class="text-xs text-primary font-medium">
              Certificate: {{ voc.certificates_received }}
            </p>
            <SupportingDocumentLink
              v-if="voc.document_path"
              :path="voc.document_path"
              :label="voc.document_name || 'View certificate'"
            />
            <p v-else class="text-xs text-muted-foreground italic">No supporting document attached.</p>
          </div>
        </div>
        <div v-else class="text-center py-6 text-xs text-muted-foreground italic border rounded-lg bg-muted/10">
          No technical or vocational trainings recorded.
        </div>
      </CardContent>
      <!-- EDIT MODE -->
      <CardContent v-else class="p-4 space-y-4 text-xs">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-foreground text-xs flex items-center gap-1.5">
            <Award class="h-3.5 w-3.5 text-primary" />
            Technical / Vocational Trainings & Certifications (TESDA)
          </span>
          <Button size="sm" variant="outline" class="h-7 text-xs gap-1 cursor-pointer" @click="addEditVocationalRow">
            <Plus class="h-3 w-3" />
            <span>Add Training</span>
          </Button>
        </div>
        <div v-if="editVocationalTrainings.length === 0" class="text-center py-4 text-muted-foreground italic border rounded-lg">
          No technical or vocational trainings added. Click "Add Training" to add one.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="(voc, idx) in editVocationalTrainings"
            :key="idx"
            class="p-3.5 rounded-xl border bg-card/60 space-y-2.5"
          >
            <div class="flex items-center justify-between border-b pb-1.5">
              <span class="font-semibold text-primary text-xs">Training #{{ idx + 1 }}</span>
              <Button
                variant="ghost"
                size="sm"
                class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                @click="removeEditVocationalRow(idx)"
              >
                <Trash2 class="h-3 w-3" />
              </Button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Course / Training Title</span>
                <Input v-model="voc.course_training_title" placeholder="e.g. Shielded Metal Arc Welding (SMAW)" class="h-8 text-xs" />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Training Institution</span>
                <Input v-model="voc.training_institution" placeholder="e.g. ASSCAT, TESDA Regional Training Center" class="h-8 text-xs" />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Duration (Hours / Months)</span>
                <Input v-model="voc.duration" placeholder="e.g. 268 Hours" class="h-8 text-xs" />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Skills Acquired</span>
                <SkillTextPicker v-model="voc.skills_acquired" placeholder="e.g. SMAW, Gas Welding" size="sm" />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground">Certificates Received</span>
                <Input v-model="voc.certificates_received" placeholder="e.g. National Certificate II (NC II)" class="h-8 text-xs" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
</template>
