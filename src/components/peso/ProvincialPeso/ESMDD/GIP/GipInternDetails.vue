<script setup lang="ts">
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CheckIcon,
  ChevronsUpDownIcon,
  Download,
  Eye,
  FileText,
  IdCard,
  ImageOff,
  Loader2,
  Pencil,
  Printer,
  Upload,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxViewport,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxGroup,
  ComboboxItemIndicator,
} from '@/components/ui/combobox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar } from '@/components/ui/avatar'
import SearchSelect from '@/components/SearchSelect.vue'
import { cn } from '@/lib/utils'
import pgasLogo from '@/assets/images/agsur.png'
import doleLogo from '@/assets/images/dole.png'
import GipInternAccomplishments from '@/components/peso/ProvincialPeso/ESMDD/GIP/GipInternAccomplishments.vue'
import { useGipInternDetails } from '@/composables/peso/provincialPeso/useGipInternDetails'
import { getGipStatusBadgeClass } from '@/helpers/peso/provincialPeso/gipHelper'
import { useTemplateRef } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useGipIdCard } from '@/composables/peso/provincialPeso/useGipIdCard'

const {
  intern,
  isLoading,
  LPII_CONFIG,
  internDetailFields,
  internDocuments,
  isLoadingDocuments,
  hasDocumentsError,
  downloadingDocumentId,
  viewDocument,
  downloadFile,
  formatDocumentSize,
  goBack,
  openRenewalPage,
  isEditingIntern,
  isUpdatingIntern,
  editForm,
  startEdit,
  cancelEdit,
  saveEdit,
  setEditProgram,
  officeSearchQuery,
  filteredOffices,
  selectedOffice,
  isLoadingOffices,
  deploymentStartDate,
  deploymentEndDate,
  formattedPeriod,
  formatCalendarDate,
} = useGipInternDetails()

// Generate ID: nickname + optional photo, then a print preview laid out like GIP_ID.docx
const {
  isOpen: isIdOpen,
  step: idStep,
  nickname: idNickname,
  nicknameMax: idNicknameMax,
  nicknameError: idNicknameError,
  profilePhotoUrl: idProfilePhotoUrl,
  photoSource: idPhotoSource,
  photoUrl: idPhotoUrl,
  photoError: idPhotoError,
  isLoadingPhoto: isLoadingIdPhoto,
  previewSvg: idPreviewSvg,
  isGenerating: isGeneratingId,
  isPrinting: isPrintingId,
  open: openIdDialog,
  onPhotoSelected: onIdPhotoSelected,
  setPhotoSource: setIdPhotoSource,
  generate: generateId,
  print: printId,
  backToForm: backToIdForm,
} = useGipIdCard(intern)

const idPhotoInput = useTemplateRef<HTMLInputElement>('idPhotoInput')

const programOptions = [
  { value: 'PGAS', label: 'PGAS', logo: pgasLogo, description: 'Provincial · ₱479.35/day' },
  { value: 'DOLE', label: 'DOLE', logo: doleLogo, description: 'National · ₱475/day' },
] as const

const statusOptions = [
  { value: 'Active', label: 'Active (Ongoing Deployment)' },
  { value: 'Hired', label: 'Hired (Absorbed / Employed)' },
  { value: 'Completed', label: 'Completed (Finished Term)' },
  { value: 'Resigned', label: 'Resigned (Left Early)' },
]
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0 space-y-1">
        <Button variant="ghost" size="sm" class="-ml-2 cursor-pointer" :disabled="isUpdatingIntern" @click="goBack">
          <ArrowLeft class="size-4 shrink-0" />
          Back to Interns
        </Button>
        <template v-if="intern">
          <h1 class="truncate text-2xl font-bold tracking-tight sm:text-3xl">{{ intern.fullName }}</h1>
          <p class="text-sm text-muted-foreground">
            <span class="font-mono">{{ intern.code }}</span>
            · GIP {{ intern.program }} Intern
            <template v-if="isEditingIntern"> · Editing deployment</template>
          </p>
        </template>
        <template v-else-if="isLoading">
          <Skeleton class="h-8 w-64" />
          <Skeleton class="h-5 w-48" />
        </template>
      </div>

      <div v-if="intern && !isEditingIntern" class="flex flex-wrap items-center gap-2">
        <Button variant="outline" class="cursor-pointer" @click="openIdDialog">
          <IdCard class="size-4 shrink-0" />
          Generate ID
        </Button>
        <Button variant="outline" class="cursor-pointer" @click="startEdit">
          <Pencil class="size-4 shrink-0" />
          Edit
        </Button>
        <Button v-if="intern.status === 'Active'" class="cursor-pointer" @click="openRenewalPage">
          Renew / Conclude Term
        </Button>
      </div>
    </div>

    <!-- ─── Loading (opened directly, registry not loaded yet) ─── -->
    <div v-if="!intern && isLoading" class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Skeleton class="h-72 w-full lg:col-span-2" />
      <Skeleton class="h-40 w-full" />
    </div>

    <!-- ─── Not found ─── -->
    <Card v-else-if="!intern">
      <CardContent>
        <Empty class="py-10">
          <EmptyHeader>
            <EmptyTitle>Intern not found</EmptyTitle>
            <EmptyDescription>This GIP intern record may have been removed.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" variant="outline" class="cursor-pointer" @click="goBack">Back to Interns</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>

    <template v-else>
      <!-- Summary -->
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline" :class="getGipStatusBadgeClass(intern.status)">
          {{ intern.status }}
        </Badge>
        <Badge variant="outline" :class="LPII_CONFIG[intern.lpiiTag].badgeClass">
          {{ LPII_CONFIG[intern.lpiiTag].label }}
        </Badge>
        <span class="text-muted-foreground">
          Brgy. {{ intern.barangay }}, {{ intern.municipality }}
        </span>
      </div>

      <!-- ─── Read-only ─── -->
      <div v-if="!isEditingIntern" class="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card class="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle class="text-base">Deployment Information</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" class="cursor-pointer" @click="startEdit">Edit</Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <div v-for="field in internDetailFields" :key="field.label" class="min-w-0">
                <span class="text-xs text-muted-foreground">{{ field.label }}</span>
                <p :class="['text-sm font-medium', field.mono && 'font-mono']">{{ field.value || '—' }}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="min-w-0">
          <CardHeader>
            <CardTitle class="text-base">Documents Submitted</CardTitle>
            <CardDescription>Open or download the soft copies the applicant uploaded.</CardDescription>
          </CardHeader>
          <CardContent class="grid gap-3">
            <div v-if="isLoadingDocuments" class="grid gap-2">
              <Skeleton v-for="n in 3" :key="n" class="h-12 w-full" />
            </div>

            <template v-else>
              <p v-if="hasDocumentsError" class="text-sm text-destructive">
                The uploaded files could not be loaded. Refresh the page to try again.
              </p>

              <ul v-if="internDocuments.length > 0" class="divide-y rounded-lg border">
                <li v-for="doc in internDocuments" :key="doc.name" class="flex items-center gap-3 px-3 py-2">
                  <FileText class="size-4 shrink-0 text-muted-foreground" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium">{{ doc.name }}</p>
                    <p v-if="doc.file" class="truncate text-xs text-muted-foreground" :title="doc.file.file_name">
                      {{ doc.file.file_name }}<template v-if="doc.file.size != null"> · {{ formatDocumentSize(doc.file.size) }}</template>
                    </p>
                    <p v-else class="text-xs text-muted-foreground">Marked submitted · no soft copy uploaded</p>
                  </div>
                  <div v-if="doc.file" class="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      class="cursor-pointer"
                      :aria-label="`View ${doc.name}`"
                      title="View"
                      @click="viewDocument(doc.file)"
                    >
                      <Eye class="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      class="cursor-pointer"
                      :aria-label="`Download ${doc.name}`"
                      title="Download"
                      :disabled="downloadingDocumentId !== null"
                      @click="downloadFile(doc.file)"
                    >
                      <Loader2 v-if="downloadingDocumentId === doc.file.id" class="size-4 animate-spin" />
                      <Download v-else class="size-4" />
                    </Button>
                  </div>
                </li>
              </ul>
              <p v-else-if="!hasDocumentsError" class="text-sm text-muted-foreground">No documents submitted yet.</p>
            </template>
          </CardContent>
        </Card>

        <!-- Accomplishment reports from the GIP portal (migration 112), full width -->
        <div class="min-w-0 lg:col-span-3">
          <GipInternAccomplishments :intern="intern" />
        </div>
      </div>

      <!-- ─── Edit Mode ─── -->
      <Card v-else class="min-w-0">
        <CardHeader>
          <CardTitle class="text-base">Edit Deployment</CardTitle>
          <CardDescription>Update the intern's program, station, supervisor, stipend, period and status.</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4">
          <!-- Funding Program -->
          <div class="grid gap-2">
            <Label>Funding Program</Label>
            <div role="radiogroup" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                v-for="opt in programOptions"
                :key="opt.value"
                type="button"
                role="radio"
                :aria-checked="editForm.program === opt.value"
                :class="[
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                  editForm.program === opt.value ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted/50',
                ]"
                @click="setEditProgram(opt.value)"
              >
                <Avatar class="size-8 shrink-0 rounded-md border bg-background">
                  <img :src="opt.logo" :alt="opt.label" class="object-cover" />
                </Avatar>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2 text-sm font-semibold">
                    {{ opt.label }}
                    <CheckCircle2 v-if="editForm.program === opt.value" class="size-4 shrink-0 text-primary" />
                  </div>
                  <p class="text-xs text-muted-foreground">{{ opt.description }}</p>
                </div>
              </button>
            </div>
          </div>

          <!-- Assigned Office -->
          <div class="grid min-w-0 gap-2">
            <Label>Assigned Office / Station</Label>
            <Combobox
              v-model="selectedOffice"
              v-model:search-term="officeSearchQuery"
              class="min-w-0"
              :ignore-filter="true"
              by="id"
            >
              <ComboboxAnchor as-child>
                <ComboboxTrigger as-child>
                  <Button
                    type="button"
                    variant="outline"
                    class="w-full justify-between overflow-hidden font-normal"
                    :disabled="isLoadingOffices"
                  >
                    <span class="min-w-0 flex-1 truncate text-left">
                      <template v-if="isLoadingOffices">Loading offices...</template>
                      <template v-else-if="selectedOffice">{{ selectedOffice.office_name }}</template>
                      <span v-else :class="!editForm.assignedOffice && 'text-muted-foreground'">
                        {{ editForm.assignedOffice || 'Select office...' }}
                      </span>
                    </span>
                    <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
                  </Button>
                </ComboboxTrigger>
              </ComboboxAnchor>

              <ComboboxList>
                <ComboboxInput
                  placeholder="Search offices..."
                  @input="officeSearchQuery = ($event.target as HTMLInputElement).value"
                />
                <ComboboxViewport>
                  <ComboboxEmpty>No office found.</ComboboxEmpty>
                  <ComboboxGroup>
                    <ComboboxItem v-for="office in filteredOffices" :key="office.id" :value="office">
                      <span class="min-w-0 flex-1 truncate">{{ office.office_name }}</span>
                      <Badge variant="secondary" class="shrink-0">{{ office.office_code }}</Badge>
                      <ComboboxItemIndicator>
                        <CheckIcon class="size-4 shrink-0" />
                      </ComboboxItemIndicator>
                    </ComboboxItem>
                  </ComboboxGroup>
                </ComboboxViewport>
              </ComboboxList>
            </Combobox>
          </div>

          <!-- Supervisor & Stipend -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <Label for="editSupervisor">Designated Supervisor</Label>
              <Input
                id="editSupervisor"
                v-model="editForm.supervisor"
                placeholder="e.g. Maria Santos"
                :class="selectedOffice?.office_head ? 'bg-muted/40' : ''"
                :readonly="!!selectedOffice?.office_head"
              />
              <p v-if="selectedOffice?.office_head" class="text-xs text-muted-foreground">
                Auto-filled from office directory
              </p>
            </div>

            <div class="grid gap-2">
              <Label for="editStipend">Stipend Rate</Label>
              <Input id="editStipend" v-model="editForm.stipend" placeholder="e.g. ₱479.35 / day" class="font-mono" />
            </div>
          </div>

          <!-- Deployment Period -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="grid gap-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger as-child>
                  <Button
                    type="button"
                    variant="outline"
                    :class="cn('w-full justify-start font-normal', !deploymentStartDate && 'text-muted-foreground')"
                  >
                    <CalendarDays class="size-4 shrink-0" />
                    {{ deploymentStartDate ? formatCalendarDate(deploymentStartDate) : 'Pick start date' }}
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0" align="start">
                  <Calendar v-model="deploymentStartDate" initial-focus />
                </PopoverContent>
              </Popover>
            </div>

            <div class="grid gap-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger as-child>
                  <Button
                    type="button"
                    variant="outline"
                    :class="cn('w-full justify-start font-normal', !deploymentEndDate && 'text-muted-foreground')"
                  >
                    <CalendarDays class="size-4 shrink-0" />
                    {{ deploymentEndDate ? formatCalendarDate(deploymentEndDate) : 'Pick end date' }}
                  </Button>
                </PopoverTrigger>
                <PopoverContent class="w-auto p-0" align="start">
                  <Calendar v-model="deploymentEndDate" :min-value="deploymentStartDate ?? undefined" initial-focus />
                </PopoverContent>
              </Popover>
            </div>

            <p v-if="formattedPeriod" class="text-sm text-muted-foreground sm:col-span-2">
              Period: <span class="font-medium text-foreground">{{ formattedPeriod }}</span>
            </p>
          </div>

          <!-- Status -->
          <div class="grid gap-2">
            <Label for="editStatus">Deployment Status</Label>
            <SearchSelect
              id="editStatus"
              v-model="editForm.status"
              :options="statusOptions"
              class="w-full sm:w-80"
            />
          </div>
        </CardContent>
        <CardFooter class="flex flex-col-reverse gap-3 border-t sm:flex-row sm:justify-end">
          <Button variant="outline" class="cursor-pointer" :disabled="isUpdatingIntern" @click="cancelEdit">
            Cancel
          </Button>
          <Button class="cursor-pointer" :disabled="isUpdatingIntern" @click="saveEdit">
            <Loader2 v-if="isUpdatingIntern" class="size-4 shrink-0 animate-spin" />
            {{ isUpdatingIntern ? 'Saving...' : 'Save Changes' }}
          </Button>
        </CardFooter>
      </Card>
    </template>

    <!-- ─── Generate ID: nickname and photo, then the printable ID ─── -->
    <Dialog v-model:open="isIdOpen">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate ID</DialogTitle>
          <DialogDescription class="sr-only">The intern's nickname and photo for the GIP ID.</DialogDescription>
        </DialogHeader>

        <form v-if="idStep === 'form'" class="grid gap-4" novalidate @submit.prevent="generateId">
          <div class="grid gap-2">
            <Label for="gip-id-nickname">Nickname</Label>
            <Input
              id="gip-id-nickname"
              v-model="idNickname"
              :maxlength="idNicknameMax"
              autocomplete="off"
              placeholder="e.g. Kate"
              :aria-invalid="!!idNicknameError"
            />
            <p v-if="idNicknameError" class="text-sm text-destructive">{{ idNicknameError }}</p>
          </div>

          <div class="grid gap-2">
            <Label>Photo <span class="font-normal text-muted-foreground">(optional)</span></Label>
            <div class="flex items-center gap-4">
              <div class="flex h-28 w-[5.6rem] shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                <img v-if="idPhotoUrl" :src="idPhotoUrl" alt="ID photo" class="size-full object-cover" />
                <Loader2 v-else-if="isLoadingIdPhoto" class="size-5 animate-spin text-muted-foreground" />
                <ImageOff v-else class="size-5 text-muted-foreground" />
              </div>
              <div class="flex flex-col items-start gap-2">
                <Button type="button" variant="outline" size="sm" class="cursor-pointer" @click="idPhotoInput?.click()">
                  <Upload class="size-4 shrink-0" />
                  Upload Photo
                </Button>
                <Button
                  v-if="idProfilePhotoUrl && idPhotoSource !== 'profile'"
                  type="button"
                  variant="outline"
                  size="sm"
                  class="cursor-pointer"
                  @click="setIdPhotoSource('profile')"
                >
                  Use Profile Picture
                </Button>
                <Button v-if="idPhotoSource !== 'none'" type="button" variant="ghost" size="sm" class="cursor-pointer" @click="setIdPhotoSource('none')">
                  No Photo
                </Button>
              </div>
              <input
                ref="idPhotoInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                @change="onIdPhotoSelected"
              />
            </div>
            <p v-if="idPhotoError" class="text-sm text-destructive">{{ idPhotoError }}</p>
          </div>

          <DialogFooter class="gap-2">
            <Button type="button" variant="outline" class="cursor-pointer" @click="isIdOpen = false">Cancel</Button>
            <Button type="submit" class="cursor-pointer" :disabled="isGeneratingId || isLoadingIdPhoto">
              <Loader2 v-if="isGeneratingId" class="size-4 shrink-0 animate-spin" />
              Generate
            </Button>
          </DialogFooter>
        </form>

        <template v-else>
          <!-- Built from escaped text and app asset URLs only (gipIdHelper) -->
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="mx-auto w-full max-w-[280px] border shadow-sm [&_svg]:h-auto [&_svg]:w-full" v-html="idPreviewSvg" />
          <DialogFooter class="gap-2">
            <Button type="button" variant="outline" class="cursor-pointer" :disabled="isPrintingId" @click="backToIdForm">Back</Button>
            <Button type="button" class="cursor-pointer" :disabled="isPrintingId" @click="printId">
              <Loader2 v-if="isPrintingId" class="size-4 shrink-0 animate-spin" />
              <Printer v-else class="size-4 shrink-0" />
              Print
            </Button>
          </DialogFooter>
        </template>
      </DialogContent>
    </Dialog>
  </div>
</template>
