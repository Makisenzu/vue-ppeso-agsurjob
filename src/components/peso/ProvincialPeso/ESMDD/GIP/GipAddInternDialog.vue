<script setup lang="ts">
import {
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
  TreePine,
  Waves,
  X,
} from '@lucide/vue'
import { useGipAddIntern } from '@/composables/peso/provincialPeso/useGipAddIntern'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  isOpen,
  isSubmitting,
  activeStep,
  searchQuery,
  selectedLpiiFilter,
  selectedStatusFilter,
  onlyAvailable,
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
  handleClose,
  handleDeployIntern,
} = useGipAddIntern()
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-220 max-h-[92vh] flex flex-col p-0 overflow-hidden">
      <!-- ─── Dialog Header ─── -->
      <DialogHeader class="p-5 pb-4 border-b bg-card/60 backdrop-blur-xs">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="space-y-1">
            <DialogTitle class="text-lg font-bold flex items-center gap-2">
              <span>Add GIP Intern from Applicant Registry</span>
            </DialogTitle>
          </div>
        </div>
      </DialogHeader>

      <!-- ─── Validation Error Banner ─── -->
      <div v-if="validationError" class="bg-destructive/10 border-b border-destructive/20 px-5 py-2.5 text-xs text-destructive flex items-center justify-between">
        <span>{{ validationError }}</span>
        <button class="text-destructive hover:opacity-75 cursor-pointer" @click="validationError = null">
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- ─── Step 1: Select Applicant ─── -->
      <div v-if="activeStep === 'select-applicant'" class="flex-1 flex flex-col min-h-0 overflow-hidden">
        <!-- Search & Filter Toolbar -->
        <div class="p-4 border-b bg-muted/20 space-y-3">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <!-- Search bar -->
            <div class="relative flex-1">
              <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                v-model="searchQuery"
                placeholder="Search applicant name, municipality, barangay, course..."
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
          </div>

          <!-- Filter row -->
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="flex flex-wrap items-center gap-2">
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
            </div>

            <div class="text-[11px] text-muted-foreground font-medium">
              Showing {{ filteredApplicants.length }} candidate{{ filteredApplicants.length === 1 ? '' : 's' }}
            </div>
          </div>
        </div>

        <!-- Table of Applicants -->
        <div class="flex-1 overflow-y-auto min-h-60">
          <Table>
            <TableHeader class="bg-muted/40 sticky top-0 z-10 backdrop-blur-xs">
              <TableRow>
                <TableHead class="w-60 text-xs font-semibold">Applicant Name & Code</TableHead>
                <TableHead class="text-xs font-semibold">Location & LPII</TableHead>
                <TableHead class="text-xs font-semibold">Course / Background</TableHead>
                <TableHead class="text-xs font-semibold">Status</TableHead>
                <TableHead class="text-right text-xs font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="filteredApplicants.length > 0">
                <TableRow
                  v-for="applicant in filteredApplicants"
                  :key="applicant.id"
                  class="transition-colors hover:bg-muted/40"
                  :class="selectedApplicant?.id === applicant.id ? 'bg-primary/5' : ''"
                >
                  <!-- Applicant Name -->
                  <TableCell class="py-2.5">
                    <div class="flex items-center gap-2.5">
                      <Avatar class="h-8 w-8 rounded-full border bg-muted shrink-0">
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
                  <TableCell class="py-2.5">
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
                  <TableCell class="py-2.5">
                    <span class="text-xs text-muted-foreground truncate block max-w-40" :title="applicant.course">
                      {{ applicant.course }}
                    </span>
                  </TableCell>

                  <!-- Status -->
                  <TableCell class="py-2.5">
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
                  <TableCell class="py-2.5 text-right">
                    <Button
                      size="sm"
                      :variant="selectedApplicant?.id === applicant.id ? 'default' : 'outline'"
                      class="h-7 px-2.5 text-xs cursor-pointer gap-1"
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
                <TableCell colspan="5" class="h-36 text-center text-muted-foreground">
                  <div class="flex flex-col items-center justify-center gap-2 py-4">
                    <Filter class="h-6 w-6 text-muted-foreground/50" />
                    <p class="text-xs font-semibold">No candidates match your search</p>
                    <p class="text-[11px] text-muted-foreground">
                      Try adjusting the search query or uncheck "Hide already deployed".
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      class="mt-1 text-xs cursor-pointer"
                      @click="searchQuery = ''; selectedLpiiFilter = 'ALL'; onlyAvailable = false"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <!-- ─── Step 2: Configure Deployment ─── -->
      <div v-else-if="activeStep === 'configure-deployment'" class="flex-1 overflow-y-auto p-5 space-y-5">
        <!-- Selected Applicant Summary Card -->
        <div v-if="selectedApplicant" class="rounded-lg border bg-muted/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <Avatar class="h-10 w-10 border bg-background shrink-0">
              <AvatarFallback class="text-sm font-bold text-primary">
                {{ getInitials(selectedApplicant.fullName) }}
              </AvatarFallback>
            </Avatar>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-foreground">{{ selectedApplicant.fullName }}</span>
                <Badge
                  variant="outline"
                  :class="['text-[10px] font-semibold py-0 px-1.5 gap-1', LPII_CONFIG[selectedApplicant.lpiiTag]?.badgeClass]"
                >
                  <TreePine v-if="selectedApplicant.lpiiTag === 'LOWLAND'" class="h-3 w-3" />
                  <Mountain v-else-if="selectedApplicant.lpiiTag === 'UPLAND'" class="h-3 w-3" />
                  <Waves v-else class="h-3 w-3" />
                  {{ LPII_CONFIG[selectedApplicant.lpiiTag]?.label }}
                </Badge>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">
                {{ selectedApplicant.municipality }}, Brgy. {{ selectedApplicant.barangay }} • {{ selectedApplicant.course }}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            class="text-xs cursor-pointer self-start sm:self-auto gap-1 text-muted-foreground hover:text-foreground"
            @click="activeStep = 'select-applicant'"
          >
            <ListRestart class="h-3.5 w-3.5" />
            <span>Change Candidate</span>
          </Button>
        </div>

        <!-- Program Selector: PGAS vs DOLE -->
        <div class="space-y-2">
          <Label class="text-xs font-semibold">GIP Program Affiliation</Label>
          <div class="grid grid-cols-2 gap-3">
            <!-- PGAS Option -->
            <div
              class="relative flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all"
              :class="program === 'PGAS' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/40 border-border'"
              @click="program = 'PGAS'"
            >
              <Avatar class="h-8 w-8 rounded-md border bg-background shrink-0">
                <img :src="pgasLogo" alt="PGAS" class="object-cover" />
              </Avatar>
              <div class="flex-1 min-w-0">
                <div class="font-bold text-xs text-foreground flex items-center justify-between">
                  <span>PGAS - Agusan del Sur</span>
                  <CheckCircle2 v-if="program === 'PGAS'" class="h-4 w-4 text-primary" />
                </div>
                <p class="text-[11px] text-muted-foreground">Provincial Gov't Funded • ₱479.35/day</p>
              </div>
            </div>

            <!-- DOLE Option -->
            <div
              class="relative flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all"
              :class="program === 'DOLE' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/40 border-border'"
              @click="program = 'DOLE'"
            >
              <Avatar class="h-8 w-8 rounded-md border bg-background shrink-0">
                <img :src="doleLogo" alt="DOLE" class="object-cover" />
              </Avatar>
              <div class="flex-1 min-w-0">
                <div class="font-bold text-xs text-foreground flex items-center justify-between">
                  <span>DOLE - Field Office</span>
                  <CheckCircle2 v-if="program === 'DOLE'" class="h-4 w-4 text-primary" />
                </div>
                <p class="text-[11px] text-muted-foreground">National DOLE Program • ₱475/day</p>
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
              placeholder="e.g. ₱420.00 / day"
              class="text-xs h-9 font-mono"
            />
          </div>

          <!-- Deployment Period — Calendar Date Range Picker -->
          <div class="space-y-2 sm:col-span-2">
            <Label class="text-xs font-semibold flex items-center gap-1.5">
              <span>Deployment Period</span>
            </Label>

            <div class="grid grid-cols-2 gap-3">
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
      </div>

      <!-- ─── Dialog Footer ─── -->
      <DialogFooter class="p-4 border-t bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div class="text-[11px] text-muted-foreground">
          <span v-if="activeStep === 'select-applicant'">
            Select a jobseeker candidate above to configure deployment station.
          </span>
          <span v-else-if="selectedApplicant">
            Ready to deploy candidate <strong class="text-foreground">{{ selectedApplicant.fullName }}</strong>.
          </span>
        </div>

        <div class="flex items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            class="text-xs cursor-pointer"
            :disabled="isSubmitting"
            @click="handleClose"
          >
            Cancel
          </Button>

          <Button
            v-if="activeStep === 'select-applicant'"
            variant="default"
            size="sm"
            class="text-xs cursor-pointer gap-1.5"
            :disabled="!selectedApplicant"
            @click="activeStep = 'configure-deployment'"
          >
            <span>Continue</span>
          </Button>

          <Button
            v-else-if="activeStep === 'configure-deployment'"
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
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
