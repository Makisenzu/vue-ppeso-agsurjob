<script setup lang="ts">
import { FlexRender } from '@tanstack/vue-table'
import { AlertCircle, Loader2, Plus, RefreshCw, Search, Trash2, X } from '@lucide/vue'
import SwipeCardList from '@/components/SwipeCardList.vue'
import SearchSelect from '@/components/SearchSelect.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { useSkillsTrainings } from '@/composables/peso/provincialPeso/useSkillsTrainings'

const {
  trainings,
  trainingFilters,
  isLoadingTrainings,
  trainingsError,
  reload,
  agencyFilterOptions,
  yearFilterOptions,
  skillFilterOptions,
  hasFilters,
  clearFilters,
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
  openTraining,
  pendingDelete,
  isDeleteDialogOpen,
  isDeletingTrainings,
  requestDelete,
  confirmDelete,
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
  openCreateTraining,
  submitTraining,
  goToDemand,
} = useSkillsTrainings()
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Trainings Conducted</h1>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" class="cursor-pointer" @click="goToDemand">Skills Demand</Button>
        <Button variant="outline" size="sm" class="cursor-pointer" :disabled="isLoadingTrainings" @click="reload">
          <RefreshCw :class="['size-4 shrink-0', isLoadingTrainings && 'animate-spin']" />
          Refresh
        </Button>
        <Button size="sm" class="cursor-pointer" @click="openCreateTraining()">
          <Plus class="size-4 shrink-0" />
          Add Training
        </Button>
      </div>
    </div>

    <Alert v-if="trainingsError" variant="destructive">
      <AlertCircle />
      <AlertTitle>Couldn't load the trainings</AlertTitle>
      <AlertDescription>{{ trainingsError }}</AlertDescription>
    </Alert>

    <Card class="gap-0 py-0">
      <CardHeader class="gap-3 border-b py-4 [.border-b]:pb-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div class="relative sm:col-span-2">
            <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="trainingFilters.search"
              placeholder="Search training, agency, venue..."
              class="pr-9 pl-8"
              aria-label="Search trainings"
            />
            <Button
              v-if="trainingFilters.search"
              variant="ghost"
              size="icon"
              class="absolute top-1/2 right-1 size-7 -translate-y-1/2 cursor-pointer"
              aria-label="Clear search"
              @click="trainingFilters.search = ''"
            >
              <X class="size-4 shrink-0" />
            </Button>
          </div>
          <SearchSelect v-model="trainingFilters.agency" :options="agencyFilterOptions" class="w-full" aria-label="Filter by agency" />
          <SearchSelect v-model="trainingFilters.skill" :options="skillFilterOptions" class="w-full" aria-label="Filter by skill" />
          <SearchSelect v-model="trainingFilters.year" :options="yearFilterOptions" class="w-full" aria-label="Filter by year" />
        </div>
      </CardHeader>

      <CardContent class="grid gap-0 p-0">
        <!-- Bulk delete -->
        <div
          v-if="selectedRows.length > 0"
          class="flex flex-col gap-2 border-b bg-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-center gap-2 text-sm">
            <span class="font-medium">{{ selectedRows.length }} selected</span>
            <Button variant="ghost" size="sm" class="cursor-pointer" :disabled="isDeletingTrainings" @click="clearSelection">
              <X class="size-4" /> Clear
            </Button>
          </div>
          <Button variant="destructive" size="sm" class="cursor-pointer" :disabled="isDeletingTrainings" @click="requestDelete(selectedRows)">
            <Trash2 class="size-4" /> Delete Selected ({{ selectedRows.length }})
          </Button>
        </div>

        <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
        <SwipeCardList
          class="m-4 md:hidden"
          :items="table.getRowModel().rows"
          :item-key="(row) => row.id"
          :card="(row) => getCard(row.original)"
          :actions="(row) => getSwipeActions(row.original)"
          :loading="isLoadingTrainings && trainings.length === 0"
          :is-selected="(row) => row.getIsSelected()"
          :all-selected="table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')"
          @toggle="(row, value) => row.toggleSelected(value)"
          @toggle-all="(value) => table.toggleAllPageRowsSelected(value)"
        >
          <template #empty>
            <p class="rounded-md border py-8 text-center text-sm text-muted-foreground">
              {{ hasFilters ? 'No trainings match your search.' : 'No trainings yet.' }}
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
              <template v-if="isLoadingTrainings && trainings.length === 0">
                <TableRow v-for="i in 3" :key="i">
                  <TableCell v-for="col in columns.length" :key="col"><Skeleton class="h-4 w-full" /></TableCell>
                </TableRow>
              </template>
              <template v-else-if="table.getRowModel().rows.length">
                <TableRow
                  v-for="row in table.getRowModel().rows"
                  :key="row.id"
                  class="cursor-pointer"
                  :data-state="row.getIsSelected() ? 'selected' : undefined"
                  @click="openTraining(row.original)"
                >
                  <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </TableCell>
                </TableRow>
              </template>
              <TableRow v-else>
                <TableCell :colspan="columns.length" class="h-24 text-center text-muted-foreground">
                  <template v-if="hasFilters">
                    No trainings match your search.
                    <Button variant="link" size="sm" class="cursor-pointer" @click="clearFilters">Clear filters</Button>
                  </template>
                  <template v-else>
                    No trainings yet.
                    <Button variant="link" size="sm" class="cursor-pointer" @click="openCreateTraining()">Add the first one</Button>
                  </template>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div class="flex flex-col-reverse gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between md:pt-4">
          <p class="text-center text-xs text-muted-foreground tabular-nums sm:text-left sm:text-sm">{{ rangeLabel }}</p>
          <div class="flex justify-center gap-2 sm:justify-end">
            <Button variant="outline" size="sm" class="cursor-pointer" :disabled="!canPrevious || isLoadingTrainings" @click="previousPage">
              Previous
            </Button>
            <Button variant="outline" size="sm" class="cursor-pointer" :disabled="!canNext || isLoadingTrainings" @click="nextPage">
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

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

    <!-- ─── Delete confirmation (one or many) ─── -->
    <AlertDialog v-model:open="isDeleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {{ pendingDelete.length === 1 ? `"${pendingDelete[0]?.title}"` : `${pendingDelete.length} trainings` }}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {{ pendingDelete.length === 1 ? 'The training and its' : 'The trainings and their' }} participant list will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel class="cursor-pointer" :disabled="isDeletingTrainings">Cancel</AlertDialogCancel>
          <Button variant="destructive" class="cursor-pointer" :disabled="isDeletingTrainings" @click="confirmDelete">
            <Loader2 v-if="isDeletingTrainings" class="size-4 shrink-0 animate-spin" />
            {{ isDeletingTrainings ? 'Deleting...' : 'Delete' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
