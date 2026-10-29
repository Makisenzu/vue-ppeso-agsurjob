<script setup lang="ts">
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  UsersRound,
  X,
} from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import JobVacancyFields from '@/components/JobVacancyFields.vue'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { getVacancyStatusBadgeClass } from '@/helpers/peso/provincialPeso/jobFairHelper'
import SwipeCardList from '@/components/SwipeCardList.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { useRecruitmentActivityDetails } from '@/composables/peso/provincialPeso/useRecruitmentActivityDetails'
import { useRecruitmentActivityVacancyForm } from '@/composables/peso/provincialPeso/useRecruitmentActivityVacancyForm'
import type { RecruitmentActivityStatus } from '@/types/peso/provincialPeso/recruitmentActivity'

const {
  activity,
  vacancies,
  isLoading,
  errorMessage,
  isUpdatingActivity,
  refreshActivity,
  isSra,
  typeLabel,
  schedule,
  statusClass,
  terminalReportDueLabel,
  terminalReportDueDate,
  agencyAddress,
  assessedAt,
  conoIssuedAt,
  beforeRequirements,
  afterRequirements,
  beforeDoneCount,
  isRequirementBusy,
  isLockedRequirement,
  onRequirementCheckedChange,
  onDocumentInputChange,
  deleteDocument,
  openDocument,
  formatDateTime,
  formatFileSize,
  documentAccept,
  documentMaxSizeMB,
  statusOptions,
  pendingStatus,
  statusRemarks,
  statusRemarksError,
  isStatusRemarksRequired,
  isStatusDialogOpen,
  requestStatusChange,
  confirmStatusChange,
  conoNumber,
  recruitmentFee,
  feeOrNumber,
  sraFeeError,
  isSraDirty,
  saveSraDetails,
  totalOpenings,
  vacancyToDelete,
  isDeletingVacancy,
  isVacancyDeleteDialogOpen,
  openCreateVacancyDialog,
  openEditVacancyDialog,
  requestVacancyDelete,
  confirmVacancyDelete,
  getVacancyCard,
  getVacancySwipeActions,
} = useRecruitmentActivityDetails()

const {
  isVacancyFormOpen,
  isSubmittingVacancy,
  isEditMode: isVacancyEditMode,
  onVacancyDialogOpenChange,
  submitVacancy,
} = useRecruitmentActivityVacancyForm()
</script>

<template>
  <div class="w-full min-w-0 space-y-4">
    <div class="flex items-center justify-between gap-2">
      <Button variant="ghost" size="sm" class="-ml-2" as-child>
        <AppLink :to="{ name: 'provincial-peso-recruitment-activity' }">
          <ArrowLeft class="size-4" />
          Back to Recruitment Activities
        </AppLink>
      </Button>
      <Button variant="outline" size="sm" :disabled="isLoading" @click="refreshActivity">
        <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
        <span class="hidden sm:inline">Refresh</span>
      </Button>
    </div>

    <!-- Error Banner -->
    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <!-- Overview -->
    <Card v-if="isLoading && !activity">
      <CardContent class="space-y-3">
        <Skeleton class="h-7 w-2/3" />
        <Skeleton class="h-4 w-1/2" />
        <Skeleton class="h-4 w-1/3" />
      </CardContent>
    </Card>

    <template v-else-if="activity">
      <Card>
        <CardContent class="space-y-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{{ activity.establishment.business_name }}</h1>
                <Badge variant="outline">{{ activity.type }}</Badge>
                <Badge variant="outline" :class="statusClass">{{ activity.status }}</Badge>
              </div>
              <p class="text-sm text-muted-foreground">{{ typeLabel }}</p>
              <p v-if="terminalReportDueLabel" class="text-sm font-medium text-warning">
                {{ terminalReportDueLabel }} ({{ terminalReportDueDate }})
              </p>
            </div>

            <!-- Status: current status plus the ones it can move to -->
            <div class="flex shrink-0 items-center gap-2">
              <Label for="activity-status" class="text-sm text-muted-foreground">Status</Label>
              <SearchSelect
                :model-value="activity.status"
                :disabled="isUpdatingActivity"
                @update:model-value="(value) => requestStatusChange(value as RecruitmentActivityStatus)"
                :options="statusOptions"
                id="activity-status"
                class="w-44"
              />
              <Loader2 v-if="isUpdatingActivity" class="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>

          <dl class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div class="flex items-start gap-2">
              <CalendarDays class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <dt class="text-xs text-muted-foreground">Date of Conduct</dt>
                <dd class="font-medium">{{ schedule }}</dd>
              </div>
            </div>
            <div class="flex items-start gap-2">
              <MapPin class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div class="min-w-0">
                <dt class="text-xs text-muted-foreground">Venue</dt>
                <dd class="font-medium">
                  {{ [activity.venue, activity.city_municipality].filter(Boolean).join(', ') || '—' }}
                </dd>
              </div>
            </div>
            <div class="flex items-start gap-2">
              <UsersRound class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div class="min-w-0">
                <dt class="text-xs text-muted-foreground">Representatives</dt>
                <dd class="font-medium">{{ activity.representatives.join(', ') || '—' }}</dd>
              </div>
            </div>
          </dl>

          <Separator />

          <dl class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt class="text-xs text-muted-foreground">Agency Address</dt>
              <dd>{{ agencyAddress }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Contact</dt>
              <dd>
                {{
                  [activity.establishment.contact_person_name, activity.establishment.mobile_number || activity.establishment.email_address]
                    .filter(Boolean)
                    .join(' · ') || '—'
                }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Assessed</dt>
              <dd>{{ activity.assessed_at ? assessedAt : 'Not yet approved' }}</dd>
            </div>
            <div v-if="activity.remarks" class="sm:col-span-2 lg:col-span-3">
              <dt class="text-xs text-muted-foreground">Remarks</dt>
              <dd class="whitespace-pre-line">{{ activity.remarks }}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <!-- SRA: CONO and recruitment fee -->
      <Card v-if="isSra">
        <CardHeader>
          <CardTitle class="text-base">CONO and Recruitment Fee</CardTitle>
          <CardDescription>The CONO number is required before the SRA can be approved.</CardDescription>
        </CardHeader>
        <CardContent>
          <form class="grid gap-4 sm:grid-cols-3" @submit.prevent="saveSraDetails">
            <div class="grid gap-2">
              <Label for="cono-number">CONO / SRA No.</Label>
              <Input id="cono-number" v-model="conoNumber" placeholder="e.g. SRA-2026-0001" :disabled="isUpdatingActivity" />
              <p v-if="activity.cono_number" class="text-xs text-muted-foreground">Issued {{ conoIssuedAt }}</p>
            </div>
            <div class="grid gap-2">
              <Label for="recruitment-fee">Recruitment Fee (₱)</Label>
              <Input
                id="recruitment-fee"
                v-model="recruitmentFee"
                type="number"
                min="0"
                step="0.01"
                :disabled="isUpdatingActivity"
                :aria-invalid="!!sraFeeError"
              />
              <p v-if="sraFeeError" class="text-xs text-destructive">{{ sraFeeError }}</p>
              <p v-else class="text-xs text-muted-foreground">Ord. 6 s. 1994</p>
            </div>
            <div class="grid gap-2">
              <Label for="fee-or-number">Official Receipt No.</Label>
              <Input id="fee-or-number" v-model="feeOrNumber" placeholder="OR number" :disabled="isUpdatingActivity" />
            </div>
            <div class="sm:col-span-3 flex justify-end">
              <Button type="submit" size="sm" :disabled="isUpdatingActivity || !isSraDirty || !!sraFeeError">
                <Loader2 v-if="isUpdatingActivity" class="size-4 animate-spin" />
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <!-- Checklist of Requirements -->
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Checklist of Requirements</CardTitle>
          <CardDescription>
            Tick a requirement once it is submitted. Uploading a file ticks it automatically. Images or PDF, up to
            {{ documentMaxSizeMB }}MB each.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <section
            v-for="group in [
              {
                key: 'before',
                title: isSra ? 'Before issuance of CONO / approval of SRA' : 'Before the conduct of LRA',
                items: beforeRequirements,
              },
              { key: 'after', title: `After the conduct of ${activity.type}`, items: afterRequirements },
            ]"
            :key="group.key"
            class="space-y-2"
          >
            <div class="flex items-baseline justify-between gap-2">
              <h3 class="text-sm font-semibold">{{ group.title }}</h3>
              <span v-if="group.key === 'before'" class="text-xs text-muted-foreground tabular-nums">
                {{ beforeDoneCount }} / {{ beforeRequirements.length }} submitted
              </span>
            </div>

            <p v-if="group.items.length === 0" class="text-sm text-muted-foreground">No requirements in this stage.</p>

            <ul class="divide-y divide-border rounded-md border">
              <li v-for="requirement in group.items" :key="requirement.id" class="space-y-2 p-3">
                <div class="flex items-start gap-3">
                  <Checkbox
                    :id="`requirement-${requirement.id}`"
                    class="mt-0.5"
                    :model-value="requirement.is_submitted"
                    :disabled="isRequirementBusy(requirement) || isLockedRequirement(requirement)"
                    @update:model-value="onRequirementCheckedChange(requirement, $event)"
                  />
                  <div class="min-w-0 flex-1">
                    <Label :for="`requirement-${requirement.id}`" class="font-medium leading-snug">
                      {{ requirement.requirement_name }}
                    </Label>
                    <p v-if="requirement.is_submitted && requirement.checked_at" class="text-xs text-muted-foreground">
                      Checked {{ formatDateTime(requirement.checked_at) }}
                    </p>
                  </div>

                  <Loader2 v-if="isRequirementBusy(requirement)" class="size-4 shrink-0 animate-spin text-muted-foreground" />
                  <label
                    class="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted has-disabled:cursor-not-allowed has-disabled:opacity-50"
                  >
                    <Upload class="size-3.5" />
                    Upload
                    <input
                      type="file"
                      class="sr-only"
                      multiple
                      :accept="documentAccept"
                      :disabled="isRequirementBusy(requirement)"
                      @change="onDocumentInputChange(requirement, $event)"
                    >
                  </label>
                </div>

                <ul v-if="requirement.recruitment_activity_attachments.length" class="ml-7 flex flex-wrap gap-2">
                  <li
                    v-for="attachment in requirement.recruitment_activity_attachments"
                    :key="attachment.id"
                    class="flex max-w-full items-center gap-1 rounded-md border bg-muted/40 pl-2 text-xs"
                  >
                    <FileText class="size-3.5 shrink-0 text-muted-foreground" />
                    <button
                      type="button"
                      class="truncate py-1 text-left hover:text-primary hover:underline"
                      :title="`Open ${attachment.filename}`"
                      @click="openDocument(attachment)"
                    >
                      {{ attachment.filename }}
                    </button>
                    <span v-if="attachment.size" class="shrink-0 text-muted-foreground">{{ formatFileSize(attachment.size) }}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                      :aria-label="`Remove ${attachment.filename}`"
                      :disabled="isRequirementBusy(requirement)"
                      @click="deleteDocument(requirement, attachment)"
                    >
                      <X class="size-3.5" />
                    </Button>
                  </li>
                </ul>
              </li>
            </ul>
          </section>
        </CardContent>
      </Card>

      <!-- Job Orders -->
      <Card>
        <CardHeader class="flex flex-row items-start justify-between gap-3">
          <div class="space-y-1.5">
            <CardTitle class="text-base">Vacancies</CardTitle>
            <CardDescription class="tabular-nums">
              {{ vacancies.length }} position(s) · {{ totalOpenings }} opening(s)
            </CardDescription>
          </div>
          <Button size="sm" @click="openCreateVacancyDialog">
            <Plus class="size-4" />
            Add Vacancy
          </Button>
        </CardHeader>
        <CardContent>
          <Empty v-if="vacancies.length === 0" class="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BriefcaseBusiness />
              </EmptyMedia>
              <EmptyTitle>No vacancy yet</EmptyTitle>
              <EmptyDescription>Add the positions the agency is recruiting for in this activity.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" @click="openCreateVacancyDialog">
                <Plus class="size-4" />
                Add Vacancy
              </Button>
            </EmptyContent>
          </Empty>

          <template v-else>
            <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
            <SwipeCardList
              class="md:hidden"
              :items="vacancies"
              :item-key="(row) => row.id"
              :card="getVacancyCard"
              :actions="getVacancySwipeActions"
              hint="Swipe left on a vacancy for actions."
            />

            <!-- Desktop: table -->
            <div class="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Nature of Work</TableHead>
                  <TableHead class="text-center">Openings</TableHead>
                  <TableHead v-if="isSra">Jobsite Country</TableHead>
                  <TableHead>Vacancy Number</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead class="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="row in vacancies" :key="row.id">
                  <TableCell class="min-w-[180px]">
                    <div class="font-medium">{{ row.position_title }}</div>
                    <div v-if="row.educational_level" class="text-xs text-muted-foreground">{{ row.educational_level }}</div>
                  </TableCell>
                  <TableCell class="text-sm">{{ row.nature_of_work }}</TableCell>
                  <TableCell class="text-center text-sm font-medium tabular-nums">{{ row.vacancy_count ?? '—' }}</TableCell>
                  <TableCell v-if="isSra" class="text-sm">{{ row.destination_country || '—' }}</TableCell>
                  <TableCell class="text-sm">{{ row.job_order_number || '—' }}</TableCell>
                  <TableCell class="text-sm">{{ row.salary || '—' }}</TableCell>
                  <TableCell>
                    <Badge variant="outline" class="capitalize" :class="getVacancyStatusBadgeClass(row.status)">
                      {{ row.status }}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div class="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" class="size-8" title="Edit" aria-label="Edit" @click="openEditVacancyDialog(row)">
                        <Pencil class="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Remove"
                        aria-label="Remove"
                        @click="requestVacancyDelete(row)"
                      >
                        <Trash2 class="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            </div>
          </template>
        </CardContent>
      </Card>
    </template>
  </div>

  <!-- Add / Edit Job Order -->
  <Dialog :open="isVacancyFormOpen" @update:open="onVacancyDialogOpenChange">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <form class="grid gap-5" @submit="submitVacancy">
        <DialogHeader>
          <DialogTitle>{{ isVacancyEditMode ? 'Edit Vacancy' : 'Add Vacancy' }}</DialogTitle>
          <DialogDescription>
            Complete every detail of the position. It is saved to the agency's vacancies as this activity's job order.
          </DialogDescription>
        </DialogHeader>

        <JobVacancyFields :disabled="isSubmittingVacancy">
          <template #position>
            <FormField v-if="isSra" v-slot="{ componentField }" name="destinationCountry">
              <FormItem>
                <FormLabel>Jobsite Country</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" placeholder="e.g. Singapore" :disabled="isSubmittingVacancy" />
                </FormControl>
                <FormDescription>Job orders must be accredited by the DMW.</FormDescription>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="jobOrderNumber">
              <FormItem>
                <FormLabel>Job Order No. <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
                <FormControl>
                  <Input v-bind="componentField" placeholder="Job order number" :disabled="isSubmittingVacancy" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </template>
        </JobVacancyFields>

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="isSubmittingVacancy" @click="onVacancyDialogOpenChange(false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmittingVacancy">
            <Loader2 v-if="isSubmittingVacancy" class="size-4 animate-spin" />
            {{ isSubmittingVacancy ? 'Saving...' : isVacancyEditMode ? 'Save Changes' : 'Add Vacancy' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <!-- Remove Job Order -->
  <AlertDialog v-model:open="isVacancyDeleteDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove job order?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong class="font-medium text-foreground">{{ vacancyToDelete?.position_title }}</strong> will be removed from
          this activity and deleted from the agency's vacancies, unless a job fair still lists it.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isDeletingVacancy">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isDeletingVacancy" @click="confirmVacancyDelete">
          <Loader2 v-if="isDeletingVacancy" class="size-4 shrink-0 animate-spin" />
          {{ isDeletingVacancy ? 'Removing...' : 'Remove Vacancy' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- Confirm cancel / return to pending -->
  <AlertDialog v-model:open="isStatusDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ pendingStatus === 'Cancelled' ? 'Cancel this activity?' : 'Return to Pending?' }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{
            pendingStatus === 'Cancelled'
              ? 'The activity will be marked as Cancelled. Its checklist and job orders are kept, and it can be reopened later.'
              : 'The approval and its assessment stamp will be cleared. The activity must be approved again before it is conducted.'
          }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <!-- Required for Cancelled; sent to the agency in their notification -->
      <div v-if="isStatusRemarksRequired" class="space-y-2">
        <Label for="activity-cancel-remarks">Remarks <span class="text-destructive">*</span></Label>
        <Textarea
          id="activity-cancel-remarks"
          v-model="statusRemarks"
          rows="3"
          placeholder="Why the activity is cancelled"
          :aria-invalid="!!statusRemarksError"
          :disabled="isUpdatingActivity"
        />
        <p v-if="statusRemarksError" class="text-sm text-destructive">{{ statusRemarksError }}</p>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isUpdatingActivity">Keep Current Status</AlertDialogCancel>
        <Button
          :variant="pendingStatus === 'Cancelled' ? 'destructive' : 'default'"
          class="cursor-pointer"
          :disabled="isUpdatingActivity"
          @click="confirmStatusChange"
        >
          <Loader2 v-if="isUpdatingActivity" class="size-4 shrink-0 animate-spin" />
          {{ pendingStatus === 'Cancelled' ? 'Cancel Activity' : 'Return to Pending' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
