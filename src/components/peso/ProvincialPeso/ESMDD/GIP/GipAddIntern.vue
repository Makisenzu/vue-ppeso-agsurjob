<script setup lang="ts">
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CheckIcon,
  ChevronsUpDownIcon,
  Loader2,
  Search,
  X,
} from '@lucide/vue'
import SwipeCardList from '@/components/SwipeCardList.vue'
import { useGipAddIntern } from '@/composables/peso/provincialPeso/useGipAddIntern'
import { getGipStatusBadgeClass } from '@/helpers/peso/provincialPeso/gipHelper'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import SearchSelect from '@/components/SearchSelect.vue'
import { cn } from '@/lib/utils'

const {
  // State & Flags
  isSubmitting,
  activeStep,
  searchQuery,
  selectedLpiiFilter,
  selectedStatusFilter,
  onlyAvailable,
  isPriorityFilter,
  priorityApplicantsCount,
  currentPage,
  pageSize,
  totalPages,
  paginatedApplicants,
  selectedApplicant,
  validationError,

  // Form fields
  program,
  assignedOffice,
  supervisor,
  stipend,
  status,
  deploymentNotes,

  // Office directory
  officeSearchQuery,
  filteredOffices,
  selectedOffice,
  isLoadingOffices,

  // Date range
  deploymentStartDate,
  deploymentEndDate,
  formattedPeriod,

  // Configs
  pgasLogo,
  doleLogo,
  LPII_CONFIG,

  // Computed & Helpers
  filteredApplicants,
  isApplicantDeployed,
  getInitials,

  // Handlers
  selectApplicant,
  togglePriorityFilter,
  resetForm,
  goBack,
  handleDeployIntern,
  getCandidateCard,
  getCandidateSwipeActions,
} = useGipAddIntern()

const programOptions = [
  { value: 'PGAS', label: 'PGAS - Agusan del Sur', description: "Provincial Gov't funded · ₱479.35/day", logo: pgasLogo },
  { value: 'DOLE', label: 'DOLE - Field Office', description: 'National DOLE program · ₱475/day', logo: doleLogo },
] as const

function getScoreClass(score?: number | null) {
  const val = score ?? 0
  if (val >= 70) return 'text-success font-semibold'
  if (val >= 40) return 'text-info font-semibold'
  return 'text-muted-foreground'
}

const formatCalendarDate = (date: { year: number; month: number; day: number }) =>
  new Date(date.year, date.month - 1, date.day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="space-y-1">
      <Button variant="ghost" size="sm" class="-ml-2 cursor-pointer" @click="goBack">
        <ArrowLeft class="size-4 shrink-0" />
        Back to Interns
      </Button>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Deploy GIP Intern</h1>
      <p class="text-sm text-muted-foreground">
        {{ activeStep === 'select-applicant'
          ? 'Step 1 of 2 · Select an applicant from the registry.'
          : 'Step 2 of 2 · Assign the applicant to a government station or office.' }}
      </p>
    </div>

    <!-- ─── Validation Error ─── -->
    <Alert v-if="validationError" variant="destructive" class="pr-12">
      <AlertCircle />
      <AlertTitle>Unable to deploy</AlertTitle>
      <AlertDescription>{{ validationError }}</AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        class="absolute top-2 right-2 size-7 cursor-pointer"
        aria-label="Dismiss"
        @click="validationError = null"
      >
        <X class="size-4 shrink-0" />
      </Button>
    </Alert>

    <!-- ═══ STEP 1: SELECT APPLICANT ═══ -->
    <Card v-if="activeStep === 'select-applicant'" class="gap-0 py-0">
      <CardHeader class="gap-4 border-b py-4 [.border-b]:pb-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div class="relative flex-1">
            <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              placeholder="Search name, municipality, barangay, course, code..."
              class="pr-9 pl-8"
              aria-label="Search candidates"
            />
            <Button
              v-if="searchQuery"
              variant="ghost"
              size="icon"
              class="absolute top-1/2 right-1 size-7 -translate-y-1/2 cursor-pointer"
              aria-label="Clear search"
              @click="searchQuery = ''"
            >
              <X class="size-4 shrink-0" />
            </Button>
          </div>

          <Button
            size="sm"
            :variant="isPriorityFilter ? 'default' : 'outline'"
            :aria-pressed="isPriorityFilter"
            class="shrink-0 cursor-pointer"
            @click="togglePriorityFilter"
          >
            Priority Applicants ({{ priorityApplicantsCount }})
          </Button>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <SearchSelect
              v-model="selectedLpiiFilter"
              :options="[{ value: 'ALL', label: 'All LPII Zones' }, { value: 'LOWLAND', label: 'Lowland' }, { value: 'UPLAND', label: 'Upland' }, { value: 'WETLAND', label: 'Wetland' }]"
              size="sm"
              class="w-40"
              aria-label="Filter by LPII zone"
            />

            <SearchSelect
              v-model="selectedStatusFilter"
              :options="[{ value: 'ALL', label: 'All Statuses' }, { value: 'Pending', label: 'Pending' }, { value: 'Approved', label: 'Approved' }, { value: 'Hired', label: 'Hired' }]"
              size="sm"
              class="w-36"
              aria-label="Filter by status"
            />

            <Label class="cursor-pointer font-normal text-muted-foreground">
              <Checkbox v-model="onlyAvailable" />
              Hide already deployed
            </Label>
          </div>

          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {{ filteredApplicants.length }} candidate{{ filteredApplicants.length === 1 ? '' : 's' }}
              <template v-if="isPriorityFilter"> · priority score ≥ 70</template>
            </span>
            <Button
              v-if="searchQuery || selectedLpiiFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || !onlyAvailable || isPriorityFilter"
              variant="link"
              size="sm"
              class="h-auto cursor-pointer p-0 text-muted-foreground"
              @click="resetForm"
            >
              Clear all
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-0">
        <!-- Mobile: swipeable cards (DESIGN.md 13.2) -->
        <SwipeCardList
          class="p-3 md:hidden"
          :items="paginatedApplicants"
          :item-key="(applicant) => applicant.id"
          :card="getCandidateCard"
          :actions="getCandidateSwipeActions"
          primary-tone="primary"
          hint="Swipe left on a candidate to select them."
        >
          <template #empty>
            <p class="py-8 text-center text-sm text-muted-foreground">No candidates match your criteria.</p>
          </template>
        </SwipeCardList>

        <!-- Desktop: table -->
        <div class="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow class="bg-muted/40 hover:bg-muted/40">
                <TableHead class="min-w-64">Candidate</TableHead>
                <TableHead>Location & LPII</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Priority Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead class="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="paginatedApplicants.length > 0">
                <TableRow
                  v-for="applicant in paginatedApplicants"
                  :key="applicant.id"
                  :data-state="selectedApplicant?.id === applicant.id ? 'selected' : undefined"
                >
                  <TableCell>
                    <div class="flex items-center gap-2.5">
                      <Avatar class="size-8 shrink-0 border">
                        <AvatarFallback class="text-xs font-semibold">
                          {{ getInitials(applicant.fullName) }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="flex min-w-0 flex-col">
                        <span class="truncate text-sm font-medium">{{ applicant.fullName }}</span>
                        <span class="text-xs text-muted-foreground">
                          {{ applicant.gender }} · <span class="font-mono">{{ applicant.code }}</span>
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div class="flex flex-col items-start gap-1">
                      <span class="text-sm">{{ applicant.municipality }} <span class="text-muted-foreground">(Brgy. {{ applicant.barangay }})</span></span>
                      <Badge variant="outline" :class="LPII_CONFIG[applicant.lpiiTag]?.badgeClass">
                        {{ LPII_CONFIG[applicant.lpiiTag]?.label }}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span class="block max-w-48 truncate text-sm" :title="applicant.course">{{ applicant.course }}</span>
                  </TableCell>

                  <TableCell>
                    <div class="flex flex-col">
                      <span :class="['text-sm tabular-nums', getScoreClass(applicant.totalPriorityScore)]">
                        {{ applicant.totalPriorityScore ?? 0 }} pts
                      </span>
                      <span v-if="applicant.priorityRank" class="text-xs text-muted-foreground">
                        Rank #{{ applicant.priorityRank }}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      :class="getGipStatusBadgeClass(isApplicantDeployed(applicant) ? 'Hired' : applicant.status || 'Pending')"
                    >
                      {{ isApplicantDeployed(applicant) ? 'Deployed' : applicant.status || 'Pending' }}
                    </Badge>
                  </TableCell>

                  <TableCell class="text-right">
                    <Button
                      size="sm"
                      :variant="selectedApplicant?.id === applicant.id ? 'default' : 'outline'"
                      class="cursor-pointer"
                      @click="selectApplicant(applicant)"
                    >
                      {{ selectedApplicant?.id === applicant.id ? 'Selected' : 'Select' }}
                    </Button>
                  </TableCell>
                </TableRow>
              </template>

              <TableRow v-else class="hover:bg-transparent">
                <TableCell colspan="6" class="p-0 whitespace-normal">
                  <Empty class="py-10">
                    <EmptyHeader>
                      <EmptyTitle>No candidates match your criteria</EmptyTitle>
                      <EmptyDescription>
                        Try adjusting the search, unchecking "Hide already deployed", or turning off the priority filter.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button variant="outline" size="sm" class="cursor-pointer" @click="resetForm">
                        Clear All Filters
                      </Button>
                    </EmptyContent>
                  </Empty>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- Pagination -->
        <div
          v-if="filteredApplicants.length > 0"
          class="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row"
        >
          <p>
            Showing
            <span class="font-medium text-foreground">{{ (currentPage - 1) * pageSize + 1 }}</span>–<span class="font-medium text-foreground">{{ Math.min(currentPage * pageSize, filteredApplicants.length) }}</span>
            of <span class="font-medium text-foreground">{{ filteredApplicants.length }}</span> candidates
          </p>
          <div class="flex flex-wrap items-center justify-center gap-1">
            <Button
              variant="outline"
              size="sm"
              class="cursor-pointer"
              :disabled="currentPage <= 1"
              @click="currentPage--"
            >
              Previous
            </Button>
            <Button
              v-for="p in totalPages"
              :key="p"
              size="icon"
              :variant="currentPage === p ? 'default' : 'ghost'"
              class="size-8 cursor-pointer"
              :aria-current="currentPage === p ? 'page' : undefined"
              @click="currentPage = p"
            >
              {{ p }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="cursor-pointer"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- ═══ STEP 2: CONFIGURE DEPLOYMENT ═══ -->
    <template v-else-if="activeStep === 'configure-deployment'">
      <!-- Selected Candidate Summary -->
      <Card v-if="selectedApplicant">
        <CardContent class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
            <Avatar class="size-10 shrink-0 border">
              <AvatarFallback class="text-sm font-semibold">
                {{ getInitials(selectedApplicant.fullName) }}
              </AvatarFallback>
            </Avatar>
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-base font-semibold">{{ selectedApplicant.fullName }}</span>
                <Badge variant="outline" :class="LPII_CONFIG[selectedApplicant.lpiiTag]?.badgeClass">
                  {{ LPII_CONFIG[selectedApplicant.lpiiTag]?.label }}
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ selectedApplicant.municipality }}, Brgy. {{ selectedApplicant.barangay }} · {{ selectedApplicant.course }}
                <template v-if="(selectedApplicant.totalPriorityScore ?? 0) > 0">
                  · Score <span :class="getScoreClass(selectedApplicant.totalPriorityScore)">{{ selectedApplicant.totalPriorityScore }} pts</span>
                </template>
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" class="self-start cursor-pointer sm:self-auto" @click="activeStep = 'select-applicant'">
            Change Candidate
          </Button>
        </CardContent>
      </Card>

      <!-- Deployment Form -->
      <Card>
        <CardHeader>
          <CardTitle class="text-base">Deployment Parameters</CardTitle>
          <CardDescription>
            Configure the host agency, station assignment, daily stipend, and duration period.
          </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-6">
          <!-- Program -->
          <div class="grid gap-2">
            <Label>GIP Program Affiliation</Label>
            <div role="radiogroup" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                v-for="opt in programOptions"
                :key="opt.value"
                type="button"
                role="radio"
                :aria-checked="program === opt.value"
                :class="[
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                  program === opt.value ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted/50',
                ]"
                @click="program = opt.value"
              >
                <Avatar class="size-9 shrink-0 rounded-md border bg-background">
                  <img :src="opt.logo" :alt="opt.value" class="object-cover" />
                </Avatar>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2 text-sm font-semibold">
                    <span class="truncate">{{ opt.label }}</span>
                    <CheckCircle2 v-if="program === opt.value" class="size-4 shrink-0 text-primary" />
                  </div>
                  <p class="text-xs text-muted-foreground">{{ opt.description }}</p>
                </div>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <!-- Office -->
            <div class="grid gap-2 sm:col-span-2">
              <Label>Assigned Station / Office <span class="text-destructive">*</span></Label>
              <Combobox
                v-model="selectedOffice"
                v-model:search-term="officeSearchQuery"
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
                        <span v-else :class="!assignedOffice && 'text-muted-foreground'">
                          {{ assignedOffice || 'Select office...' }}
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

            <!-- Supervisor -->
            <div class="grid gap-2">
              <Label for="supervisor">Designated Supervisor / Station Head</Label>
              <Input
                id="supervisor"
                v-model="supervisor"
                placeholder="e.g. Maria Santos, Division Head"
                :class="selectedOffice?.office_head ? 'bg-muted/40' : ''"
                :readonly="!!selectedOffice?.office_head"
              />
              <p v-if="selectedOffice?.office_head" class="text-xs text-muted-foreground">
                Auto-filled from office directory
              </p>
            </div>

            <!-- Stipend -->
            <div class="grid gap-2">
              <Label for="stipend">Daily Allowance / Stipend Rate</Label>
              <Input id="stipend" v-model="stipend" placeholder="e.g. ₱479.35 / day" class="font-mono" />
            </div>

            <!-- Start Date -->
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

            <!-- End Date -->
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
                  <Calendar v-model="deploymentEndDate" initial-focus />
                </PopoverContent>
              </Popover>
            </div>

            <p v-if="formattedPeriod" class="text-sm text-muted-foreground sm:col-span-2">
              Deployment period: <span class="font-medium text-foreground">{{ formattedPeriod }}</span>
            </p>

            <!-- Status -->
            <div class="grid gap-2">
              <Label for="status">Deployment Status</Label>
              <SearchSelect
                v-model="status"
                :options="[{ value: 'Active', label: 'Active (Ongoing Deployment)' }, { value: 'Pending', label: 'Pending (Awaiting Orientation)' }, { value: 'Hired', label: 'Hired (Absorbed by Agency)' }]"
                id="status"
                class="w-full"
              />
            </div>

            <!-- Notes -->
            <div class="grid gap-2">
              <Label for="notes">Special Assignment Notes</Label>
              <Input id="notes" v-model="deploymentNotes" placeholder="e.g. Assigned to records digitizing project" />
            </div>
          </div>
        </CardContent>
        <CardFooter class="flex flex-col-reverse gap-3 border-t sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" class="cursor-pointer" @click="activeStep = 'select-applicant'">
            <ArrowLeft class="size-4 shrink-0" />
            Back to Candidate Selection
          </Button>
          <div class="flex items-center justify-end gap-2">
            <Button variant="outline" class="cursor-pointer" :disabled="isSubmitting" @click="goBack">
              Cancel
            </Button>
            <Button class="cursor-pointer" :disabled="isSubmitting" @click="handleDeployIntern">
              <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
              {{ isSubmitting ? 'Deploying...' : 'Deploy Intern' }}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </template>
  </div>
</template>
