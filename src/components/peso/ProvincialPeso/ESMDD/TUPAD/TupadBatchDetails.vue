<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { RouterLink } from 'vue-router'
import { ChevronLeft, ExternalLink, FileText, Loader2, Pencil, Plus, RefreshCw, UserPlus, Users } from '@lucide/vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import TupadBatchDialog from '@/components/peso/ProvincialPeso/ESMDD/TUPAD/TupadBatchDialog.vue'
import { useTupadBatchDetails } from '@/composables/peso/provincialPeso/useTupadBatchDetails'
import {
  formatTupadApplicantName,
  formatTupadDate,
  formatTupadFileSize,
  formatTupadIncome,
  formatTupadContact,
  formatTupadMemberName,
  formatTupadSex,
  getTupadAge,
  getTupadBarangay,
  formatTupadPeriod,
  formatTupadUploadTime,
  getTupadDayStatusMeta,
  getTupadMunicipality,
  getTupadStatusBadgeClass,
} from '@/helpers/peso/provincialPeso/tupadHelper'

const {
  table,
  columns,
  currentBatch,
  members,
  memberStats,
  isLoading,
  errorMessage,
  isSubmitting,
  isDeleting,
  canAddApplicants,
  reload,
  editCurrentBatch,
  isAddMembersOpen,
  eligibleApplicants,
  filteredEligible,
  pickerSearch,
  selectedIds,
  daysDuration,
  isDaysValid,
  canSubmitAdd,
  allFilteredSelected,
  readyFiltered,
  notReadyCount,
  isTupadBatchReady,
  getTupadBatchMissingRequirements,
  isSelected,
  toggleSelected,
  toggleAllFiltered,
  openAddApplicants,
  onAddApplicantsOpenChange,
  submitAddApplicants,
  editingMember,
  isEditMemberOpen,
  statusOptions,
  onEditMemberOpenChange,
  submitMember,
  viewingMember,
  isMemberDetailsOpen,
  dailyLog,
  isLoadingAttachments,
  attachmentsError,
  refreshMemberAttachments,
  onMemberDetailsOpenChange,
  memberToRemove,
  isRemoveDialogOpen,
  confirmRemove,
  getRowSwipeActions,
  getRowCard,
} = useTupadBatchDetails()
</script>

<template>
  <div class="w-full min-w-0 space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="-ml-2 mb-1 text-muted-foreground" as-child>
          <RouterLink :to="{ name: 'provincial-peso-tupad' }">
            <ChevronLeft class="size-4 shrink-0" />
            TUPAD Dashboard
          </RouterLink>
        </Button>
        <Skeleton v-if="isLoading && !currentBatch" class="h-8 w-56" />
        <div v-else-if="currentBatch" class="flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">EDL {{ currentBatch.edl_number }}</h1>
          <Badge variant="outline" :class="getTupadStatusBadgeClass(currentBatch.status)">
            {{ currentBatch.status }}
          </Badge>
        </div>
        <p v-if="currentBatch" class="text-sm text-muted-foreground">{{ formatTupadPeriod(currentBatch) }}</p>
      </div>
      <div v-if="currentBatch" class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button variant="outline" :disabled="isLoading" @click="reload">
          <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
          <span class="hidden sm:inline">Refresh</span>
        </Button>
        <Button variant="outline" @click="editCurrentBatch">
          <Pencil class="size-4 shrink-0" />
          Edit Batch
        </Button>
        <Button :disabled="!canAddApplicants" @click="openAddApplicants">
          <UserPlus class="size-4 shrink-0" />
          Add Beneficiaries
        </Button>
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="rounded border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <template v-if="currentBatch">
      <Alert v-if="!canAddApplicants" class="border-warning/40 bg-warning/10">
        <AlertTitle>This batch is {{ currentBatch.status.toLowerCase() }}</AlertTitle>
        <AlertDescription>Set the batch back to Pending or Ongoing to add more beneficiaries.</AlertDescription>
      </Alert>

      <!-- Summary -->
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Beneficiaries</CardDescription>
            <CardTitle class="text-3xl font-semibold tabular-nums">{{ memberStats.total }}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active</CardDescription>
            <CardTitle class="text-3xl font-semibold tabular-nums">{{ memberStats.active }}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Completed</CardDescription>
            <CardTitle class="text-3xl font-semibold tabular-nums">{{ memberStats.completed }}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Terminated</CardDescription>
            <CardTitle class="text-3xl font-semibold tabular-nums">{{ memberStats.terminated }}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Empty v-if="!isLoading && members.length === 0" class="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>No beneficiaries in this batch yet</EmptyTitle>
          <EmptyDescription>Add TUPAD applicants to this batch as beneficiaries.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button :disabled="!canAddApplicants" @click="openAddApplicants">
            <Plus class="size-4" />
            Add Beneficiaries
          </Button>
        </EmptyContent>
      </Empty>

      <template v-else>
        <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
        <SwipeCardList
          class="md:hidden"
          :items="table.getRowModel().rows"
          :item-key="(row) => row.id"
          :card="(row) => getRowCard(row.original)"
          :actions="(row) => getRowSwipeActions(row.original)"
          :loading="isLoading && members.length === 0"
        >
          <template #empty>
            <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">No members yet.</p>
          </template>
        </SwipeCardList>

        <!-- Desktop: table -->
        <div class="hidden overflow-x-auto rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                <TableHead v-for="header in headerGroup.headers" :key="header.id">
                  <FlexRender
                    v-if="!header.isPlaceholder"
                    :render="header.column.columnDef.header"
                    :props="header.getContext()"
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="isLoading && members.length === 0">
                <TableRow v-for="i in 5" :key="i">
                  <TableCell v-for="col in columns.length" :key="col">
                    <Skeleton class="h-4 w-full" />
                  </TableCell>
                </TableRow>
              </template>
              <template v-else>
                <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
                  <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>
        </div>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
            {{ members.length }} beneficiary(ies)
          </p>
          <div class="flex justify-center gap-2 sm:justify-end">
            <Button variant="outline" size="sm" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">
              Previous
            </Button>
            <Button variant="outline" size="sm" :disabled="!table.getCanNextPage()" @click="table.nextPage()">
              Next
            </Button>
          </div>
        </div>
      </template>
    </template>
  </div>

  <TupadBatchDialog />

  <!-- Add beneficiaries to the batch -->
  <Dialog :open="isAddMembersOpen" @update:open="onAddApplicantsOpenChange">
    <DialogContent class="flex max-h-[90vh] flex-col sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Add Beneficiaries to EDL {{ currentBatch?.edl_number }}</DialogTitle>
        <DialogDescription>
          Pick from the TUPAD applicants. Only applicants with their monthly income and the NSRP Form, Valid ID and
          TUPAD Form submitted can be added. Rejected applicants, those already in this batch, and those still active
          in another batch are not listed.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div class="flex-1 space-y-1.5">
          <Label for="tupad-picker-search">Search</Label>
          <Input id="tupad-picker-search" v-model="pickerSearch" placeholder="Name or municipality..." />
        </div>
        <div class="space-y-1.5 sm:w-40">
          <Label for="tupad-days">Days of work</Label>
          <Input
            id="tupad-days"
            v-model.number="daysDuration"
            type="number"
            min="1"
            max="365"
            :aria-invalid="!isDaysValid"
          />
        </div>
      </div>
      <p v-if="!isDaysValid" class="text-sm text-destructive">Enter whole days from 1 to 365.</p>
      <p v-if="notReadyCount > 0" class="text-sm text-muted-foreground">
        {{ notReadyCount }} applicant(s) are incomplete. Complete their income and documents in
        <RouterLink :to="{ name: 'provincial-peso-tupad-applicants' }" class="font-medium text-primary underline-offset-4 hover:underline">
          TUPAD Applicants
        </RouterLink>
        first.
      </p>

      <div class="min-h-0 flex-1 overflow-y-auto rounded-md border">
        <div v-if="eligibleApplicants.length === 0" class="p-6 text-center text-sm text-muted-foreground">
          No TUPAD applicants are available to add. Refer applicants to TUPAD in Entry of Applicants first.
        </div>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10">
                <Checkbox
                  :model-value="allFilteredSelected"
                  :disabled="readyFiltered.length === 0"
                  aria-label="Select all listed applicants who are complete"
                  @update:model-value="toggleAllFiltered"
                />
              </TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Municipality</TableHead>
              <TableHead>Income</TableHead>
              <TableHead>Requirements</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="row in filteredEligible"
              :key="row.id"
              :class="{ 'text-muted-foreground': !isTupadBatchReady(row) }"
            >
              <TableCell>
                <Checkbox
                  :model-value="isSelected(row.id)"
                  :disabled="!isTupadBatchReady(row)"
                  :aria-label="`Select ${formatTupadApplicantName(row)}`"
                  @update:model-value="(checked) => toggleSelected(row.id, checked)"
                />
              </TableCell>
              <TableCell class="font-medium">{{ formatTupadApplicantName(row) }}</TableCell>
              <TableCell class="whitespace-nowrap text-sm">{{ getTupadMunicipality(row.applicant) }}</TableCell>
              <TableCell class="whitespace-nowrap text-sm tabular-nums">{{ formatTupadIncome(row.monthly_income) }}</TableCell>
              <TableCell>
                <Badge
                  v-if="isTupadBatchReady(row)"
                  variant="outline"
                  :class="getTupadStatusBadgeClass('approved')"
                >
                  Complete
                </Badge>
                <span v-else class="text-xs text-destructive">
                  Missing: {{ getTupadBatchMissingRequirements(row).join(', ') }}
                </span>
              </TableCell>
            </TableRow>
            <TableRow v-if="filteredEligible.length === 0">
              <TableCell colspan="5" class="h-16 text-center text-muted-foreground">No applicants match the search.</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <DialogFooter class="gap-2 sm:items-center sm:justify-between">
        <p class="text-sm text-muted-foreground">{{ selectedIds.length }} selected</p>
        <div class="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="onAddApplicantsOpenChange(false)">
            Cancel
          </Button>
          <Button type="button" :disabled="!canSubmitAdd" @click="submitAddApplicants">
            <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
            {{ isSubmitting ? 'Adding...' : 'Add to Batch' }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Edit a beneficiary -->
  <Dialog :open="isEditMemberOpen" @update:open="onEditMemberOpenChange">
    <DialogContent class="sm:max-w-md">
      <form class="space-y-6" @submit="submitMember">
        <DialogHeader>
          <DialogTitle>{{ formatTupadMemberName(editingMember) }}</DialogTitle>
          <DialogDescription>Beneficiary of EDL {{ currentBatch?.edl_number }}.</DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField v-slot="{ componentField }" name="days_duration">
              <FormItem>
                <FormLabel>Days of work</FormLabel>
                <FormControl>
                  <Input v-bind="componentField" type="number" min="1" max="365" :disabled="isSubmitting" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
            <FormField v-slot="{ componentField }" name="status">
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select v-bind="componentField" :disabled="isSubmitting">
                  <FormControl>
                    <SelectTrigger class="w-full">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem v-for="status in statusOptions" :key="status" :value="status">
                      {{ status }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>
          <FormField v-slot="{ componentField }" name="remarks">
            <FormItem>
              <FormLabel>Remarks <span class="font-normal text-muted-foreground">(optional)</span></FormLabel>
              <FormControl>
                <Textarea v-bind="componentField" rows="3" :disabled="isSubmitting" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <DialogFooter class="gap-2">
          <Button type="button" variant="outline" :disabled="isSubmitting" @click="onEditMemberOpenChange(false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
            {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <!-- Beneficiary daily attachments -->
  <Dialog :open="isMemberDetailsOpen" @update:open="onMemberDetailsOpenChange">
    <DialogContent class="flex max-h-[90vh] flex-col sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{{ formatTupadMemberName(viewingMember) }}</DialogTitle>
        <DialogDescription>Daily attachments for EDL {{ currentBatch?.edl_number }}</DialogDescription>
      </DialogHeader>

      <!-- Beneficiary profile -->
      <dl class="grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border p-3 sm:grid-cols-3">
        <div>
          <dt class="text-xs text-muted-foreground">Age</dt>
          <dd class="text-sm font-medium tabular-nums">{{ getTupadAge(viewingMember?.tupad_applicant?.applicant) ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">Gender</dt>
          <dd class="text-sm font-medium">{{ formatTupadSex(viewingMember?.tupad_applicant?.applicant) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">Contact Number</dt>
          <dd class="text-sm font-medium tabular-nums">{{ formatTupadContact(viewingMember?.tupad_applicant?.applicant) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">Municipality</dt>
          <dd class="text-sm font-medium">{{ getTupadMunicipality(viewingMember?.tupad_applicant?.applicant) }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">Barangay</dt>
          <dd class="text-sm font-medium">{{ getTupadBarangay(viewingMember?.tupad_applicant?.applicant) }}</dd>
        </div>
      </dl>

      <template v-if="dailyLog">
        <!-- Summary -->
        <div class="space-y-2 rounded-md border p-3">
          <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p>
              <span class="font-semibold tabular-nums">{{ dailyLog.submitted }}</span>
              of {{ dailyLog.days.length }} day(s) submitted
            </p>
            <p class="text-xs text-muted-foreground">
              Last upload: {{ dailyLog.lastUploadDate ? formatTupadDate(dailyLog.lastUploadDate) : 'none yet' }}
            </p>
          </div>
          <Progress
            :model-value="dailyLog.days.length ? Math.round((dailyLog.submitted / dailyLog.days.length) * 100) : 0"
            class="h-1.5"
            aria-label="Daily attachment progress"
          />
          <p class="text-xs text-muted-foreground">
            Each date the beneficiary uploads becomes their next work day, so days skipped (e.g. no work) are not counted.
          </p>
        </div>

        <div
          v-if="attachmentsError"
          class="flex items-center justify-between gap-2 rounded border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <span>{{ attachmentsError }}</span>
          <Button variant="outline" size="sm" @click="refreshMemberAttachments">Retry</Button>
        </div>

        <!-- One row per work day -->
        <div class="min-h-0 flex-1 overflow-y-auto rounded-md border">
          <div v-if="isLoadingAttachments" class="space-y-3 p-3">
            <Skeleton v-for="i in 4" :key="i" class="h-10 w-full" />
          </div>
          <ul v-else class="divide-y">
            <li v-for="day in dailyLog.days" :key="day.day" class="space-y-2 p-3">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="text-sm font-medium">Day {{ day.day }}</p>
                  <p v-if="day.date" class="text-xs text-muted-foreground">Submitted {{ formatTupadDate(day.date) }}</p>
                </div>
                <Badge variant="outline" :class="getTupadDayStatusMeta(day.status).badgeClass">
                  {{ getTupadDayStatusMeta(day.status).label }}
                </Badge>
              </div>
              <ul v-if="day.attachments.length" class="space-y-1">
                <li
                  v-for="file in day.attachments"
                  :key="file.id"
                  class="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-sm"
                >
                  <FileText class="size-4 shrink-0 text-muted-foreground" />
                  <a
                    v-if="file.url"
                    :href="file.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="min-w-0 flex-1 truncate font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {{ file.file_name }}
                  </a>
                  <span v-else class="min-w-0 flex-1 truncate" title="File is no longer available">
                    {{ file.file_name }}
                  </span>
                  <span class="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {{ formatTupadUploadTime(file.created_at) }}
                    <template v-if="file.size !== null"> · {{ formatTupadFileSize(file.size) }}</template>
                  </span>
                  <ExternalLink v-if="file.url" class="size-3.5 shrink-0 text-muted-foreground" />
                </li>
              </ul>
            </li>
          </ul>

          <div v-if="!isLoadingAttachments && dailyLog.extraAttachments.length" class="space-y-2 border-t p-3">
            <p class="text-sm font-medium">Uploaded after Day {{ dailyLog.days.length }}</p>
            <ul class="space-y-1">
              <li
                v-for="file in dailyLog.extraAttachments"
                :key="file.id"
                class="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-sm"
              >
                <FileText class="size-4 shrink-0 text-muted-foreground" />
                <a
                  v-if="file.url"
                  :href="file.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="min-w-0 flex-1 truncate font-medium text-primary underline-offset-4 hover:underline"
                >
                  {{ file.file_name }}
                </a>
                <span v-else class="min-w-0 flex-1 truncate">{{ file.file_name }}</span>
                <span class="shrink-0 text-xs text-muted-foreground">{{ formatTupadDate(file.created_at) }}</span>
              </li>
            </ul>
          </div>
        </div>
      </template>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="isLoadingAttachments" @click="refreshMemberAttachments">
          <RefreshCw class="size-4" :class="{ 'animate-spin': isLoadingAttachments }" />
          Refresh
        </Button>
        <Button @click="onMemberDetailsOpenChange(false)">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <AlertDialog v-model:open="isRemoveDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove from batch?</AlertDialogTitle>
        <AlertDialogDescription>
          <strong class="font-medium text-foreground">{{ formatTupadMemberName(memberToRemove) }}</strong> will be
          removed from EDL {{ currentBatch?.edl_number }}, along with their daily attachments. They stay in
          the TUPAD applicant list.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel class="cursor-pointer" :disabled="isDeleting">Cancel</AlertDialogCancel>
        <Button variant="destructive" class="cursor-pointer" :disabled="isDeleting" @click="confirmRemove">
          <Loader2 v-if="isDeleting" class="size-4 shrink-0 animate-spin" />
          {{ isDeleting ? 'Removing...' : 'Remove' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
