<script setup lang="ts">
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  MapPin,
  Mountain,
  Save,
  TreePine,
  User,
  Waves,
} from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { NsrpParsedApplicant } from '@/types/peso/provincialPeso/nsrpOcr'
import { useGipEditCandidate } from '@/composables/peso/provincialPeso/useGipEditCandidate'
import { LPII_CONFIG } from '@/helpers/peso/provincialPeso/gipHelper'

const props = defineProps<{
  open: boolean
  candidate: NsrpParsedApplicant | null
  index: number
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'save', updated: NsrpParsedApplicant, index: number): void
}>()

const {
  form,
  skillsInput,
  validationErrors,
  isValid,
  municipalities,
  documentOptions,
  setLpiiCategory,
  toggleDocument,
  handleSave,
  handleClose,
} = useGipEditCandidate(props, emit)
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-180 max-h-[92vh] flex flex-col p-0">
      <!-- ─── Dialog Header ─── -->
      <DialogHeader class="p-5 pb-3 border-b">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <DialogTitle class="text-base font-semibold flex items-center gap-2">
              Edit Scanned Applicant Information
              <Badge
                v-if="candidate?.pageRange"
                variant="outline"
                class="font-mono text-[10px] py-0 px-2 font-normal text-muted-foreground"
              >
                {{ candidate.pageRange }}
              </Badge>
            </DialogTitle>
            <DialogDescription class="text-xs">
              Review and correct extracted OCR fields before inserting into the GIP registry.
            </DialogDescription>
          </div>

          <!-- Status indicator -->
          <div class="flex items-center gap-2 self-start sm:self-auto">
            <Badge
              v-if="isValid"
              variant="outline"
              class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] gap-1"
            >
              <CheckCircle2 class="h-3.5 w-3.5" />
              Ready for Insert
            </Badge>
            <Badge
              v-else
              variant="outline"
              class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] gap-1"
            >
              <AlertCircle class="h-3.5 w-3.5" />
              Needs Correction ({{ validationErrors.length }})
            </Badge>
          </div>
        </div>
      </DialogHeader>

      <!-- ─── Scrollable Form Body ─── -->
      <div class="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
        <!-- Validation Alert if errors exist -->
        <div
          v-if="validationErrors.length > 0"
          class="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 space-y-1 text-xs"
        >
          <div class="font-semibold flex items-center gap-1.5">
            <AlertCircle class="h-4 w-4 shrink-0" />
            <span>Incomplete / Required Fields Detected:</span>
          </div>
          <ul class="list-disc list-inside pl-1 text-[11px] space-y-0.5 opacity-90">
            <li v-for="(err, i) in validationErrors" :key="i">{{ err }}</li>
          </ul>
        </div>

        <!-- ─── LPII Ecosystem Zone Selector ─── -->
        <div
          :class="[
            'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-lg p-3 border transition-colors',
            LPII_CONFIG[form.lpiiTag].bgClass,
            LPII_CONFIG[form.lpiiTag].badgeClass,
          ]"
        >
          <div class="flex items-center gap-2">
            <TreePine v-if="form.lpiiTag === 'LOWLAND'" class="h-4 w-4" />
            <Mountain v-else-if="form.lpiiTag === 'UPLAND'" class="h-4 w-4" />
            <Waves v-else class="h-4 w-4" />
            <div>
              <span class="font-bold uppercase tracking-wider text-xs">
                {{ LPII_CONFIG[form.lpiiTag].label }} Ecosystem
              </span>
              <p class="text-[11px] opacity-90">
                Location: Brgy. {{ form.barangay || 'Poblacion' }}, {{ form.municipality }}
              </p>
            </div>
          </div>

          <!-- LPII Zone Selection Buttons -->
          <div class="flex items-center gap-1.5 self-start sm:self-auto bg-background/80 p-1 rounded-md border border-border">
            <button
              type="button"
              :class="[
                'px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer',
                form.lpiiTag === 'LOWLAND'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              ]"
              @click="setLpiiCategory('LOWLAND')"
            >
              Lowland
            </button>
            <button
              type="button"
              :class="[
                'px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer',
                form.lpiiTag === 'UPLAND'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              ]"
              @click="setLpiiCategory('UPLAND')"
            >
              Upland
            </button>
            <button
              type="button"
              :class="[
                'px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer',
                form.lpiiTag === 'WETLAND'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              ]"
              @click="setLpiiCategory('WETLAND')"
            >
              Wetland
            </button>
          </div>
        </div>

        <!-- ─── Section 1: Personal Details ─── -->
        <div class="space-y-3 rounded-lg border p-3 bg-muted/10">
          <span class="font-semibold text-foreground flex items-center gap-1.5 text-xs">
            <User class="h-3.5 w-3.5 text-primary" />
            I. Personal Information
          </span>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">
                Surname *
              </label>
              <Input
                v-model="form.surname"
                placeholder="e.g. Dela Cruz"
                class="h-8 text-xs"
                required
              />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">
                First Name *
              </label>
              <Input
                v-model="form.firstName"
                placeholder="e.g. Juan"
                class="h-8 text-xs"
                required
              />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">
                Middle Name
              </label>
              <Input
                v-model="form.middleName"
                placeholder="Middle"
                class="h-8 text-xs"
              />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">
                Suffix
              </label>
              <Input
                v-model="form.suffix"
                placeholder="Jr / III"
                class="h-8 text-xs"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">Sex</label>
              <select
                v-model="form.sex"
                class="w-full h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">Date of Birth</label>
              <Input
                v-model="form.dateOfBirth"
                type="date"
                class="h-8 text-xs"
              />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">Civil Status</label>
              <select
                v-model="form.civilStatus"
                class="w-full h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">TIN (Optional)</label>
              <Input
                v-model="form.tin"
                placeholder="000-000-000"
                class="h-8 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <!-- ─── Section 2: Address & Contact Details ─── -->
        <div class="space-y-3 rounded-lg border p-3 bg-muted/10">
          <span class="font-semibold text-foreground flex items-center gap-1.5 text-xs">
            <MapPin class="h-3.5 w-3.5 text-primary" />
            II. Residence & Contact Information
          </span>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">
                Municipality / City *
              </label>
              <select
                v-model="form.municipality"
                class="w-full h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option v-for="m in municipalities" :key="m" :value="m">
                  {{ m }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">
                Barangay *
              </label>
              <Input
                v-model="form.barangay"
                placeholder="e.g. Poblacion"
                class="h-8 text-xs"
                required
              />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">
                House No. / Street / Purok
              </label>
              <Input
                v-model="form.houseStreet"
                placeholder="e.g. Purok 3B"
                class="h-8 text-xs"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">Contact Number</label>
              <Input
                v-model="form.contactNumber"
                placeholder="09123456789"
                class="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">Email Address</label>
              <Input
                v-model="form.email"
                type="email"
                placeholder="applicant@example.com"
                class="h-8 text-xs"
              />
            </div>
          </div>
        </div>

        <!-- ─── Section 3: Academic Background & Skills ─── -->
        <div class="space-y-3 rounded-lg border p-3 bg-muted/10">
          <span class="font-semibold text-foreground flex items-center gap-1.5 text-xs">
            <FileText class="h-3.5 w-3.5 text-primary" />
            III. Academic Background & Competencies
          </span>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">
                Degree / Course *
              </label>
              <Input
                v-model="form.course"
                placeholder="e.g. BS Information Technology"
                class="h-8 text-xs"
                required
              />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">Educational Level</label>
              <select
                v-model="form.educationalLevel"
                class="w-full h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="College Graduate">College Graduate</option>
                <option value="College Level">College Level</option>
                <option value="Tech-Voc Graduate">Tech-Voc / TVET Graduate</option>
                <option value="Senior High Graduate">Senior High School Graduate</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">Year Graduated / Batch</label>
              <div class="flex gap-2">
                <Input
                  v-model="form.yearGraduated"
                  placeholder="Year"
                  class="h-8 text-xs w-1/2 font-mono"
                />
                <Input
                  v-model.number="form.batchYear"
                  type="number"
                  placeholder="Batch"
                  class="h-8 text-xs w-1/2 font-mono"
                />
              </div>
            </div>
          </div>

          <!-- Skills input -->
          <div>
            <label class="block text-[11px] font-medium text-muted-foreground mb-1">
              Skills & Competencies (comma-separated)
            </label>
            <Input
              v-model="skillsInput"
              placeholder="e.g. Computer Literacy, Data Entry, Agricultural Research"
              class="h-8 text-xs"
            />
          </div>

          <!-- Beneficiary tags -->
          <div class="flex items-center gap-4 pt-1">
            <label class="flex items-center gap-2 cursor-pointer text-[11px] text-foreground">
              <input
                v-model="form.is4ps"
                type="checkbox"
                class="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>4Ps Beneficiary</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer text-[11px] text-foreground">
              <input
                v-model="form.hasDisability"
                type="checkbox"
                class="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>Person with Disability (PWD)</span>
            </label>
          </div>

          <!-- Documents Checklist -->
          <div class="space-y-1.5 pt-1">
            <label class="block text-[11px] font-medium text-muted-foreground">
              Documents Submitted Checklist
            </label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="doc in documentOptions"
                :key="doc"
                type="button"
                :class="[
                  'px-2.5 py-1 rounded-md text-[11px] border font-medium transition cursor-pointer',
                  (form.documentsSubmitted || []).includes(doc)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted text-muted-foreground border-border',
                ]"
                @click="toggleDocument(doc)"
              >
                {{ (form.documentsSubmitted || []).includes(doc) ? '✓' : '+' }} {{ doc }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Dialog Footer ─── -->
      <DialogFooter class="p-4 border-t bg-muted/10">
        <div class="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="text-xs cursor-pointer"
            @click="handleClose"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            class="text-xs cursor-pointer gap-1.5"
            @click="handleSave"
          >
            <Save class="h-3.5 w-3.5" />
            <span>Save & Apply Changes</span>
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
