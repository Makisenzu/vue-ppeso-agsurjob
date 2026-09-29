<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  History,
  Info,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
} from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxGroup,
  ComboboxItemIndicator,
} from '@/components/ui/combobox'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import { cn } from '@/lib/utils'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import { directoryService } from '@/services/common/directoryService'
import type { DirectoryRow } from '@/types/common/directory'
import { getInitials } from '@/helpers/peso/provincialPeso/gipHelper'
import pgasLogo from '@/assets/images/agsur.png'
import doleLogo from '@/assets/images/dole.png'

const gipStore = useGipStore()

const isOpen = computed({
  get: () => gipStore.isRenewalDialogOpen,
  set: (val: boolean) => {
    if (!val) gipStore.closeRenewalDialog()
  },
})

const intern = computed(() => gipStore.selectedInternForRenewal)
const isSubmitting = computed(() => gipStore.isSubmittingRenewal)

// Active action mode: 'renew' | 'conclude'
const actionMode = ref<'renew' | 'conclude'>('renew')

// Form fields for Renewal
const program = ref<'PGAS' | 'DOLE'>('PGAS')
const assignedOffice = ref<string>('')
const supervisor = ref<string>('')
const stipend = ref<string>('₱479.35 / day')
const renewalNotes = ref<string>('')
const validationError = ref<string | null>(null)

// Form fields for Conclusion
const concludeAction = ref<'Completed' | 'Hired' | 'Terminated'>('Completed')
const concludeNotes = ref<string>('')

// Office Directory State
const offices = ref<DirectoryRow[]>([])
const officeSearchQuery = ref<string>('')
const selectedOffice = ref<DirectoryRow | null>(null)
const isLoadingOffices = ref<boolean>(false)

const filteredOffices = computed(() => {
  if (!officeSearchQuery.value.trim()) return offices.value
  const q = officeSearchQuery.value.toLowerCase().trim()
  return offices.value.filter(
    (o) =>
      o.office_name.toLowerCase().includes(q) ||
      o.office_code.toLowerCase().includes(q) ||
      (o.office_head && o.office_head.toLowerCase().includes(q)),
  )
})

async function fetchOffices() {
  if (offices.value.length > 0) return
  isLoadingOffices.value = true
  try {
    offices.value = await directoryService.fetchActiveOffices()
  } catch (err: any) {
    console.error('Failed to fetch offices:', err.message)
  } finally {
    isLoadingOffices.value = false
  }
}

// ─── Date Range Setup for Renewal ───
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const startDate = ref<any>(null)
const endDate = ref<any>(null)

function formatCalendarDate(d: any): string {
  if (!d || typeof d.month !== 'number' || typeof d.day !== 'number') return ''
  return `${MONTH_NAMES[d.month - 1]} ${d.day}, ${d.year}`
}

function toIsoString(d: any): string {
  if (!d) return ''
  const m = String(d.month).padStart(2, '0')
  const day = String(d.day).padStart(2, '0')
  return `${d.year}-${m}-${day}`
}

const currentTermNumber = computed<number>(() => {
  return intern.value?.currentAppointment?.termNumber || 1
})

const nextTermNumber = computed<number>(() => {
  return currentTermNumber.value + 1
})

// Initialize form when intern changes or dialog opens
watch([isOpen, intern], ([open, currentIntern]) => {
  if (open && currentIntern) {
    actionMode.value = 'renew'
    validationError.value = null
    fetchOffices()

    program.value = currentIntern.program || 'PGAS'
    assignedOffice.value = currentIntern.assignedOffice || ''
    supervisor.value = currentIntern.supervisor || ''
    stipend.value = currentIntern.stipend || (program.value === 'DOLE' ? '₱475.00 / day' : '₱479.35 / day')
    renewalNotes.value = ''
    concludeAction.value = 'Completed'
    concludeNotes.value = ''

    // Match office
    if (offices.value.length > 0) {
      selectedOffice.value = offices.value.find((o) => o.office_name.toLowerCase() === currentIntern.assignedOffice.toLowerCase()) || null
    }

    // Initialize renewal dates:
    // Start date = day after previous appointment end date, or today if missing/past
    const curEnd = currentIntern.currentAppointment?.endDate
    const now = today(getLocalTimeZone())

    if (curEnd) {
      const [y, m, d] = curEnd.split('-').map(Number)
      if (y && m && d) {
        const prevEndCal = new CalendarDate(y, m, d)
        startDate.value = prevEndCal.add({ days: 1 })
      } else {
        startDate.value = now
      }
    } else {
      startDate.value = now
    }

    // Default duration: 6 months
    applyDurationPreset(6)
  }
})

// Watch office selection
watch(selectedOffice, (off) => {
  if (off) {
    assignedOffice.value = off.office_name
    if (off.office_head) supervisor.value = off.office_head
  }
})

// Sync stipend with program
watch(program, (p) => {
  if (p === 'DOLE') {
    if (stipend.value === '₱479.35 / day' || !stipend.value) {
      stipend.value = '₱475.00 / day'
    }
  } else {
    if (stipend.value === '₱475.00 / day' || !stipend.value) {
      stipend.value = '₱479.35 / day'
    }
  }
})

function applyDurationPreset(months: number) {
  if (!startDate.value) return
  endDate.value = startDate.value.add({ months }).subtract({ days: 1 })
}

async function handleConfirm() {
  if (!intern.value) return
  validationError.value = null

  if (actionMode.value === 'renew') {
    if (!startDate.value || !endDate.value) {
      validationError.value = 'Please specify valid start and end dates for the renewed appointment.'
      return
    }
    if (!assignedOffice.value.trim()) {
      validationError.value = 'Please select or provide an assigned office/station.'
      return
    }

    await gipStore.renewInternAppointment({
      gipId: intern.value.id,
      currentAppointmentId: intern.value.currentAppointment?.id,
      nextTermNumber: nextTermNumber.value,
      program: program.value,
      assignedOffice: assignedOffice.value.trim(),
      supervisor: supervisor.value.trim() || undefined,
      stipend: stipend.value.trim(),
      startDate: toIsoString(startDate.value),
      endDate: toIsoString(endDate.value),
      remarks: renewalNotes.value.trim() || undefined,
    })
  } else {
    // Conclude action
    await gipStore.concludeInternAppointment({
      gipId: intern.value.id,
      appointmentId: intern.value.currentAppointment?.id,
      action: concludeAction.value,
      remarks: concludeNotes.value.trim() || undefined,
    })
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-160 max-h-[92vh] overflow-y-auto">
      <!-- ─── Dialog Header ─── -->
      <DialogHeader>
        <div class="flex items-start justify-between gap-3 pr-6">
          <div class="flex items-center gap-3">
            <Avatar class="h-10 w-10 border bg-muted shrink-0">
              <AvatarFallback class="font-semibold text-sm text-primary">
                {{ intern ? getInitials(intern.fullName) : 'GIP' }}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle class="text-base font-bold">
                {{ intern?.fullName }}
              </DialogTitle>
              <DialogDescription class="text-xs flex items-center gap-1.5 mt-0.5">
                <span class="font-mono">{{ intern?.code }}</span>
                <span>•</span>
                <span>{{ intern?.municipality }}</span>
                <span>•</span>
                <span class="font-semibold text-foreground">Term #{{ currentTermNumber }}</span>
              </DialogDescription>
            </div>
          </div>
          <!-- Current status badge -->
          <div v-if="intern">
            <Badge
              v-if="intern.currentAppointment?.isExpired"
              variant="destructive"
              class="text-xs font-semibold gap-1"
            >
              <Clock class="h-3 w-3" />
              Expired Appointment
            </Badge>
            <Badge
              v-else-if="intern.currentAppointment?.isExpiringSoon"
              variant="outline"
              class="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs font-semibold gap-1"
            >
              <Clock class="h-3 w-3" />
              Ends in {{ intern.daysRemaining }} days
            </Badge>
            <Badge
              v-else
              variant="outline"
              class="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold gap-1"
            >
              <CheckCircle2 class="h-3 w-3" />
              Active
            </Badge>
          </div>
        </div>
      </DialogHeader>

      <div v-if="intern" class="grid gap-4 py-2 text-xs">
        <!-- ─── Current Appointment Summary Card ─── -->
        <div class="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Info class="h-3.5 w-3.5 text-primary" />
              Current Appointment (Term #{{ currentTermNumber }})
            </span>
            <span class="font-mono text-[11px] text-muted-foreground">
              {{ intern.currentAppointment?.appointmentCode || 'N/A' }}
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div class="flex flex-col">
              <span class="text-[10px] text-muted-foreground">Host Office</span>
              <span class="font-medium truncate text-foreground" :title="intern.assignedOffice">
                {{ intern.assignedOffice }}
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-[10px] text-muted-foreground">Supervisor</span>
              <span class="font-medium truncate text-foreground" :title="intern.supervisor">
                {{ intern.supervisor }}
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-[10px] text-muted-foreground">Program & Rate</span>
              <span class="font-medium text-foreground">
                {{ intern.program }} • {{ intern.stipend }}
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-[10px] text-muted-foreground">Period Coverage</span>
              <span class="font-medium text-foreground">
                {{ intern.period }}
              </span>
            </div>
          </div>
        </div>

        <!-- ─── Decision Mode Tabs ─── -->
        <div class="grid grid-cols-2 gap-2 p-1 rounded-lg border bg-muted/40">
          <button
            type="button"
            class="flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer"
            :class="actionMode === 'renew' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
            @click="actionMode = 'renew'"
          >
            <RefreshCw class="h-3.5 w-3.5 text-primary" />
            <span>Renew Appointment (Term #{{ nextTermNumber }})</span>
          </button>
          <button
            type="button"
            class="flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer"
            :class="actionMode === 'conclude' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'"
            @click="actionMode = 'conclude'"
          >
            <UserX class="h-3.5 w-3.5 text-rose-500" />
            <span>Conclude Internship (Do Not Renew)</span>
          </button>
        </div>

        <!-- ─── OPTION 1: RENEW APPOINTMENT FORM ─── -->
        <div v-if="actionMode === 'renew'" class="space-y-3.5 pt-1">
          <!-- Funding Program -->
          <div class="space-y-1.5">
            <Label class="text-xs font-semibold">Funding Program</Label>
            <div class="grid grid-cols-2 gap-2">
              <div
                class="flex items-center gap-2.5 rounded-lg border p-2 cursor-pointer transition-all"
                :class="program === 'PGAS' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/40 border-border'"
                @click="program = 'PGAS'"
              >
                <Avatar class="h-6 w-6 rounded-md border bg-background shrink-0">
                  <img :src="pgasLogo" alt="PGAS" class="object-cover" />
                </Avatar>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-xs flex items-center justify-between">
                    <span>PGAS</span>
                    <CheckCircle2 v-if="program === 'PGAS'" class="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p class="text-[10px] text-muted-foreground">Provincial • ₱479.35 / day</p>
                </div>
              </div>

              <div
                class="flex items-center gap-2.5 rounded-lg border p-2 cursor-pointer transition-all"
                :class="program === 'DOLE' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/40 border-border'"
                @click="program = 'DOLE'"
              >
                <Avatar class="h-6 w-6 rounded-md border bg-background shrink-0">
                  <img :src="doleLogo" alt="DOLE" class="object-cover" />
                </Avatar>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-xs flex items-center justify-between">
                    <span>DOLE</span>
                    <CheckCircle2 v-if="program === 'DOLE'" class="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p class="text-[10px] text-muted-foreground">National • ₱475.00 / day</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Date Range Pickers with Presets -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <Label class="text-xs font-semibold flex items-center gap-1.5">
                <span>Renewed Term Period</span>
                <span class="text-destructive">*</span>
              </Label>
              <div class="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-6 text-[10px] px-2 cursor-pointer"
                  @click="applyDurationPreset(3)"
                >
                  +3 Months
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-6 text-[10px] px-2 cursor-pointer"
                  @click="applyDurationPreset(6)"
                >
                  +6 Months
                </Button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <!-- Start Date -->
              <div class="space-y-1">
                <span class="text-[11px] text-muted-foreground font-medium">Start Date</span>
                <Popover>
                  <PopoverTrigger as-child>
                    <Button
                      variant="outline"
                      :class="cn('w-full justify-start text-left font-normal h-8.5 text-xs', !startDate && 'text-muted-foreground')"
                    >
                      <CalendarDays class="mr-2 h-3.5 w-3.5 shrink-0" />
                      <span>{{ startDate ? formatCalendarDate(startDate) : 'Select start date' }}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" align="start">
                    <Calendar v-model="startDate" initial-focus />
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
                      :class="cn('w-full justify-start text-left font-normal h-8.5 text-xs', !endDate && 'text-muted-foreground')"
                    >
                      <CalendarDays class="mr-2 h-3.5 w-3.5 shrink-0" />
                      <span>{{ endDate ? formatCalendarDate(endDate) : 'Select end date' }}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" align="start">
                    <Calendar v-model="endDate" initial-focus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <!-- Assigned Office & Supervisor -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <Label class="text-xs font-semibold">Assigned Office / Station</Label>
              <Combobox
                v-model="selectedOffice"
                v-model:search-term="officeSearchQuery"
                :ignore-filter="true"
              >
                <ComboboxAnchor class="w-full">
                  <ComboboxTrigger as-child>
                    <Button
                      variant="outline"
                      role="combobox"
                      class="w-full justify-between h-8.5 text-xs font-normal"
                    >
                      <span class="truncate">{{ assignedOffice || 'Select station...' }}</span>
                      <Loader2 v-if="isLoadingOffices" class="ml-2 h-3 w-3 shrink-0 animate-spin opacity-50" />
                    </Button>
                  </ComboboxTrigger>
                </ComboboxAnchor>
                <ComboboxList class="w-(--reka-combobox-trigger-width) p-0 max-h-60 overflow-y-auto">
                  <ComboboxInput
                    placeholder="Search office or department..."
                    class="h-8.5 text-xs"
                  />
                  <ComboboxEmpty class="text-xs p-2 text-muted-foreground">
                    No office found.
                  </ComboboxEmpty>
                  <ComboboxGroup>
                    <ComboboxItem
                      v-for="off in filteredOffices"
                      :key="off.id"
                      :value="off"
                      class="text-xs py-1.5"
                    >
                      <div class="flex flex-col">
                        <span class="font-medium">{{ off.office_name }}</span>
                        <span class="text-[10px] text-muted-foreground">{{ off.office_head || 'No Head Designated' }}</span>
                      </div>
                      <ComboboxItemIndicator class="ml-auto">
                        <CheckCircle2 class="h-3 w-3 text-primary" />
                      </ComboboxItemIndicator>
                    </ComboboxItem>
                  </ComboboxGroup>
                </ComboboxList>
              </Combobox>
            </div>

            <div class="space-y-1.5">
              <Label class="text-xs font-semibold">Designated Supervisor</Label>
              <Input
                v-model="supervisor"
                placeholder="Supervisor name"
                class="h-8.5 text-xs"
              />
            </div>
          </div>

          <!-- Daily Stipend & Notes -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="space-y-1.5">
              <Label class="text-xs font-semibold">Daily Stipend</Label>
              <Input
                v-model="stipend"
                placeholder="e.g. ₱479.35 / day"
                class="h-8.5 text-xs font-mono"
              />
            </div>
            <div class="sm:col-span-2 space-y-1.5">
              <Label class="text-xs font-semibold">Renewal Notes & Performance Justification</Label>
              <Input
                v-model="renewalNotes"
                placeholder="e.g. Satisfactory performance in Term 1, renewed for another 6 months."
                class="h-8.5 text-xs"
              />
            </div>
          </div>
        </div>

        <!-- ─── OPTION 2: CONCLUDE INTERNSHIP FORM ─── -->
        <div v-else class="space-y-3.5 pt-1">
          <div class="space-y-1.5">
            <Label class="text-xs font-semibold">Concluding Status</Label>
            <div class="grid grid-cols-3 gap-2">
              <div
                class="flex flex-col items-center justify-center p-2.5 rounded-lg border cursor-pointer text-center transition-all"
                :class="concludeAction === 'Completed' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/40'"
                @click="concludeAction = 'Completed'"
              >
                <UserCheck class="h-5 w-5 text-emerald-500 mb-1" />
                <span class="font-semibold text-xs">Completed</span>
                <span class="text-[10px] text-muted-foreground mt-0.5">Finished Term</span>
              </div>

              <div
                class="flex flex-col items-center justify-center p-2.5 rounded-lg border cursor-pointer text-center transition-all"
                :class="concludeAction === 'Hired' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/40'"
                @click="concludeAction = 'Hired'"
              >
                <CheckCircle2 class="h-5 w-5 text-blue-500 mb-1" />
                <span class="font-semibold text-xs">Hired / Absorbed</span>
                <span class="text-[10px] text-muted-foreground mt-0.5">Employed by Office</span>
              </div>

              <div
                class="flex flex-col items-center justify-center p-2.5 rounded-lg border cursor-pointer text-center transition-all"
                :class="concludeAction === 'Terminated' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/40'"
                @click="concludeAction = 'Terminated'"
              >
                <UserX class="h-5 w-5 text-rose-500 mb-1" />
                <span class="font-semibold text-xs">Resigned</span>
                <span class="text-[10px] text-muted-foreground mt-0.5">Discontinued Early</span>
              </div>
            </div>
          </div>

          <div class="space-y-1.5">
            <Label class="text-xs font-semibold">Exit / Concluding Remarks</Label>
            <Input
              v-model="concludeNotes"
              placeholder="e.g. Intern completed standard 6-month DOLE GIP program. Certificate issued."
              class="h-8.5 text-xs"
            />
          </div>
        </div>

        <!-- ─── Appointment History Timeline ─── -->
        <div v-if="intern.appointmentHistory && intern.appointmentHistory.length > 0" class="rounded-lg border bg-muted/20 p-3 mt-1">
          <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <History class="h-3.5 w-3.5 text-primary" />
            Appointment History ({{ intern.appointmentHistory.length }} Term{{ intern.appointmentHistory.length > 1 ? 's' : '' }})
          </span>
          <div class="space-y-2">
            <div
              v-for="apt in intern.appointmentHistory"
              :key="apt.id"
              class="flex items-center justify-between p-2 rounded-md bg-background border text-[11px]"
            >
              <div class="flex items-center gap-2">
                <Badge variant="outline" class="font-mono text-[10px]">
                  Term #{{ apt.termNumber }}
                </Badge>
                <div>
                  <span class="font-medium text-foreground">{{ apt.assignedOffice }}</span>
                  <span class="text-muted-foreground block text-[10px]">
                    {{ apt.startDate }} to {{ apt.endDate }} • {{ apt.dailyStipend }}
                  </span>
                </div>
              </div>
              <Badge
                variant="outline"
                :class="[
                  apt.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                  apt.status === 'Renewed' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                  'bg-muted text-muted-foreground'
                ]"
              >
                {{ apt.status }}
              </Badge>
            </div>
          </div>
        </div>

        <!-- Validation Error Alert -->
        <p v-if="validationError" class="text-xs text-destructive font-medium">
          {{ validationError }}
        </p>
      </div>

      <!-- ─── Dialog Footer ─── -->
      <DialogFooter class="flex flex-row items-center justify-end gap-2 pt-3 border-t">
        <Button
          variant="outline"
          size="sm"
          class="text-xs cursor-pointer"
          :disabled="isSubmitting"
          @click="isOpen = false"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          class="text-xs cursor-pointer gap-1.5"
          :variant="actionMode === 'renew' ? 'default' : 'destructive'"
          :disabled="isSubmitting"
          @click="handleConfirm"
        >
          <Loader2 v-if="isSubmitting" class="h-3.5 w-3.5 animate-spin" />
          <RefreshCw v-else-if="actionMode === 'renew'" class="h-3.5 w-3.5" />
          <UserX v-else class="h-3.5 w-3.5" />
          <span>{{ isSubmitting ? 'Processing...' : actionMode === 'renew' ? `Confirm Term #${nextTermNumber} Renewal` : 'Confirm Conclusion' }}</span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
