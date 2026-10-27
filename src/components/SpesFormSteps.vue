<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { formatFileSize } from '@/helpers/common/uploadHelpers'
import type { SpesFormSteps } from '@/composables/common/useSpesFormSteps'
import type { SpesDocumentKey } from '@/types/common/spesForm'

/**
 * The 5-step SPES application form (vertical stepper + step cards), shared by the
 * applicant self-service page and the PESO staff entry page. The parent owns the
 * form state through `useSpesFormSteps()` and handles the `submit` event.
 */
const props = withDefaults(
  defineProps<{
    form: SpesFormSteps
    isSubmitting?: boolean
    /** Disables every field and hides the submit button (e.g. an already-reviewed application). */
    readonly?: boolean
    submitLabel?: string
    submittingLabel?: string
    certificationLabel?: string
  }>(),
  {
    isSubmitting: false,
    readonly: false,
    submitLabel: 'Submit Application',
    submittingLabel: 'Submitting...',
    certificationLabel: 'I certify that the information provided is true and correct, and I authorize PESO to verify it.',
  }
)

const emit = defineEmits<{ (e: 'submit'): void }>()

// The form object is created once by the parent, so destructuring keeps its refs reactive.
const {
  values,
  steps,
  hasRequirements,
  currentStep,
  nextStep,
  prevStep,
  goToStep,
  isPermanentSameAsPresent,
  toggleParentsStatus,
  skillInput,
  addSkill,
  removeSkill,
  hasCertified,
  certificationError,
  sexOptions,
  civilStatusOptions,
  studentCategoryOptions,
  municipalityOptions,
  parentsStatusOptions,
  educationLevels,
  availmentSlots,
  documentRequirements,
  attachments,
  pendingAttachments,
  attachmentErrors,
  isAttachmentRequired,
  hasAttachment,
  selectAttachment,
  clearPendingAttachment,
  attachmentAccept,
} = props.form

const onAttachmentPicked = (key: SpesDocumentKey, event: Event) => {
  const input = event.target as HTMLInputElement
  selectAttachment(key, input.files?.[0])
  // Lets the same file be picked again after clearing it
  input.value = ''
}

// ─── Drag & drop ───
const draggingKey = ref<SpesDocumentKey | null>(null)

const onAttachmentDrop = (key: SpesDocumentKey, event: DragEvent) => {
  draggingKey.value = null
  if (isDisabled.value) return
  selectAttachment(key, event.dataTransfer?.files?.[0])
}

// ─── Replace (one hidden input serves every "Replace" action) ───
const replaceInput = ref<HTMLInputElement | null>(null)
const replaceKey = ref<SpesDocumentKey | null>(null)

const pickReplacement = (key: SpesDocumentKey) => {
  replaceKey.value = key
  replaceInput.value?.click()
}

const onReplacePicked = (event: Event) => {
  if (replaceKey.value) onAttachmentPicked(replaceKey.value, event)
  replaceKey.value = null
}

// ─── Previews of picked (not yet uploaded) images ───
const pendingPreviewUrls = ref<Partial<Record<SpesDocumentKey, string>>>({})

const revokePreviews = () => Object.values(pendingPreviewUrls.value).forEach((url) => url && URL.revokeObjectURL(url))

watch(
  pendingAttachments,
  (pending) => {
    revokePreviews()
    pendingPreviewUrls.value = Object.fromEntries(
      Object.entries(pending)
        .filter(([, file]) => file?.type.startsWith('image/'))
        .map(([key, file]) => [key, URL.createObjectURL(file!)])
    )
  },
  { immediate: true }
)

onBeforeUnmount(revokePreviews)

/** The file shown for a requirement: the picked one first, otherwise the saved one. */
const shownAttachment = (key: SpesDocumentKey) => {
  const pending = pendingAttachments.value[key]
  if (pending) {
    return {
      filename: pending.name,
      description: `${formatFileSize(pending.size)} · uploads when you save`,
      previewUrl: pendingPreviewUrls.value[key] ?? null,
      openUrl: null,
      isPending: true,
    }
  }
  const saved = attachments.value[key]
  if (!saved) return null
  return {
    filename: saved.filename,
    description: 'Uploaded',
    previewUrl: saved.mimeType?.startsWith('image/') ? saved.url : null,
    openUrl: saved.url,
    isPending: false,
  }
}

const isDisabled = computed(() => props.isSubmitting || props.readonly)

// Enter on earlier steps moves forward instead of submitting the whole form
const onFormSubmit = () => (currentStep.value < steps.length ? nextStep() : emit('submit'))
</script>

<template>
  <form @submit.prevent="onFormSubmit">
    <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <!-- Left: Stepper -->
      <div class="z-10 lg:sticky lg:top-20 lg:col-span-4 xl:col-span-3">
        <div class="p-2 sm:p-3">
          <div class="mb-6 flex items-center justify-between px-1">
            <span class="text-sm font-bold tracking-tight text-foreground">Application Steps</span>
            <span class="font-mono text-xs text-muted-foreground">Step {{ currentStep }} of {{ steps.length }}</span>
          </div>

          <div class="flex w-full flex-col">
            <button
              v-for="(s, idx) in steps"
              :key="s.step"
              type="button"
              class="group flex cursor-pointer items-start gap-3.5 text-left select-none"
              @click="goToStep(s.step)"
            >
              <div class="flex shrink-0 flex-col items-center self-stretch">
                <div
                  v-if="currentStep === s.step"
                  class="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 shadow-xs ring-4 ring-primary/15"
                >
                  <div class="size-3 rounded-full bg-primary" />
                </div>
                <div
                  v-else-if="currentStep > s.step"
                  class="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground shadow-xs"
                >
                  <Check class="size-3.5 stroke-3" />
                </div>
                <div
                  v-else
                  class="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 transition-colors group-hover:border-foreground/30"
                >
                  <div class="size-1.5 rounded-full bg-muted-foreground/60" />
                </div>
                <div
                  v-if="idx < steps.length - 1"
                  class="my-1 min-h-10 w-0.5 flex-1 transition-colors duration-200"
                  :class="currentStep > s.step ? 'bg-primary' : 'bg-border'"
                />
              </div>
              <div class="min-w-0 flex-1 pt-0.5 pb-6">
                <h3
                  class="text-sm tracking-tight"
                  :class="currentStep === s.step ? 'font-bold text-primary' : 'font-semibold text-foreground'"
                >
                  {{ s.title }}
                </h3>
                <p class="mt-1 text-xs" :class="currentStep === s.step ? 'text-foreground/80' : 'text-muted-foreground'">
                  {{ s.description }}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Active Step -->
      <div class="min-w-0 space-y-6 lg:col-span-8 xl:col-span-9">
        <fieldset :disabled="isDisabled" class="min-w-0 space-y-6">
          <!-- ═══ STEP 1: Personal Information ═══ -->
          <Card v-show="currentStep === 1">
            <CardHeader>
              <CardTitle class="text-base">Personal Information</CardTitle>
              <CardDescription>Use your name exactly as it appears on your birth certificate.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField v-slot="{ componentField }" name="surname">
                  <FormItem>
                    <FormLabel>Surname <span class="text-destructive">*</span></FormLabel>
                    <FormControl><Input v-bind="componentField" autocomplete="family-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="first_name">
                  <FormItem>
                    <FormLabel>First Name <span class="text-destructive">*</span></FormLabel>
                    <FormControl><Input v-bind="componentField" autocomplete="given-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="middle_name">
                  <FormItem>
                    <FormLabel>Middle Name</FormLabel>
                    <FormControl><Input v-bind="componentField" autocomplete="additional-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField v-slot="{ componentField }" name="date_of_birth">
                  <FormItem>
                    <FormLabel>Date of Birth <span class="text-destructive">*</span></FormLabel>
                    <FormControl><Input v-bind="componentField" type="date" /></FormControl>
                    <FormDescription v-if="values.age !== null && values.age !== undefined">
                      Age: {{ values.age }}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="place_of_birth">
                  <FormItem class="sm:col-span-2">
                    <FormLabel>Place of Birth</FormLabel>
                    <FormControl><Input v-bind="componentField" placeholder="e.g. Prosperidad, Agusan del Sur" /></FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField v-slot="{ componentField }" name="sex">
                  <FormItem>
                    <FormLabel>Sex <span class="text-destructive">*</span></FormLabel>
                    <Select v-bind="componentField" :disabled="isDisabled">
                      <FormControl>
                        <SelectTrigger class="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem v-for="option in sexOptions" :key="option" :value="option">{{ option }}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="civil_status">
                  <FormItem>
                    <FormLabel>Civil Status</FormLabel>
                    <Select v-bind="componentField" :disabled="isDisabled">
                      <FormControl>
                        <SelectTrigger class="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem v-for="option in civilStatusOptions" :key="option" :value="option">{{ option }}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="citizenship">
                  <FormItem>
                    <FormLabel>Citizenship</FormLabel>
                    <FormControl><Input v-bind="componentField" /></FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField v-slot="{ componentField }" name="contact_number">
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl><Input v-bind="componentField" type="tel" placeholder="09XXXXXXXXX" autocomplete="tel" /></FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="email_address">
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><Input v-bind="componentField" type="email" autocomplete="email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField v-slot="{ componentField }" name="social_media_account">
                  <FormItem>
                    <FormLabel>Social Media Account</FormLabel>
                    <FormControl><Input v-bind="componentField" placeholder="e.g. facebook.com/juan" /></FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>

              <FormField v-slot="{ componentField }" name="gsis_beneficiary_relationship">
                <FormItem>
                  <FormLabel>GSIS Beneficiary &amp; Relationship</FormLabel>
                  <FormControl><Input v-bind="componentField" placeholder="e.g. Maria Dela Cruz — Mother" /></FormControl>
                  <FormDescription>The person who receives your GSIS insurance benefit during SPES.</FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>

              <Separator />

              <FormField v-slot="{ componentField }" name="student_category">
                <FormItem>
                  <FormLabel>Student Category <span class="text-destructive">*</span></FormLabel>
                  <Select v-bind="componentField" :disabled="isDisabled">
                    <FormControl>
                      <SelectTrigger class="w-full sm:w-72"><SelectValue placeholder="Select a category" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem v-for="option in studentCategoryOptions" :key="option" :value="option">{{ option }}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField name="parents_status">
                <FormItem>
                  <FormLabel>Parents' Status</FormLabel>
                  <FormDescription>Check all that apply.</FormDescription>
                  <div class="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                    <Label
                      v-for="option in parentsStatusOptions"
                      :key="option"
                      class="flex items-center gap-2 text-sm font-normal"
                    >
                      <Checkbox
                        :model-value="(values.parents_status ?? []).includes(option)"
                        :disabled="isDisabled"
                        @update:model-value="(checked) => toggleParentsStatus(option, checked === true)"
                      />
                      {{ option }}
                    </Label>
                  </div>
                  <FormMessage />
                </FormItem>
              </FormField>

              <Separator />

              <FormField v-slot="{ componentField }" name="municipality">
                <FormItem>
                  <FormLabel>Municipality / City <span class="text-destructive">*</span></FormLabel>
                  <Select v-bind="componentField" :disabled="isDisabled">
                    <FormControl>
                      <SelectTrigger class="w-full sm:w-72"><SelectValue placeholder="Select a municipality" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem v-for="option in municipalityOptions" :key="option" :value="option">{{ option }}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>SPES slots are filled per municipality in Agusan del Sur.</FormDescription>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField v-slot="{ componentField }" name="present_address">
                <FormItem>
                  <FormLabel>Present Address <span class="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input v-bind="componentField" placeholder="House no., street, barangay, municipality, province" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <Label class="flex items-center gap-2 text-sm font-normal">
                <Checkbox v-model="isPermanentSameAsPresent" :disabled="isDisabled" />
                Permanent address is the same as present address
              </Label>

              <FormField v-slot="{ componentField }" name="permanent_address">
                <FormItem>
                  <FormLabel>Permanent Address</FormLabel>
                  <FormControl>
                    <Input
                      v-bind="componentField"
                      placeholder="House no., street, barangay, municipality, province"
                      :readonly="isPermanentSameAsPresent"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </CardContent>
          </Card>

          <!-- ═══ STEP 2: Parents / Guardian ═══ -->
          <Card v-show="currentStep === 2">
            <CardHeader>
              <CardTitle class="text-base">Parents / Guardian Information</CardTitle>
              <CardDescription>Leave blank any details that do not apply.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="space-y-4">
                <h2 class="text-sm font-semibold">Father</h2>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField v-slot="{ componentField }" name="father_name">
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input v-bind="componentField" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" name="father_contact_no">
                    <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl><Input v-bind="componentField" type="tel" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" name="father_occupation">
                    <FormItem>
                      <FormLabel>Occupation</FormLabel>
                      <FormControl><Input v-bind="componentField" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                </div>
              </div>

              <Separator />

              <div class="space-y-4">
                <h2 class="text-sm font-semibold">Mother</h2>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField v-slot="{ componentField }" name="mother_maiden_name">
                    <FormItem>
                      <FormLabel>Maiden Name</FormLabel>
                      <FormControl><Input v-bind="componentField" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" name="mother_contact_no">
                    <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl><Input v-bind="componentField" type="tel" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" name="mother_occupation">
                    <FormItem>
                      <FormLabel>Occupation</FormLabel>
                      <FormControl><Input v-bind="componentField" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                </div>
              </div>
            </CardContent>
          </Card>

          <!-- ═══ STEP 3: Educational Background ═══ -->
          <Card v-show="currentStep === 3">
            <CardHeader>
              <CardTitle class="text-base">Educational Background</CardTitle>
              <CardDescription>Fill up each level you attended. Leave a level blank if it does not apply.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <template v-for="(level, idx) in educationLevels" :key="level.key">
                <Separator v-if="idx > 0" />
                <div class="space-y-4">
                  <h2 class="text-sm font-semibold">{{ level.label }}</h2>
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField v-slot="{ componentField }" :name="`${level.key}_school_name`">
                      <FormItem class="sm:col-span-2">
                        <FormLabel>Name of School</FormLabel>
                        <FormControl><Input v-bind="componentField" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" :name="`${level.key}_degree_course`">
                      <FormItem>
                        <FormLabel>Degree / Course</FormLabel>
                        <FormControl><Input v-bind="componentField" placeholder="If applicable" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" :name="`${level.key}_year_level`">
                      <FormItem>
                        <FormLabel>Year / Grade Level</FormLabel>
                        <FormControl><Input v-bind="componentField" placeholder="e.g. Grade 12, 2nd Year" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                    <FormField v-slot="{ componentField }" :name="`${level.key}_date_of_attendance`">
                      <FormItem>
                        <FormLabel>Date of Attendance</FormLabel>
                        <FormControl><Input v-bind="componentField" placeholder="e.g. 2020 – 2024" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                  </div>
                </div>
              </template>
            </CardContent>
          </Card>

          <!-- ═══ STEP 4: Requirements & History ═══ -->
          <Card v-show="currentStep === 4">
            <CardHeader>
              <template v-if="hasRequirements">
                <CardTitle class="text-base">Documentary Requirements &amp; History</CardTitle>
                <CardDescription>
                  Check the documents you can submit to PESO with this form<template v-if="isAttachmentRequired">
                    and attach a photo or PDF of each one</template>.
                </CardDescription>
              </template>
              <CardTitle v-else class="text-base">Skills &amp; History</CardTitle>
            </CardHeader>
            <CardContent class="space-y-6">
              <!-- Left out when the documents have their own Requirements step (applicant's saved details) -->
              <template v-if="hasRequirements">
              <div class="space-y-3">
                <h2 class="text-sm font-semibold">Documentary Requirements</h2>
                <input ref="replaceInput" type="file" class="hidden" :accept="attachmentAccept" @change="onReplacePicked" />
                <div v-for="doc in documentRequirements" :key="doc.key" class="space-y-2">
                  <FormField v-slot="{ value, handleChange }" :name="doc.key" type="checkbox">
                    <FormItem class="flex items-start gap-3">
                      <FormControl>
                        <Checkbox :model-value="value" :disabled="isDisabled" @update:model-value="handleChange" />
                      </FormControl>
                      <div class="space-y-0.5">
                        <FormLabel class="font-normal">{{ doc.label }}</FormLabel>
                        <FormDescription>{{ doc.hint }}</FormDescription>
                      </div>
                    </FormItem>
                  </FormField>

                  <!-- Attachment for a checked requirement -->
                  <div v-if="values[doc.key]" class="space-y-1.5 pl-7">
                    <Attachment
                      v-if="shownAttachment(doc.key)"
                      :state="shownAttachment(doc.key)!.isPending ? 'idle' : 'done'"
                      class="w-full min-w-0"
                    >
                      <AttachmentMedia :variant="shownAttachment(doc.key)!.previewUrl ? 'image' : 'icon'">
                        <img
                          v-if="shownAttachment(doc.key)!.previewUrl"
                          :src="shownAttachment(doc.key)!.previewUrl!"
                          :alt="doc.label"
                        />

                      </AttachmentMedia>
                      <AttachmentContent class="min-w-0 flex-1">
                        <AttachmentTitle class="block truncate">{{ shownAttachment(doc.key)!.filename }}</AttachmentTitle>
                        <AttachmentDescription>{{ shownAttachment(doc.key)!.description }}</AttachmentDescription>
                      </AttachmentContent>
                      <AttachmentActions>
                        <AttachmentAction
                          v-if="shownAttachment(doc.key)!.openUrl"
                          as-child
                          :aria-label="`Open ${doc.label}`"
                        >
                          <a :href="shownAttachment(doc.key)!.openUrl!" target="_blank" rel="noopener noreferrer">
                            <ExternalLink />
                          </a>
                        </AttachmentAction>
                        <template v-if="!readonly">
                          <AttachmentAction
                            type="button"
                            :aria-label="`Replace ${doc.label}`"
                            :disabled="isSubmitting"
                            @click="pickReplacement(doc.key)"
                          >
                            <RefreshCw />
                          </AttachmentAction>
                          <AttachmentAction
                            v-if="shownAttachment(doc.key)!.isPending"
                            type="button"
                            class="hover:text-destructive"
                            :aria-label="`Remove ${doc.label}`"
                            :disabled="isSubmitting"
                            @click="clearPendingAttachment(doc.key)"
                          >
                            <X />
                          </AttachmentAction>
                        </template>
                      </AttachmentActions>
                    </Attachment>

                    <!-- Drop zone: drag a file in or click to browse -->
                    <label
                      v-else-if="!readonly"
                      class="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition-colors hover:bg-muted/50 has-disabled:cursor-not-allowed has-disabled:opacity-50"
                      :class="{
                        'border-primary bg-primary/5': draggingKey === doc.key,
                        'border-destructive': attachmentErrors[doc.key] && draggingKey !== doc.key,
                      }"
                      @dragover.prevent="draggingKey = doc.key"
                      @dragleave.prevent="draggingKey = null"
                      @drop.prevent="onAttachmentDrop(doc.key, $event)"
                    >
                      <Upload class="size-5 text-muted-foreground" />
                      <span class="text-sm font-medium">
                        Drag &amp; drop or <span class="text-primary">browse</span>
                      </span>
                      <span class="text-xs text-muted-foreground">
                        Image (JPG, PNG, WEBP) or PDF · up to 10 MB<template v-if="!isAttachmentRequired"> · optional</template>
                      </span>
                      <input
                        type="file"
                        class="sr-only"
                        :accept="attachmentAccept"
                        :disabled="isSubmitting"
                        @change="onAttachmentPicked(doc.key, $event)"
                      />
                    </label>

                    <p v-else class="text-xs text-muted-foreground">No file attached</p>

                    <p v-if="attachmentErrors[doc.key]" class="text-sm text-destructive">{{ attachmentErrors[doc.key] }}</p>
                  </div>
                </div>
              </div>

              <Separator />
              </template>

              <div class="space-y-3">
                <h2 class="text-sm font-semibold">Special Skills</h2>
                <div class="flex gap-2">
                  <Input
                    v-model="skillInput"
                    placeholder="e.g. Encoding, Carpentry, Customer service"
                    @keydown.enter.prevent="addSkill"
                  />
                  <Button type="button" variant="outline" :disabled="isDisabled || !skillInput.trim()" @click="addSkill">
                    Add
                  </Button>
                </div>
                <div v-if="values.special_skills?.length" class="flex flex-wrap gap-2">
                  <span
                    v-for="skill in values.special_skills"
                    :key="skill"
                    class="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-sm"
                  >
                    {{ skill }}
                    <button
                      type="button"
                      class="rounded-sm text-muted-foreground hover:text-foreground disabled:pointer-events-none"
                      :aria-label="`Remove ${skill}`"
                      :disabled="isDisabled"
                      @click="removeSkill(skill)"
                    >
                      <X class="size-3.5" />
                    </button>
                  </span>
                </div>
                <p v-else class="text-xs text-muted-foreground">Press Enter or Add after typing each skill.</p>
              </div>

              <Separator />

              <div class="space-y-4">
                <div>
                  <h2 class="text-sm font-semibold">Previous SPES Availments</h2>
                  <p class="text-xs text-muted-foreground">List the times you were a SPES beneficiary before, if any.</p>
                </div>
                <div v-for="slot in availmentSlots" :key="slot" class="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr_1fr]">
                  <FormField v-slot="{ componentField }" :name="`availment_${slot}_establishment`">
                    <FormItem>
                      <FormLabel :class="{ 'sm:sr-only': slot > 1 }">Name of Establishment</FormLabel>
                      <FormControl><Input v-bind="componentField" :aria-label="`Availment ${slot} establishment`" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" :name="`availment_${slot}_year`">
                    <FormItem>
                      <FormLabel :class="{ 'sm:sr-only': slot > 1 }">Year</FormLabel>
                      <FormControl><Input v-bind="componentField" inputmode="numeric" :aria-label="`Availment ${slot} year`" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <FormField v-slot="{ componentField }" :name="`availment_${slot}_spes_id`">
                    <FormItem>
                      <FormLabel :class="{ 'sm:sr-only': slot > 1 }">SPES ID No.</FormLabel>
                      <FormControl><Input v-bind="componentField" :aria-label="`Availment ${slot} SPES ID`" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                </div>
              </div>

              <FormField v-slot="{ componentField }" name="other_dole_interventions">
                <FormItem>
                  <FormLabel>Other DOLE Interventions Availed</FormLabel>
                  <FormControl>
                    <Textarea v-bind="componentField" rows="3" placeholder="e.g. TUPAD 2024, GIP 2025" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </CardContent>
          </Card>

          <!-- ═══ STEP 5: Review & Submit ═══ -->
          <Card v-show="currentStep === 5">
            <CardHeader>
              <CardTitle class="text-base">Review &amp; Submit</CardTitle>
              <CardDescription>Check your answers. Go back to any step to make changes.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <div>
                  <span class="text-xs text-muted-foreground">Full Name</span>
                  <p class="text-sm font-medium">
                    {{ [values.surname, [values.first_name, values.middle_name].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—' }}
                  </p>
                </div>
                <div>
                  <span class="text-xs text-muted-foreground">Date of Birth / Age</span>
                  <p class="text-sm font-medium">
                    {{ values.date_of_birth || '—' }}<template v-if="values.age !== null && values.age !== undefined"> ({{ values.age }})</template>
                  </p>
                </div>
                <div>
                  <span class="text-xs text-muted-foreground">Student Category</span>
                  <p class="text-sm font-medium">{{ values.student_category || '—' }}</p>
                </div>
                <div>
                  <span class="text-xs text-muted-foreground">Contact</span>
                  <p class="text-sm font-medium break-all">
                    {{ [values.contact_number, values.email_address].filter(Boolean).join(' · ') || '—' }}
                  </p>
                </div>
                <div>
                  <span class="text-xs text-muted-foreground">Municipality / City</span>
                  <p class="text-sm font-medium">{{ values.municipality || '—' }}</p>
                </div>
                <div>
                  <span class="text-xs text-muted-foreground">Present Address</span>
                  <p class="text-sm font-medium">{{ values.present_address || '—' }}</p>
                </div>
                <div>
                  <span class="text-xs text-muted-foreground">Schools Listed</span>
                  <p class="text-sm font-medium">
                    {{ educationLevels.filter((level) => values[`${level.key}_school_name`]).map((level) => level.label).join(', ') || 'None' }}
                  </p>
                </div>
                <div v-if="hasRequirements">
                  <span class="text-xs text-muted-foreground">Documents to Submit</span>
                  <p class="text-sm font-medium">
                    {{ documentRequirements.filter((doc) => values[doc.key]).length }} of {{ documentRequirements.length }}
                    <span class="text-xs font-normal text-muted-foreground">
                      ({{ documentRequirements.filter((doc) => values[doc.key] && hasAttachment(doc.key)).length }} attached)
                    </span>
                  </p>
                </div>
              </div>

              <!-- Extra review content from the parent (e.g. the linked account) -->
              <slot name="review" />

              <Separator />

              <div v-if="!readonly" class="space-y-2">
                <Label class="flex items-start gap-2 text-sm font-normal">
                  <Checkbox v-model="hasCertified" class="mt-0.5" :disabled="isSubmitting" />
                  {{ certificationLabel }}
                </Label>
                <p v-if="certificationError" class="text-sm text-destructive">{{ certificationError }}</p>
              </div>
            </CardContent>
          </Card>
        </fieldset>

        <!-- ─── Step Navigation ─── -->
        <div class="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" :disabled="currentStep === 1" @click="prevStep">
            <ArrowLeft class="size-4" />
            Previous
          </Button>

          <Button v-if="currentStep < steps.length" type="button" @click="nextStep">
            Next
            <ArrowRight class="size-4" />
          </Button>
          <Button v-else-if="!readonly" type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 animate-spin" />
            <CheckCircle2 v-else class="size-4" />
            {{ isSubmitting ? submittingLabel : submitLabel }}
          </Button>
        </div>
      </div>
    </div>
  </form>
</template>
