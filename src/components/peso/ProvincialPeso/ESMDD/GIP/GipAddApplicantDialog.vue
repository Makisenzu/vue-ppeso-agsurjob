<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  FileText,
  Loader2,
  MapPin,
  Mountain,
  Plus,
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
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import {
  AGSUR_MUNICIPALITIES,
  inferLpiiCategory,
} from '@/helpers/peso/provincialPeso/excelImportHelper'
import { LPII_CONFIG } from '@/helpers/peso/provincialPeso/gipHelper'

const store = useGipStore()

const currentYear = new Date().getFullYear()

const form = ref({
  surname: '',
  firstName: '',
  middleName: '',
  suffix: '',
  sex: 'Male',
  dateOfBirth: '',
  age: null as number | null,
  civilStatus: 'Single',
  religion: 'Roman Catholic',
  tin: '',
  houseStreet: 'Purok 1',
  barangay: 'Poblacion',
  municipality: 'Prosperidad',
  province: 'Agusan del Sur',
  contactNumber: '',
  email: '',
  educationalLevel: 'College Graduate',
  course: 'BS Information Technology',
  yearGraduated: `${currentYear}`,
  batchYear: currentYear,
  documentsSubmitted: ['NSRP Form 1', 'Resume / Bio-Data'],
  employmentStatus: 'Unemployed',
  is4ps: false,
  hasDisability: false,
  skills: 'Computer Literacy, Data Entry',
})

// Auto-calculate age when dateOfBirth changes
watch(
  () => form.value.dateOfBirth,
  (newDob) => {
    if (newDob) {
      const birthYear = new Date(newDob).getFullYear()
      if (!isNaN(birthYear) && birthYear > 1940) {
        form.value.age = currentYear - birthYear
      }
    }
  }
)

// Auto-compute LPII category
const computedLpiiTag = computed(() => {
  return inferLpiiCategory(form.value.municipality, form.value.barangay)
})

const isFormValid = computed(() => {
  return (
    form.value.surname.trim() !== '' &&
    form.value.firstName.trim() !== '' &&
    form.value.municipality.trim() !== '' &&
    form.value.barangay.trim() !== '' &&
    form.value.course.trim() !== ''
  )
})

const documentOptions = [
  'NSRP Form 1',
  'Resume / Bio-Data',
  'Transcript of Records',
  'College Diploma',
  'Barangay Clearance',
  'Valid Government ID',
  'Certificate of Indigency',
]

const toggleDocument = (doc: string) => {
  const index = form.value.documentsSubmitted.indexOf(doc)
  if (index >= 0) {
    form.value.documentsSubmitted.splice(index, 1)
  } else {
    form.value.documentsSubmitted.push(doc)
  }
}

const handleSubmit = async () => {
  if (!isFormValid.value) return

  const payload = {
    ...form.value,
    lpiiTag: computedLpiiTag.value,
    skills: form.value.skills
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean),
  }

  await store.createSingleApplicant(payload)
}

const handleClose = () => {
  store.closeAddApplicantModal()
}
</script>

<template>
  <Dialog :open="store.isAddApplicantModalOpen" @update:open="(val) => !val && handleClose()">
    <DialogContent class="sm:max-w-160 max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div class="flex items-center gap-2.5">
          <div>
            <DialogTitle class="text-base font-semibold">
              Register New GIP Applicant
            </DialogTitle>
            <DialogDescription class="text-xs">
              Complete the applicant profile and NSRP Form 1 information for the Agusan del Sur GIP Registry.
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <form class="space-y-4 py-2 text-xs" @submit.prevent="handleSubmit">
        <!-- ─── Ecosystem Banner Tag ─── -->
        <div
          :class="[
            'flex items-center justify-between rounded-lg p-3 border transition-colors',
            LPII_CONFIG[computedLpiiTag].bgClass,
            LPII_CONFIG[computedLpiiTag].badgeClass,
          ]"
        >
          <div class="flex items-center gap-2">
            <TreePine v-if="computedLpiiTag === 'LOWLAND'" class="h-4 w-4" />
            <Mountain v-else-if="computedLpiiTag === 'UPLAND'" class="h-4 w-4" />
            <Waves v-else class="h-4 w-4" />
            <div>
              <span class="font-bold uppercase tracking-wider text-xs">
                {{ LPII_CONFIG[computedLpiiTag].label }} Ecosystem (Auto-Tag)
              </span>
              <p class="text-[11px] opacity-90">
                Determined by: Brgy. {{ form.barangay || 'Poblacion' }}, {{ form.municipality }}
              </p>
            </div>
          </div>
          <Badge variant="outline" class="bg-background text-foreground font-mono text-[10px]">
            AgSur LPII
          </Badge>
        </div>

        <!-- ─── Section 1: Personal Details ─── -->
        <div class="space-y-2.5 rounded-lg border p-3 bg-muted/10">
          <span class="font-semibold text-foreground flex items-center gap-1.5 text-xs">
            <User class="h-3.5 w-3.5 text-primary" />
            I. Personal Information
          </span>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                Middle Name / Suffix
              </label>
              <div class="flex gap-1.5">
                <Input
                  v-model="form.middleName"
                  placeholder="Middle"
                  class="h-8 text-xs flex-1"
                />
                <Input
                  v-model="form.suffix"
                  placeholder="Jr/III"
                  class="h-8 text-xs w-16"
                />
              </div>
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

        <!-- ─── Section 2: Address & Contact ─── -->
        <div class="space-y-2.5 rounded-lg border p-3 bg-muted/10">
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
                <option v-for="m in AGSUR_MUNICIPALITIES" :key="m" :value="m">
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

        <!-- ─── Section 3: Academic & Batch ─── -->
        <div class="space-y-2.5 rounded-lg border p-3 bg-muted/10">
          <span class="font-semibold text-foreground flex items-center gap-1.5 text-xs">
            <FileText class="h-3.5 w-3.5 text-primary" />
            III. Academic Background & GIP Allocation
          </span>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">Degree / Course *</label>
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
              <label class="block text-[11px] font-medium text-muted-foreground mb-1">Batch Year</label>
              <Input
                v-model.number="form.batchYear"
                type="number"
                class="h-8 text-xs font-mono"
              />
            </div>
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
                  form.documentsSubmitted.includes(doc)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted text-muted-foreground border-border',
                ]"
                @click="toggleDocument(doc)"
              >
                {{ form.documentsSubmitted.includes(doc) ? '✓' : '+' }} {{ doc }}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter class="pt-2">
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
            type="submit"
            size="sm"
            class="text-xs cursor-pointer gap-1.5"
            :disabled="!isFormValid || store.isSubmitting"
          >
            <Loader2 v-if="store.isSubmitting" class="h-3.5 w-3.5 animate-spin" />
            <Plus v-else class="h-3.5 w-3.5" />
            <span>{{ store.isSubmitting ? 'Registering...' : 'Register Applicant' }}</span>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
