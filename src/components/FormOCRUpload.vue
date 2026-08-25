<script setup lang="ts">
import { ref } from 'vue'
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  User,
  GraduationCap,
  Briefcase,
  Wrench,
  Code2,
  FileCheck,
  Percent,
} from '@lucide/vue'
import { useFormOCR } from '@/composables/common/useFormOCR'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const props = defineProps<{
  applicantId?: string
}>()

const emit = defineEmits<{
  (e: 'saved', data: any): void
}>()

const {
  selectedFile,
  previewUrl,
  ocrState,
  isExtracted,
  isSaving,
  formData,
  handleFileSelect,
  clearFile,
  runOcrExtraction,
  saveFormData,
  addWorkExperience,
  removeWorkExperience,
  addSkill,
  removeSkill,
  copyJsonToClipboard,
  resetAll,
} = useFormOCR()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref<boolean>(false)
const activeTab = ref<'personal' | 'education' | 'experience' | 'skills' | 'json'>('personal')
const newSkillInput = ref<string>('')

const onDrop = (event: DragEvent) => {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    handleFileSelect(event.dataTransfer.files[0])
  }
}

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    handleFileSelect(target.files[0])
  }
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleAddSkillKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (newSkillInput.value.trim()) {
      addSkill(newSkillInput.value)
      newSkillInput.value = ''
    }
  }
}

const handleSave = async () => {
  await saveFormData(props.applicantId)
  emit('saved', formData)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header / Title -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles class="w-6 h-6 text-primary animate-pulse" />
          Handwritten Form OCR
        </h2>
        <p class="text-sm text-muted-foreground mt-1">
          Extract structured data from handwritten & printed applicant forms using Google Gemini Vision AI.
        </p>
      </div>

      <div v-if="isExtracted" class="flex items-center gap-2">
        <Badge variant="outline" class="gap-1 py-1 px-3 bg-card">
          <Percent class="w-3.5 h-3.5 text-primary" />
          Confidence: {{ Math.round((formData.confidenceScore || 1) * 100) }}%
        </Badge>
        <Button variant="outline" size="sm" class="gap-1.5" @click="copyJsonToClipboard">
          <Copy class="w-4 h-4" />
          Copy JSON
        </Button>
        <Button variant="default" size="sm" class="gap-1.5" :disabled="isSaving" @click="handleSave">
          <Loader2 v-if="isSaving" class="w-4 h-4 animate-spin" />
          <Save v-else class="w-4 h-4" />
          Save Form
        </Button>
      </div>
    </div>

    <!-- Upload & Preview Section -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- File Upload Zone / Thumbnail Preview -->
      <div :class="isExtracted ? 'lg:col-span-4' : 'lg:col-span-12'">
        <Card class="border-border/60 shadow-xs h-full flex flex-col">
          <CardHeader class="pb-3">
            <CardTitle class="text-base font-semibold flex items-center gap-2">
              <FileCheck class="w-4 h-4 text-primary" />
              Document Upload
            </CardTitle>
            <CardDescription class="text-xs">
              Upload a scanned image (.png, .jpg, .webp) or PDF page of the form.
            </CardDescription>
          </CardHeader>

          <CardContent class="flex-1 flex flex-col justify-between space-y-4">
            <!-- Hidden file input -->
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf"
              class="hidden"
              @change="onFileChange"
            />

            <!-- Dropzone when no file is selected -->
            <div
              v-if="!selectedFile"
              class="border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px] bg-muted/20 hover:bg-muted/40 hover:border-primary/50"
              :class="{ 'border-primary bg-primary/5': isDragging }"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="onDrop"
              @click="triggerFileInput"
            >
              <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                <UploadCloud class="w-6 h-6" />
              </div>
              <p class="text-sm font-semibold text-foreground">Click to upload or drag & drop</p>
              <p class="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP or PDF (Max 20MB)</p>
            </div>

            <!-- File Selected Preview -->
            <div v-else class="space-y-4">
              <div
                class="relative rounded-lg overflow-hidden border border-border bg-muted/40 flex items-center justify-center max-h-[360px] min-h-[180px]"
              >
                <img
                  v-if="previewUrl"
                  :src="previewUrl"
                  alt="Applicant Form Preview"
                  class="w-full h-full object-contain max-h-[340px]"
                />
                <div v-else class="flex flex-col items-center justify-center p-8 text-muted-foreground">
                  <FileText class="w-16 h-16 mb-2 text-primary/70" />
                  <span class="text-xs font-medium">{{ selectedFile.name }}</span>
                </div>
              </div>

              <!-- File Info & Reset Button -->
              <div class="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-background text-xs">
                <div class="truncate max-w-[200px] font-medium text-foreground">
                  {{ selectedFile.name }}
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-muted-foreground">{{ (selectedFile.size / (1024 * 1024)).toFixed(2) }} MB</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    :disabled="ocrState.isExtracting"
                    @click="clearFile"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <!-- OCR Extract Button / Status -->
            <div class="space-y-3 pt-2">
              <div v-if="ocrState.isExtracting" class="space-y-2">
                <div class="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span class="flex items-center gap-1.5">
                    <Loader2 class="w-3.5 h-3.5 animate-spin text-primary" />
                    {{ ocrState.statusMessage }}
                  </span>
                  <span>{{ ocrState.progressPercent }}%</span>
                </div>
                <div class="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    class="h-full bg-primary transition-all duration-300 rounded-full"
                    :style="{ width: `${ocrState.progressPercent}%` }"
                  />
                </div>
              </div>

              <!-- Error Alert -->
              <div
                v-if="ocrState.errorMessage"
                class="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-start gap-2"
              >
                <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
                <div class="flex-1">
                  <p class="font-semibold">Extraction Failed</p>
                  <p class="mt-0.5 leading-relaxed">{{ ocrState.errorMessage }}</p>
                </div>
              </div>

              <!-- Action Trigger -->
              <div class="flex items-center gap-2">
                <Button
                  v-if="!isExtracted"
                  class="w-full gap-2 font-medium"
                  :disabled="!selectedFile || ocrState.isExtracting"
                  @click="() => runOcrExtraction(applicantId)"
                >
                  <Loader2 v-if="ocrState.isExtracting" class="w-4 h-4 animate-spin" />
                  <Sparkles v-else class="w-4 h-4" />
                  {{ ocrState.isExtracting ? 'Analyzing with Gemini Vision...' : 'Extract Form Data' }}
                </Button>

                <Button
                  v-else
                  variant="outline"
                  class="w-full gap-2 text-xs"
                  @click="resetAll"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                  New Upload / Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Structured Editable Form Results -->
      <div v-if="isExtracted" class="lg:col-span-8 space-y-4">
        <Card class="border-border/60 shadow-xs">
          <!-- Form Tabs Navigation -->
          <CardHeader class="pb-2 border-b border-border/60">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                  :class="activeTab === 'personal' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
                  @click="activeTab = 'personal'"
                >
                  <User class="w-3.5 h-3.5" />
                  Personal Info
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                  :class="activeTab === 'education' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
                  @click="activeTab = 'education'"
                >
                  <GraduationCap class="w-3.5 h-3.5" />
                  Education
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                  :class="activeTab === 'experience' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
                  @click="activeTab = 'experience'"
                >
                  <Briefcase class="w-3.5 h-3.5" />
                  Work Experience
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                  :class="activeTab === 'skills' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
                  @click="activeTab = 'skills'"
                >
                  <Wrench class="w-3.5 h-3.5" />
                  Skills
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5"
                  :class="activeTab === 'json' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
                  @click="activeTab = 'json'"
                >
                  <Code2 class="w-3.5 h-3.5" />
                  Raw JSON
                </button>
              </div>

              <span class="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
                Verified & Editable
              </span>
            </div>
          </CardHeader>

          <CardContent class="pt-4 space-y-4">
            <!-- TAB 1: Personal Info -->
            <div v-show="activeTab === 'personal'" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-muted-foreground">Surname</label>
                  <input
                    v-model="formData.personalInfo.surname"
                    type="text"
                    class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="e.g. DELA CRUZ"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-muted-foreground">First Name</label>
                  <input
                    v-model="formData.personalInfo.firstName"
                    type="text"
                    class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="e.g. JUAN"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-muted-foreground">Middle Name</label>
                  <input
                    v-model="formData.personalInfo.middleName"
                    type="text"
                    class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="e.g. SANTOS"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-muted-foreground">Suffix</label>
                  <input
                    v-model="formData.personalInfo.suffix"
                    type="text"
                    class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Jr., III (optional)"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-muted-foreground">Sex</label>
                  <select
                    v-model="formData.personalInfo.sex"
                    class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select Sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-muted-foreground">Date of Birth</label>
                  <input
                    v-model="formData.personalInfo.dateOfBirth"
                    type="text"
                    class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-muted-foreground">Civil Status</label>
                  <input
                    v-model="formData.personalInfo.civilStatus"
                    type="text"
                    class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Single, Married, etc."
                  />
                </div>
              </div>

              <!-- Address Fields -->
              <div class="pt-2 border-t border-border/40">
                <h4 class="text-xs font-bold text-foreground mb-2">Residential Address</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div class="space-y-1">
                    <label class="text-xs text-muted-foreground">House / Street</label>
                    <input
                      v-model="formData.personalInfo.address.houseStreet"
                      type="text"
                      class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Purok / Street"
                    />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs text-muted-foreground">Barangay</label>
                    <input
                      v-model="formData.personalInfo.address.barangay"
                      type="text"
                      class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Barangay"
                    />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs text-muted-foreground">Municipality</label>
                    <input
                      v-model="formData.personalInfo.address.municipality"
                      type="text"
                      class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Municipality"
                    />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs text-muted-foreground">Province</label>
                    <input
                      v-model="formData.personalInfo.address.province"
                      type="text"
                      class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Agusan del Sur"
                    />
                  </div>
                </div>
              </div>

              <!-- Contact & IDs -->
              <div class="pt-2 border-t border-border/40">
                <h4 class="text-xs font-bold text-foreground mb-2">Contact & Government IDs</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div class="space-y-1">
                    <label class="text-xs text-muted-foreground">Contact Number</label>
                    <input
                      v-model="formData.personalInfo.contactNumber"
                      type="text"
                      class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="0912..."
                    />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs text-muted-foreground">Email Address</label>
                    <input
                      v-model="formData.personalInfo.email"
                      type="email"
                      class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="name@email.com"
                    />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs text-muted-foreground">TIN</label>
                    <input
                      v-model="formData.personalInfo.tin"
                      type="text"
                      class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="000-000-000"
                    />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs text-muted-foreground">SSS / GSIS</label>
                    <input
                      v-model="formData.personalInfo.sss"
                      type="text"
                      class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="SSS / GSIS No."
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 2: Education -->
            <div v-show="activeTab === 'education'" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-muted-foreground">Educational Level</label>
                  <input
                    v-model="formData.education.educationalLevel"
                    type="text"
                    class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="e.g. College Graduate, Senior High School, TVET"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-muted-foreground">Course / Degree</label>
                  <input
                    v-model="formData.education.course"
                    type="text"
                    class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="e.g. BS in Information Technology"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-muted-foreground">School / University</label>
                  <input
                    v-model="formData.education.school"
                    type="text"
                    class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="e.g. ASSCAT, PNU Mindanao"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-semibold text-muted-foreground">Year Graduated</label>
                  <input
                    v-model="formData.education.yearGraduated"
                    type="text"
                    class="w-full h-9 px-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="e.g. 2023"
                  />
                </div>
              </div>
            </div>

            <!-- TAB 3: Work Experience -->
            <div v-show="activeTab === 'experience'" class="space-y-4">
              <div class="flex items-center justify-between">
                <p class="text-xs text-muted-foreground">List of employment and internship records.</p>
                <Button variant="outline" size="sm" class="gap-1.5 text-xs h-8" @click="addWorkExperience">
                  <Plus class="w-3.5 h-3.5" />
                  Add Experience
                </Button>
              </div>

              <div v-if="formData.workExperience.length === 0" class="text-center py-8 text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                No work experience records extracted. Click "Add Experience" to add.
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="(exp, index) in formData.workExperience"
                  :key="index"
                  class="p-3.5 rounded-lg border border-border/80 bg-card space-y-3 relative group"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-foreground">Record #{{ index + 1 }}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      @click="() => removeWorkExperience(index)"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="space-y-1">
                      <label class="text-xs text-muted-foreground">Job Title / Position</label>
                      <input
                        v-model="exp.jobTitle"
                        type="text"
                        class="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background"
                        placeholder="Job Title"
                      />
                    </div>
                    <div class="space-y-1">
                      <label class="text-xs text-muted-foreground">Company / Organization</label>
                      <input
                        v-model="exp.company"
                        type="text"
                        class="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background"
                        placeholder="Company Name"
                      />
                    </div>
                    <div class="space-y-1">
                      <label class="text-xs text-muted-foreground">Duration</label>
                      <input
                        v-model="exp.duration"
                        type="text"
                        class="w-full h-8 px-2.5 text-xs rounded-md border border-input bg-background"
                        placeholder="e.g. 2021 - 2023"
                      />
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="text-xs text-muted-foreground">Description / Duties</label>
                    <textarea
                      v-model="exp.description"
                      rows="2"
                      class="w-full p-2 text-xs rounded-md border border-input bg-background"
                      placeholder="Brief overview of duties performed"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 4: Skills -->
            <div v-show="activeTab === 'skills'" class="space-y-4">
              <div class="space-y-2">
                <label class="text-xs font-semibold text-muted-foreground">Extracted Skills & Competencies</label>
                <div class="flex flex-wrap gap-2 min-h-[44px] p-3 rounded-lg border border-border/80 bg-muted/20 items-center">
                  <Badge
                    v-for="(skill, index) in formData.skills"
                    :key="index"
                    variant="secondary"
                    class="gap-1 py-1 px-2.5 text-xs"
                  >
                    {{ skill }}
                    <button
                      type="button"
                      class="ml-1 hover:text-destructive text-muted-foreground"
                      @click="() => removeSkill(index)"
                    >
                      ×
                    </button>
                  </Badge>
                  <span v-if="formData.skills.length === 0" class="text-xs text-muted-foreground">
                    No skills identified yet.
                  </span>
                </div>
              </div>

              <!-- Add custom skill input -->
              <div class="flex items-center gap-2 max-w-sm">
                <input
                  v-model="newSkillInput"
                  type="text"
                  class="flex-1 h-9 px-3 text-xs rounded-md border border-input bg-background"
                  placeholder="Type a skill and press Enter..."
                  @keydown="handleAddSkillKeydown"
                />
                <Button
                  variant="outline"
                  size="sm"
                  class="h-9 gap-1 text-xs"
                  :disabled="!newSkillInput.trim()"
                  @click="() => { if (newSkillInput.trim()) { addSkill(newSkillInput); newSkillInput = ''; } }"
                >
                  <Plus class="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
            </div>

            <!-- TAB 5: Raw JSON -->
            <div v-show="activeTab === 'json'" class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted-foreground font-mono">Structured JSON Output</span>
                <Button variant="ghost" size="sm" class="h-7 text-xs gap-1" @click="copyJsonToClipboard">
                  <Copy class="w-3.5 h-3.5" />
                  Copy
                </Button>
              </div>
              <pre
                class="p-4 rounded-lg bg-muted text-xs font-mono overflow-auto max-h-[380px] border border-border text-foreground leading-relaxed"
              >{{ JSON.stringify(formData, null, 2) }}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
