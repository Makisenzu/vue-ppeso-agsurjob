<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { AlertCircle, ArrowLeft, Loader2, Pencil, Search, Trash2, UserPlus, X } from '@lucide/vue'
import SwipeCardList from '@/components/SwipeCardList.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useSkillsTrainingDetails } from '@/composables/peso/provincialPeso/useSkillsTrainingDetails'

const {
  training,
  isLoadingTraining,
  trainingError,
  trainingDates,
  trainingPlace,
  placementRate,
  participants,
  participantFilters,
  isLoadingParticipants,
  participantsError,
  completionFilterOptions,
  employmentFilterOptions,
  hasParticipantFilters,
  clearParticipantFilters,
  table,
  columns,
  selectedRows,
  clearSelection,
  canPrevious,
  canNext,
  previousPage,
  nextPage,
  rangeLabel,
  getCard,
  getSwipeActions,
  statusDialog,
  completionOptions,
  employmentOptions,
  isHiredSelected,
  todayMax,
  saveStatus,
  isSavingParticipants,
  pendingRemove,
  isRemoveDialogOpen,
  isRemovingParticipants,
  requestRemove,
  confirmRemove,
  isAddDialogOpen,
  openAddDialog,
  candidates,
  candidateTotal,
  candidateFilters,
  candidateMunicipalityOptions,
  isLoadingCandidates,
  pickedCandidates,
  isPicked,
  togglePicked,
  canPreviousCandidates,
  canNextCandidates,
  previousCandidates,
  nextCandidates,
  addPicked,
  trainingForm,
  trainingFormTitle,
  isSavingTraining,
  selectedSkills,
  skillOptions,
  skillPickerModel,
  canAddSkill,
  removeSkill,
  municipalityOptions,
  municipalityModel,
  agencyOptions,
  agencyModel,
  openEditTraining,
  submitTraining,
  isDeleteTrainingOpen,
  isDeletingTrainings,
  confirmDeleteTraining,
  goBack,
} = useSkillsTrainingDetails()
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0 space-y-1">
        <Button variant="ghost" size="sm" class="-ml-2 cursor-pointer" @click="goBack">
          <ArrowLeft class="size-4 shrink-0" />
          Back to Trainings
        </Button>
        <Skeleton v-if="isLoadingTraining && !training" class="h-8 w-72 max-w-full" />
        <template v-else-if="training">
          <h1 class="text-2xl font-bold tracking-tight break-words sm:text-3xl">{{ training.title }}</h1>
          <p class="text-sm text-muted-foreground">{{ training.agency }}</p>
        </template>
      </div>
      <div v-if="training" class="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" class="cursor-pointer" @click="openEditTraining(training)">
          <Pencil class="size-4 shrink-0" />
          Edit
        </Button>
        <Button variant="destructive" size="sm" class="cursor-pointer" :disabled="isDeletingTrainings" @click="isDeleteTrainingOpen = true">
          <Trash2 class="size-4 shrink-0" />
          Delete
        </Button>
      </div>
    </div>

    <Alert v-if="trainingError" variant="destructive">
      <AlertCircle />
      <AlertTitle>Couldn't load the training</AlertTitle>
      <AlertDescription>{{ trainingError }}</AlertDescription>
    </Alert>

    <template v-if="training">
      <!-- ─── Training details ─── -->
      <Card>
        <CardContent class="grid gap-4">
          <dl class="grid grid-cols-2 gap-x-4 gap-y-4 text-sm lg:grid-cols-5">
            <div class="col-span-2 lg:col-span-1">
              <dt class="text-xs text-muted-foreground">Dates</dt>
              <dd class="font-medium tabular-nums">{{ trainingDates }}</dd>
            </div>
            <div class="col-span-2 lg:col-span-1">
              <dt class="text-xs text-muted-foreground">Venue</dt>
              <dd class="font-medium break-words">{{ trainingPlace || '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Participants</dt>
              <dd class="font-medium tabular-nums">{{ training.participant_count.toLocaleString() }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Completed</dt>
              <dd class="font-medium tabular-nums">{{ training.completed_count.toLocaleString() }}</dd>
            </div>
            <div>
              <dt class="text-xs text-muted-foreground">Employed</dt>
              <dd class="font-medium tabular-nums">
                {{ training.employed_count.toLocaleString() }}
                <span class="ml-1 text-xs font-normal text-muted-foreground">{{ placementRate }}</span>
              </dd>
            </div>
          </dl>
          <div class="grid gap-2 border-t pt-4">
            <h2 class="text-xs text-muted-foreground">Skills taught</h2>
            <ul v-if="training.skill_names.length" class="flex flex-wrap gap-1.5">
              <li v-for="skill in training.skill_names" :key="skill">
                <Badge variant="outline" class="font-normal">{{ skill }}</Badge>
              </li>
            </ul>
            <p v-else class="text-sm text-muted-foreground">No skills listed. Edit the training to add them.</p>
          </div>
          <p v-if="training.remarks" class="border-t pt-4 text-sm whitespace-pre-line text-muted-foreground">{{ training.remarks }}</p>
        </CardContent>
      </Card>

      <!-- ─── Participants ─── -->
      <Card class="gap-0 py-0">
        <CardHeader class="gap-4 border-b py-4 [.border-b]:pb-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="space-y-1">
              <CardTitle class="text-base">Participants</CardTitle>
            </div>
            <Button size="sm" class="cursor-pointer self-start sm:self-auto" @click="openAddDialog">
              <UserPlus class="size-4 shrink-0" />
              Add Participants
            </Button>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="relative sm:col-span-2">
              <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                v-model="participantFilters.search"
                placeholder="Search name, municipality, employer..."
                class="pr-9 pl-8"
                aria-label="Search participants"
              />
              <Button
                v-if="participantFilters.search"
                variant="ghost"
                size="icon"
                class="absolute top-1/2 right-1 size-7 -translate-y-1/2 cursor-pointer"
                aria-label="Clear search"
                @click="participantFilters.search = ''"
              >
                <X class="size-4 shrink-0" />
              </Button>
            </div>
            <SearchSelect v-model="participantFilters.completion" :options="completionFilterOptions" class="w-full" aria-label="Filter by completion" />
            <SearchSelect v-model="participantFilters.employment" :options="employmentFilterOptions" class="w-full" aria-label="Filter by current status" />
          </div>
        </CardHeader>

        <CardContent class="grid gap-0 p-0">
          <Alert v-if="participantsError" variant="destructive" class="m-4 w-auto">
            <AlertCircle />
            <AlertTitle>Couldn't load the participants</AlertTitle>
            <AlertDescription>{{ participantsError }}</AlertDescription>
          </Alert>

          <!-- Bulk remove -->
          <div
            v-if="selectedRows.length > 0"
            class="flex flex-col gap-2 border-b bg-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex items-center gap-2 text-sm">
              <span class="font-medium">{{ selectedRows.length }} selected</span>
              <Button variant="ghost" size="sm" class="cursor-pointer" :disabled="isRemovingParticipants" @click="clearSelection">
                <X class="size-4" /> Clear
              </Button>
            </div>
            <Button variant="destructive" size="sm" class="cursor-pointer" :disabled="isRemovingParticipants" @click="requestRemove(selectedRows)">
              <Trash2 class="size-4" /> Remove Selected ({{ selectedRows.length }})
            </Button>
          </div>

          <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
          <SwipeCardList
            class="m-4 md:hidden"
            :items="table.getRowModel().rows"
            :item-key="(row) => row.id"
            :card="(row) => getCard(row.original)"
            :actions="(row) => getSwipeActions(row.original)"
            :loading="isLoadingParticipants && participants.length === 0"
            :is-selected="(row) => row.getIsSelected()"
            :all-selected="table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')"
            @toggle="(row, value) => row.toggleSelected(value)"
            @toggle-all="(value) => table.toggleAllPageRowsSelected(value)"
          >
            <template #empty>
              <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">
                {{ hasParticipantFilters ? 'No participants match your search.' : 'No participants yet.' }}
              </p>
            </template>
          </SwipeCardList>

          <!-- Desktop: table -->
          <div class="hidden overflow-x-auto border-b md:block">
            <Table>
              <TableHeader>
                <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                  <TableHead v-for="header in headerGroup.headers" :key="header.id">
                    <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <template v-if="isLoadingParticipants && participants.length === 0">
                  <TableRow v-for="i in 3" :key="i">
                    <TableCell v-for="col in columns.length" :key="col"><Skeleton class="h-4 w-full" /></TableCell>
                  </TableRow>
                </template>
                <template v-else-if="table.getRowModel().rows.length">
                  <TableRow v-for="row in table.getRowModel().rows" :key="row.id" :data-state="row.getIsSelected() ? 'selected' : undefined">
                    <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                      <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                    </TableCell>
                  </TableRow>
                </template>
                <TableRow v-else>
                  <TableCell :colspan="columns.length" class="h-24 text-center text-muted-foreground">
                    <template v-if="hasParticipantFilters">
                      No participants match your search.
                      <Button variant="link" size="sm" class="cursor-pointer" @click="clearParticipantFilters">Clear filters</Button>
                    </template>
                    <template v-else>
                      No participants yet.
                      <Button variant="link" size="sm" class="cursor-pointer" @click="openAddDialog">Add participants</Button>
                    </template>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div class="flex flex-col-reverse gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between md:pt-4">
            <p class="text-center text-xs text-muted-foreground tabular-nums sm:text-left sm:text-sm">{{ rangeLabel }}</p>
            <div class="flex justify-center gap-2 sm:justify-end">
              <Button variant="outline" size="sm" class="cursor-pointer" :disabled="!canPrevious || isLoadingParticipants" @click="previousPage">
                Previous
              </Button>
              <Button variant="outline" size="sm" class="cursor-pointer" :disabled="!canNext || isLoadingParticipants" @click="nextPage">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>

    <!-- ─── Add / edit training (a long form, so a Sheet: DESIGN.md 5.1) ─── -->
    <Sheet v-model:open="trainingForm.open">
      <SheetContent class="flex h-full flex-col p-0 sm:max-w-lg">
        <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
          <SheetTitle>{{ trainingFormTitle }}</SheetTitle>
          <SheetDescription class="sr-only">The training's title, skills, agency, dates and venue.</SheetDescription>
        </SheetHeader>

        <form class="contents" novalidate @submit.prevent="submitTraining">
          <div class="grid flex-1 grid-cols-1 content-start gap-5 overflow-y-auto px-6 py-4">
            <div class="grid gap-2">
              <Label for="training-title">Training title</Label>
              <Input
                id="training-title"
                v-model="trainingForm.values.title"
                maxlength="150"
                placeholder="e.g. Virtual Assistance Training"
                :aria-invalid="!!trainingForm.errors.title"
              />
              <p v-if="trainingForm.errors.title" class="text-sm text-destructive">{{ trainingForm.errors.title }}</p>
            </div>

            <!-- One or more skills: the picker adds to the list below it -->
            <div class="grid gap-2">
              <Label for="training-skill">Skills taught</Label>
              <SearchSelect
                id="training-skill"
                v-model="skillPickerModel"
                :options="skillOptions"
                :disabled="!canAddSkill"
                placeholder="Add a skill"
                search-placeholder="Search the Skill List"
                empty-text="No more skills to add."
                class="w-full"
                :aria-invalid="!!trainingForm.errors.skillIds"
              />
              <ul v-if="selectedSkills.length" class="flex flex-wrap gap-1.5" aria-label="Skills taught">
                <li v-for="skill in selectedSkills" :key="skill.id">
                  <Badge variant="outline" class="gap-1 font-normal">
                    {{ skill.name }}
                    <button
                      type="button"
                      class="cursor-pointer rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      :aria-label="`Remove ${skill.name}`"
                      @click="removeSkill(skill.id)"
                    >
                      <X class="size-3" />
                    </button>
                  </Badge>
                </li>
              </ul>
              <p v-if="trainingForm.errors.skillIds" class="text-sm text-destructive">{{ trainingForm.errors.skillIds }}</p>
            </div>

            <div class="grid gap-2">
              <Label for="training-agency">Training agency</Label>
              <SearchSelect
                id="training-agency"
                v-model="agencyModel"
                :options="agencyOptions"
                placeholder="Select agency"
                class="w-full"
                :aria-invalid="!!trainingForm.errors.agency"
              />
              <Input
                v-if="trainingForm.otherAgency"
                v-model="trainingForm.values.agency"
                maxlength="100"
                placeholder="Agency name"
                aria-label="Agency name"
                :aria-invalid="!!trainingForm.errors.agency"
              />
              <p v-if="trainingForm.errors.agency" class="text-sm text-destructive">{{ trainingForm.errors.agency }}</p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <Label for="training-start">Start date</Label>
                <Input id="training-start" v-model="trainingForm.values.startDate" type="date" :aria-invalid="!!trainingForm.errors.startDate" />
                <p v-if="trainingForm.errors.startDate" class="text-sm text-destructive">{{ trainingForm.errors.startDate }}</p>
              </div>
              <div class="grid gap-2">
                <Label for="training-end">End date</Label>
                <Input
                  id="training-end"
                  v-model="trainingForm.values.endDate"
                  type="date"
                  :min="trainingForm.values.startDate || undefined"
                  :aria-invalid="!!trainingForm.errors.endDate"
                />
                <p v-if="trainingForm.errors.endDate" class="text-sm text-destructive">{{ trainingForm.errors.endDate }}</p>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-2">
                <Label for="training-venue">Venue</Label>
                <Input id="training-venue" v-model="trainingForm.values.venue" maxlength="200" :aria-invalid="!!trainingForm.errors.venue" />
                <p v-if="trainingForm.errors.venue" class="text-sm text-destructive">{{ trainingForm.errors.venue }}</p>
              </div>
              <div class="grid gap-2">
                <Label for="training-municipality">Municipality</Label>
                <SearchSelect id="training-municipality" v-model="municipalityModel" :options="municipalityOptions" class="w-full" />
              </div>
            </div>

            <div class="grid gap-2">
              <Label for="training-remarks">Remarks</Label>
              <Textarea id="training-remarks" v-model="trainingForm.values.remarks" rows="3" maxlength="1000" :aria-invalid="!!trainingForm.errors.remarks" />
              <p v-if="trainingForm.errors.remarks" class="text-sm text-destructive">{{ trainingForm.errors.remarks }}</p>
            </div>
          </div>

          <div class="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" class="cursor-pointer" :disabled="isSavingTraining" @click="trainingForm.open = false">
              Cancel
            </Button>
            <Button type="submit" class="cursor-pointer" :disabled="isSavingTraining">
              <Loader2 v-if="isSavingTraining" class="size-4 shrink-0 animate-spin" />
              {{ isSavingTraining ? 'Saving...' : 'Save' }}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>

    <!-- ─── Add participants from the applicant registry ─── -->
    <Dialog v-model:open="isAddDialogOpen">
      <DialogContent class="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Participants</DialogTitle>
          <DialogDescription class="sr-only">Pick applicants from Entry of Applicants.</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="relative sm:col-span-2">
            <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input v-model="candidateFilters.search" placeholder="Search name or municipality..." class="pl-8" aria-label="Search applicants" />
          </div>
          <SearchSelect
            v-model="candidateFilters.municipality"
            :options="candidateMunicipalityOptions"
            class="w-full"
            aria-label="Filter applicants by municipality"
          />
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto rounded-md border">
          <div v-if="isLoadingCandidates && candidates.length === 0" class="grid gap-2 p-3" aria-busy="true">
            <Skeleton v-for="i in 5" :key="i" class="h-10 w-full" />
          </div>
          <p v-else-if="candidates.length === 0" class="p-6 text-center text-sm text-muted-foreground">No applicants to add.</p>
          <ul v-else class="divide-y">
            <li v-for="candidate in candidates" :key="candidate.applicant_id">
              <label class="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                <Checkbox
                  :model-value="isPicked(candidate)"
                  :aria-label="`Select ${candidate.full_name}`"
                  @update:model-value="(value) => togglePicked(candidate, value === true)"
                />
                <span class="grid min-w-0 flex-1 gap-0.5">
                  <span class="truncate text-sm font-medium">{{ candidate.full_name }}</span>
                  <span class="truncate text-xs text-muted-foreground">
                    {{ [candidate.municipality, candidate.employment_status].filter(Boolean).join(' · ') }}
                  </span>
                </span>
                <Badge v-if="candidate.has_skill" variant="outline" class="shrink-0 border-info/30 bg-info/10 text-info">Has these skills</Badge>
              </label>
            </li>
          </ul>
        </div>

        <div class="flex items-center justify-between gap-3 text-xs text-muted-foreground sm:text-sm">
          <span class="tabular-nums">{{ candidateTotal.toLocaleString() }} applicant{{ candidateTotal === 1 ? '' : 's' }}</span>
          <div class="flex gap-2">
            <Button variant="outline" size="sm" class="cursor-pointer" :disabled="!canPreviousCandidates || isLoadingCandidates" @click="previousCandidates">
              Previous
            </Button>
            <Button variant="outline" size="sm" class="cursor-pointer" :disabled="!canNextCandidates || isLoadingCandidates" @click="nextCandidates">
              Next
            </Button>
          </div>
        </div>

        <DialogFooter class="gap-2">
          <Button type="button" variant="outline" class="cursor-pointer" :disabled="isSavingParticipants" @click="isAddDialogOpen = false">Cancel</Button>
          <Button class="cursor-pointer" :disabled="pickedCandidates.size === 0 || isSavingParticipants" @click="addPicked">
            <Loader2 v-if="isSavingParticipants" class="size-4 shrink-0 animate-spin" />
            {{ isSavingParticipants ? 'Adding...' : `Add ${pickedCandidates.size || ''} Participant${pickedCandidates.size === 1 ? '' : 's'}` }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- ─── Update a participant's status (fields appear for Hired, so a Sheet: DESIGN.md 5.1) ─── -->
    <Sheet v-model:open="statusDialog.open">
      <SheetContent class="flex h-full flex-col p-0 sm:max-w-md">
        <SheetHeader class="shrink-0 px-6 pt-6 pb-2">
          <SheetTitle>Update Status</SheetTitle>
          <SheetDescription>{{ statusDialog.participant?.full_name }}</SheetDescription>
        </SheetHeader>

        <form class="contents" novalidate @submit.prevent="saveStatus">
          <div class="grid flex-1 grid-cols-1 content-start gap-5 overflow-y-auto px-6 py-4">
            <div class="grid gap-2">
              <Label for="participant-completion">Completion</Label>
              <SearchSelect id="participant-completion" v-model="statusDialog.values.completionStatus" :options="completionOptions" class="w-full" />
            </div>
            <div class="grid gap-2">
              <Label for="participant-status">Current status</Label>
              <SearchSelect id="participant-status" v-model="statusDialog.values.employmentStatus" :options="employmentOptions" class="w-full" />
            </div>

            <template v-if="isHiredSelected">
              <div class="grid gap-2">
                <Label for="participant-employer">Company</Label>
                <Input
                  id="participant-employer"
                  v-model="statusDialog.values.employerName"
                  maxlength="150"
                  placeholder="Company that hired them"
                  :aria-invalid="!!statusDialog.errors.employerName"
                />
                <p v-if="statusDialog.errors.employerName" class="text-sm text-destructive">{{ statusDialog.errors.employerName }}</p>
              </div>
              <div class="grid gap-2">
                <Label for="participant-date-hired">Date hired</Label>
                <Input
                  id="participant-date-hired"
                  v-model="statusDialog.values.dateHired"
                  type="date"
                  :max="todayMax"
                  :aria-invalid="!!statusDialog.errors.dateHired"
                />
                <p v-if="statusDialog.errors.dateHired" class="text-sm text-destructive">{{ statusDialog.errors.dateHired }}</p>
              </div>
            </template>

            <div class="grid gap-2">
              <Label for="participant-remarks">Remarks</Label>
              <Textarea id="participant-remarks" v-model="statusDialog.values.remarks" rows="3" maxlength="500" :aria-invalid="!!statusDialog.errors.remarks" />
              <p v-if="statusDialog.errors.remarks" class="text-sm text-destructive">{{ statusDialog.errors.remarks }}</p>
            </div>
          </div>

          <div class="flex shrink-0 justify-end gap-3 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" class="cursor-pointer" :disabled="isSavingParticipants" @click="statusDialog.open = false">
              Cancel
            </Button>
            <Button type="submit" class="cursor-pointer" :disabled="isSavingParticipants">
              <Loader2 v-if="isSavingParticipants" class="size-4 shrink-0 animate-spin" />
              {{ isSavingParticipants ? 'Saving...' : 'Save' }}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>

    <!-- ─── Remove participants (one or many) ─── -->
    <AlertDialog v-model:open="isRemoveDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remove {{ pendingRemove.length === 1 ? pendingRemove[0]?.full_name : `${pendingRemove.length} participants` }}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Their status on this training is deleted. The applicant record{{ pendingRemove.length === 1 ? ' stays' : 's stay' }}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" :disabled="isRemovingParticipants">Cancel</AlertDialogCancel>
          <Button variant="destructive" class="cursor-pointer" :disabled="isRemovingParticipants" @click="confirmRemove">
            <Loader2 v-if="isRemovingParticipants" class="size-4 shrink-0 animate-spin" />
            {{ isRemovingParticipants ? 'Removing...' : 'Remove' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- ─── Delete the training ─── -->
    <AlertDialog v-model:open="isDeleteTrainingOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{{ training?.title }}"?</AlertDialogTitle>
          <AlertDialogDescription>The training and its participant list will be permanently deleted.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" :disabled="isDeletingTrainings">Cancel</AlertDialogCancel>
          <Button variant="destructive" class="cursor-pointer" :disabled="isDeletingTrainings" @click="confirmDeleteTraining">
            <Loader2 v-if="isDeletingTrainings" class="size-4 shrink-0 animate-spin" />
            {{ isDeletingTrainings ? 'Deleting...' : 'Delete' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
