<script setup lang="ts">
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  CheckIcon,
  ChevronsUpDownIcon,
  Filter,
  ListRestart,
  Loader2,
  MapPin,
  Mountain,
  Plus,
  Search,
  Sparkles,
  TreePine,
  Waves,
  X,
} from '@lucide/vue'
import { useGipAddIntern } from '@/composables/peso/provincialPeso/useGipAddIntern'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
} = useGipAddIntern()

function getScoreBadgeClass(score?: number | null) {
  const val = score ?? 0
  if (val >= 70) {
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
  }
  if (val >= 40) {
    return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
  }
  return 'bg-muted text-muted-foreground border-border'
}
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header & Breadcrumb Navigation ─── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <Button variant="ghost" size="sm" class="gap-1.5 px-2 cursor-pointer" @click="goBack">
            <ArrowLeft class="h-4 w-4" />
            <span>Back to Interns</span>
          </Button>
        </div>
        <div class="flex items-center gap-2.5 flex-wrap">
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
            Deploy GIP Intern
          </h1>
          <Badge variant="outline" class="font-mono text-xs">
            Step {{ activeStep === 'select-applicant' ? '1 of 2' : '2 of 2' }}
          </Badge>
        </div>
        <p class="text-sm text-muted-foreground">
          Select an applicant candidate from the registry and assign them to an official government station or office.
        </p>
      </div>

      <!-- Step Progress Navigation Pills -->
      <div class="flex items-center gap-2 self-start sm:self-auto rounded-lg border bg-muted/40 p-1">
        <Button
          size="sm"
          :variant="activeStep === 'select-applicant' ? 'default' : 'ghost'"
          class="h-8 px-3 text-xs cursor-pointer gap-1.5"
          @click="activeStep = 'select-applicant'"
        >
          <span class="flex h-4 w-4 items-center justify-center rounded-full bg-background/30 text-[10px] font-bold">1</span>
          <span>Select Candidate</span>
        </Button>
        <Button
          size="sm"
          :variant="activeStep === 'configure-deployment' ? 'default' : 'ghost'"
          class="h-8 px-3 text-xs cursor-pointer gap-1.5"
          :disabled="!selectedApplicant"
          @click="activeStep = 'configure-deployment'"
        >
          <span class="flex h-4 w-4 items-center justify-center rounded-full bg-background/30 text-[10px] font-bold">2</span>
          <span>Deployment Station</span>
        </Button>
      </div>
    </div>

    <!-- ─── Validation Error Banner ─── -->
    <div
      v-if="validationError"
      class="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive flex items-center justify-between shadow-2xs"
    >
      <div class="flex items-center gap-2">
        <X class="h-4 w-4 shrink-0" />
        <span>{{ validationError }}</span>
      </div>
      <button class="text-destructive hover:opacity-75 cursor-pointer" @click="validationError = null">
        <X class="h-4 w-4" />
      </button>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- STEP 1: SELECT APPLICANT CANDIDATE                              -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div v-if="activeStep === 'select-applicant'" class="space-y-4">
      <!-- Search & Filter Card -->
      <Card class="shadow-2xs">
        <CardContent class="p-4 space-y-3.5">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <!-- Search bar -->
            <div class="relative flex-1">
              <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                v-model="searchQuery"
                placeholder="Search candidate name, municipality, barangay, course, code..."
                class="pl-9 text-xs h-9"
              />
              <button
                v-if="searchQuery"
                class="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                @click="searchQuery = ''"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <!-- Priority Applicants Filter Button -->
            <Button
              size="sm"
              :variant="isPriorityFilter ? 'default' : 'outline'"
              :class="[
                'gap-1.5 text-xs font-semibold cursor-pointer shrink-0 transition-all',
                isPriorityFilter
                  ? 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 shadow-xs'
                  : 'border-amber-500/40 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/20'
              ]"
              @click="togglePriorityFilter"
            >
              <span>Priority Applicants</span>
              <Badge
                :variant="isPriorityFilter ? 'secondary' : 'outline'"
                class="ml-1 text-[10px] px-1.5 py-0"
                :class="isPriorityFilter ? 'bg-white/20 text-white border-transparent' : 'border-amber-500/30 text-amber-700 dark:text-amber-400'"
              >
                {{ priorityApplicantsCount }}
              </Badge>
            </Button>
          </div>

          <!-- Secondary Filters Row -->
          <div class="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t">
            <div class="flex flex-wrap items-center gap-2.5">
              <!-- LPII Filter -->
              <select
                v-model="selectedLpiiFilter"
                class="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">All LPII Zones</option>
                <option value="LOWLAND">Lowland Only</option>
                <option value="UPLAND">Upland Only</option>
                <option value="WETLAND">Wetland Only</option>
              </select>

              <!-- Status Filter -->
              <select
                v-model="selectedStatusFilter"
                class="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Hired">Hired</option>
              </select>

              <!-- Only Available Toggle -->
              <label class="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground text-xs select-none">
                <input
                  v-model="onlyAvailable"
                  type="checkbox"
                  class="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Hide already deployed</span>
              </label>

              <!-- Priority active badge -->
              <Badge
                v-if="isPriorityFilter"
                variant="outline"
                class="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 py-0 px-2"
              >
                <Sparkles class="h-3 w-3" />
                <span>Filtered by Priority Score (≥70 pts)</span>
              </Badge>
            </div>

            <div class="text-[11px] text-muted-foreground font-medium flex items-center gap-2">
              <span>Showing {{ filteredApplicants.length }} candidate{{ filteredApplicants.length === 1 ? '' : 's' }}</span>
              <Button
                v-if="searchQuery || selectedLpiiFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || !onlyAvailable || isPriorityFilter"
                variant="ghost"
                size="sm"
                class="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                @click="resetForm"
              >
                Clear all
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Candidates Table Card -->
      <Card class="shadow-2xs overflow-hidden">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="min-w-64 text-xs font-semibold">Candidate</TableHead>
                <TableHead class="text-xs font-semibold">Location & LPII</TableHead>
                <TableHead class="text-xs font-semibold">Course / Background</TableHead>
                <TableHead class="text-xs font-semibold">Priority Score</TableHead>
                <TableHead class="text-xs font-semibold">Status</TableHead>
                <TableHead class="text-right text-xs font-semibold pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="paginatedApplicants.length > 0">
                <TableRow
                  v-for="applicant in paginatedApplicants"
                  :key="applicant.id"
                  class="transition-colors hover:bg-muted/40"
                  :class="selectedApplicant?.id === applicant.id ? 'bg-primary/5' : ''"
                >
                  <!-- Candidate Name & Code -->
                  <TableCell class="py-3">
                    <div class="flex items-center gap-3">
                      <Avatar class="h-9 w-9 rounded-full border bg-muted shrink-0">
                        <AvatarFallback class="text-xs font-semibold text-primary">
                          {{ getInitials(applicant.fullName) }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="flex flex-col min-w-0">
                        <span class="font-semibold text-xs text-foreground truncate">
                          {{ applicant.fullName }}
                        </span>
                        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>{{ applicant.gender }}</span>
                          <span>•</span>
                          <span class="font-mono text-[10px]">{{ applicant.code }}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <!-- Location & LPII Tag -->
                  <TableCell class="py-3">
                    <div class="flex flex-col text-xs gap-1">
                      <div class="flex items-center gap-1 text-foreground">
                        <MapPin class="h-3 w-3 text-muted-foreground shrink-0" />
                        <span class="truncate">{{ applicant.municipality }} (Brgy. {{ applicant.barangay }})</span>
                      </div>
                      <div>
                        <Badge
                          variant="outline"
                          :class="['text-[10px] font-semibold py-0 px-1.5 gap-1', LPII_CONFIG[applicant.lpiiTag]?.badgeClass]"
                        >
                          <TreePine v-if="applicant.lpiiTag === 'LOWLAND'" class="h-3 w-3" />
                          <Mountain v-else-if="applicant.lpiiTag === 'UPLAND'" class="h-3 w-3" />
                          <Waves v-else class="h-3 w-3" />
                          {{ LPII_CONFIG[applicant.lpiiTag]?.label }}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>

                  <!-- Course -->
                  <TableCell class="py-3">
                    <span class="text-xs text-muted-foreground truncate block max-w-48" :title="applicant.course">
                      {{ applicant.course }}
                    </span>
                  </TableCell>

                  <!-- Priority Score & Rank -->
                  <TableCell class="py-3">
                    <div class="flex flex-col gap-0.5 items-start">
                      <Badge
                        variant="outline"
                        :class="['text-[11px] font-mono font-bold py-0.5 px-2 gap-1.5', getScoreBadgeClass(applicant.totalPriorityScore)]"
                      >
                        <Award class="h-3 w-3 text-amber-500 shrink-0" />
                        <span>{{ applicant.totalPriorityScore ?? 0 }} pts</span>
                      </Badge>
                      <span v-if="applicant.priorityRank" class="text-[10px] text-muted-foreground">
                        Rank #{{ applicant.priorityRank }}
                      </span>
                    </div>
                  </TableCell>

                  <!-- Status -->
                  <TableCell class="py-3">
                    <div class="flex flex-col gap-1 items-start">
                      <Badge
                        v-if="isApplicantDeployed(applicant)"
                        variant="outline"
                        class="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] py-0 px-1.5"
                      >
                        Deployed
                      </Badge>
                      <Badge
                        v-else-if="applicant.status === 'Approved'"
                        variant="outline"
                        class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-0 px-1.5"
                      >
                        Approved
                      </Badge>
                      <Badge
                        v-else
                        variant="secondary"
                        class="text-[10px] py-0 px-1.5"
                      >
                        {{ applicant.status || 'Pending' }}
                      </Badge>
                    </div>
                  </TableCell>

                  <!-- Action -->
                  <TableCell class="py-3 text-right pr-4">
                    <Button
                      size="sm"
                      :variant="selectedApplicant?.id === applicant.id ? 'default' : 'outline'"
                      class="h-8 px-3 text-xs cursor-pointer gap-1"
                      @click="selectApplicant(applicant)"
                    >
                      <CheckCircle2 v-if="selectedApplicant?.id === applicant.id" class="h-3.5 w-3.5" />
                      <Plus v-else class="h-3.5 w-3.5" />
                      <span>{{ selectedApplicant?.id === applicant.id ? 'Selected' : 'Deploy' }}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              </template>

              <!-- Empty State -->
              <TableRow v-else>
                <TableCell colspan="6" class="h-44 text-center text-muted-foreground">
                  <div class="flex flex-col items-center justify-center gap-2 py-6">
                    <Filter class="h-7 w-7 text-muted-foreground/50" />
                    <p class="text-sm font-semibold">No candidates match your criteria</p>
                    <p class="text-xs text-muted-foreground max-w-sm">
                      Try adjusting the search query, unchecking "Hide already deployed", or turning off the Priority Applicants filter.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      class="mt-2 text-xs cursor-pointer"
                      @click="resetForm"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <!-- Pagination Controls -->
        <div
          v-if="filteredApplicants.length > 0"
          class="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t text-xs text-muted-foreground bg-muted/10"
        >
          <div>
            Showing <span class="font-medium text-foreground">{{ (currentPage - 1) * pageSize + 1 }}</span>
            to <span class="font-medium text-foreground">{{ Math.min(currentPage * pageSize, filteredApplicants.length) }}</span>
            of <span class="font-medium text-foreground">{{ filteredApplicants.length }}</span> candidates
          </div>

          <div class="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs px-2.5 cursor-pointer"
              :disabled="currentPage <= 1"
              @click="currentPage--"
            >
              Previous
            </Button>
            <div class="flex items-center gap-1">
              <Button
                v-for="p in totalPages"
                :key="p"
                size="sm"
                :variant="currentPage === p ? 'default' : 'outline'"
                class="h-8 w-8 p-0 text-xs cursor-pointer"
                @click="currentPage = p"
              >
                {{ p }}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="h-8 text-xs px-2.5 cursor-pointer"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════ -->
    <!-- STEP 2: CONFIGURE DEPLOYMENT STATION                            -->
    <!-- ═══════════════════════════════════════════════════════════════ -->
    <div v-else-if="activeStep === 'configure-deployment'" class="space-y-6">
      <!-- Selected Candidate Summary Banner -->
      <Card v-if="selectedApplicant" class="border-primary/20 bg-primary/5 shadow-2xs">
        <CardContent class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <Avatar class="h-12 w-12 border bg-background shrink-0">
              <AvatarFallback class="text-sm font-bold text-primary">
                {{ getInitials(selectedApplicant.fullName) }}
              </AvatarFallback>
            </Avatar>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-base text-foreground">{{ selectedApplicant.fullName }}</span>
                <Badge
                  variant="outline"
                  :class="['text-[10px] font-semibold py-0 px-1.5 gap-1', LPII_CONFIG[selectedApplicant.lpiiTag]?.badgeClass]"
                >
                  <TreePine v-if="selectedApplicant.lpiiTag === 'LOWLAND'" class="h-3 w-3" />
                  <Mountain v-else-if="selectedApplicant.lpiiTag === 'UPLAND'" class="h-3 w-3" />
                  <Waves v-else class="h-3 w-3" />
                  {{ LPII_CONFIG[selectedApplicant.lpiiTag]?.label }}
                </Badge>
                <Badge
                  v-if="(selectedApplicant.totalPriorityScore ?? 0) > 0"
                  variant="outline"
                  :class="['text-[10px] font-mono font-bold py-0 px-1.5 gap-1', getScoreBadgeClass(selectedApplicant.totalPriorityScore)]"
                >
                  <Award class="h-3 w-3 text-amber-500" />
                  <span>Score: {{ selectedApplicant.totalPriorityScore }} pts</span>
                </Badge>
              </div>
              <p class="text-xs text-muted-foreground mt-1">
                {{ selectedApplicant.municipality }}, Brgy. {{ selectedApplicant.barangay }} • {{ selectedApplicant.course }}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            class="text-xs cursor-pointer self-start sm:self-auto gap-1.5"
            @click="activeStep = 'select-applicant'"
          >
            <ListRestart class="h-3.5 w-3.5" />
            <span>Change Candidate</span>
          </Button>
        </CardContent>
      </Card>

      <!-- Deployment Configuration Form Card -->
      <Card class="shadow-2xs">
        <CardHeader class="pb-3 border-b">
          <CardTitle class="text-base font-semibold">Deployment Parameters</CardTitle>
          <CardDescription class="text-xs">
            Configure the host agency, station assignment, daily stipend, and duration period.
          </CardDescription>
        </CardHeader>
        <CardContent class="p-6 space-y-6">
          <!-- Program Selector: PGAS vs DOLE -->
          <div class="space-y-2.5">
            <Label class="text-xs font-semibold">GIP Program Affiliation</Label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <!-- PGAS Option -->
              <div
                class="relative flex items-center gap-3.5 rounded-lg border p-3.5 cursor-pointer transition-all"
                :class="program === 'PGAS' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/40 border-border'"
                @click="program = 'PGAS'"
              >
                <Avatar class="h-9 w-9 rounded-md border bg-background shrink-0">
                  <img :src="pgasLogo" alt="PGAS" class="object-cover" />
                </Avatar>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-xs text-foreground flex items-center justify-between">
                    <span>PGAS - Agusan del Sur</span>
                    <CheckCircle2 v-if="program === 'PGAS'" class="h-4 w-4 text-primary" />
                  </div>
                  <p class="text-[11px] text-muted-foreground mt-0.5">Provincial Gov't Funded • ₱479.35/day</p>
                </div>
              </div>

              <!-- DOLE Option -->
              <div
                class="relative flex items-center gap-3.5 rounded-lg border p-3.5 cursor-pointer transition-all"
                :class="program === 'DOLE' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/40 border-border'"
                @click="program = 'DOLE'"
              >
                <Avatar class="h-9 w-9 rounded-md border bg-background shrink-0">
                  <img :src="doleLogo" alt="DOLE" class="object-cover" />
                </Avatar>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-xs text-foreground flex items-center justify-between">
                    <span>DOLE - Field Office</span>
                    <CheckCircle2 v-if="program === 'DOLE'" class="h-4 w-4 text-primary" />
                  </div>
                  <p class="text-[11px] text-muted-foreground mt-0.5">National DOLE Program • ₱475/day</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Deployment Fields Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Assigned Office / Station — Searchable Combobox -->
            <div class="space-y-2 sm:col-span-2">
              <Label class="text-xs font-semibold flex items-center gap-1.5">
                <span>Assigned Station / Office</span>
                <span class="text-destructive">*</span>
              </Label>
              <Combobox
                v-model="selectedOffice"
                v-model:search-term="officeSearchQuery"
                :ignore-filter="true"
                by="id"
              >
                <ComboboxAnchor as-child>
                  <ComboboxTrigger as-child>
                    <Button
                      variant="outline"
                      class="w-full justify-between overflow-hidden h-9 text-xs"
                      :class="isLoadingOffices ? 'opacity-60' : ''"
                    >
                      <span class="truncate text-left flex-1">
                        <template v-if="isLoadingOffices">Loading offices...</template>
                        <template v-else-if="selectedOffice">{{ selectedOffice.office_name }}</template>
                        <template v-else>{{ assignedOffice || 'Select office...' }}</template>
                      </span>
                      <ChevronsUpDownIcon class="h-3.5 w-3.5 opacity-50 shrink-0" />
                    </Button>
                  </ComboboxTrigger>
                </ComboboxAnchor>

                <ComboboxList>
                  <ComboboxInput
                    placeholder="Search offices..."
                    class="text-xs"
                    @input="officeSearchQuery = ($event.target as HTMLInputElement).value"
                  />
                  <ComboboxViewport>
                    <ComboboxEmpty class="text-xs">No office found.</ComboboxEmpty>
                    <ComboboxGroup>
                      <ComboboxItem
                        v-for="office in filteredOffices"
                        :key="office.id"
                        :value="office"
                        class="text-xs"
                      >
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                          <span class="truncate">{{ office.office_name }}</span>
                          <Badge variant="secondary" class="text-[10px] py-0 px-1.5 shrink-0">
                            {{ office.office_code }}
                          </Badge>
                        </div>
                        <ComboboxItemIndicator>
                          <CheckIcon class="h-3.5 w-3.5" />
                        </ComboboxItemIndicator>
                      </ComboboxItem>
                    </ComboboxGroup>
                  </ComboboxViewport>
                </ComboboxList>
              </Combobox>
            </div>

            <!-- Designated Supervisor — Read-only when auto-filled -->
            <div class="space-y-2">
              <Label for="supervisor" class="text-xs font-semibold flex items-center gap-1.5">
                <span>Designated Supervisor / Station Head</span>
              </Label>
              <Input
                id="supervisor"
                v-model="supervisor"
                placeholder="e.g. Maria Santos, Division Head"
                class="text-xs h-9"
                :class="selectedOffice?.office_head ? 'bg-muted/40' : ''"
                :readonly="!!selectedOffice?.office_head"
              />
              <p v-if="selectedOffice?.office_head" class="text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 class="h-3 w-3 text-emerald-500 shrink-0" />
                Auto-filled from office directory
              </p>
            </div>

            <!-- Daily Allowance / Stipend -->
            <div class="space-y-2">
              <Label for="stipend" class="text-xs font-semibold flex items-center gap-1.5">
                <span>Daily Allowance / Stipend Rate</span>
              </Label>
              <Input
                id="stipend"
                v-model="stipend"
                placeholder="e.g. ₱479.35 / day"
                class="text-xs h-9 font-mono"
              />
            </div>

            <!-- Deployment Period — Calendar Date Range Picker -->
            <div class="space-y-2 sm:col-span-2">
              <Label class="text-xs font-semibold flex items-center gap-1.5">
                <span>Deployment Period</span>
              </Label>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- Start Date -->
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground font-medium">Start Date</span>
                  <Popover>
                    <PopoverTrigger as-child>
                      <Button
                        variant="outline"
                        :class="cn('w-full justify-start text-left font-normal h-9 text-xs', !deploymentStartDate && 'text-muted-foreground')"
                      >
                        <CalendarDays class="mr-2 h-3.5 w-3.5 shrink-0" />
                        <template v-if="deploymentStartDate">
                          {{ `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][deploymentStartDate.month - 1]} ${deploymentStartDate.day}, ${deploymentStartDate.year}` }}
                        </template>
                        <template v-else>Pick start date</template>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent class="w-auto p-0" align="start">
                      <Calendar v-model="deploymentStartDate" initial-focus />
                    </PopoverContent>
                  </Popover>
                </div>

                <!-- End Date -->
                <div class="space-y-1">
                  <span class="text-[11px] text-muted-foreground font-medium">End Date</span>
                  <Popover>
                    <PopoverTrigger as-child>
                      <Button
                        variant="outline"
                        :class="cn('w-full justify-start text-left font-normal h-9 text-xs', !deploymentEndDate && 'text-muted-foreground')"
                      >
                        <CalendarDays class="mr-2 h-3.5 w-3.5 shrink-0" />
                        <template v-if="deploymentEndDate">
                          {{ `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][deploymentEndDate.month - 1]} ${deploymentEndDate.day}, ${deploymentEndDate.year}` }}
                        </template>
                        <template v-else>Pick end date</template>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent class="w-auto p-0" align="start">
                      <Calendar v-model="deploymentEndDate" initial-focus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <!-- Formatted period preview -->
              <div v-if="formattedPeriod" class="rounded-md border bg-muted/30 px-3 py-2 text-xs text-foreground flex items-center gap-2">
                <CalendarDays class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span class="font-medium">{{ formattedPeriod }}</span>
              </div>
            </div>

            <!-- Deployment Status -->
            <div class="space-y-2">
              <Label for="status" class="text-xs font-semibold">Deployment Status</Label>
              <select
                id="status"
                v-model="status"
                class="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Active">Active (Ongoing Deployment)</option>
                <option value="Pending">Pending (Awaiting Orientation)</option>
                <option value="Hired">Hired (Absorbed by Agency)</option>
              </select>
            </div>

            <!-- Optional Notes / Remarks -->
            <div class="space-y-2">
              <Label for="notes" class="text-xs font-semibold">Special Assignment Notes</Label>
              <Input
                id="notes"
                v-model="deploymentNotes"
                placeholder="e.g. Assigned to records digitizing project"
                class="text-xs h-9"
              />
            </div>
          </div>

          <!-- Action buttons footer -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              class="text-xs cursor-pointer gap-1.5"
              @click="activeStep = 'select-applicant'"
            >
              <ArrowLeft class="h-3.5 w-3.5" />
              <span>Back to Candidate Selection</span>
            </Button>

            <div class="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                class="text-xs cursor-pointer"
                :disabled="isSubmitting"
                @click="goBack"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                class="text-xs cursor-pointer gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                :disabled="isSubmitting"
                @click="handleDeployIntern"
              >
                <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
                <span>Deploy Intern</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
