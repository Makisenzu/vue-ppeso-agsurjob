<script setup lang="ts">
import { formatDisplayDate } from '@/helpers/common/dateFormatHelper'
import { ArrowLeft, CheckIcon, ChevronDown, ChevronsUpDownIcon, Loader2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
import SearchSelect from '@/components/SearchSelect.vue'
import type { DirectoryRow } from '@/types/common/directory'
import { useGipRenewAppointment } from '@/composables/peso/provincialPeso/useGipRenewAppointment'
import { getGipStatusBadgeClass } from '@/helpers/peso/provincialPeso/gipHelper'

const {
  intern,
  isLoading,
  canDecide,
  isSubmitting,
  actionMode,
  currentTermNumber,
  nextTermNumber,
  programOptions,
  concludeOptions,
  durationPresets,
  officeSearchQuery,
  filteredOffices,
  isLoadingOffices,
  findOffice,
  renewSchema,
  minStartDate,
  renewInitialValues,
  concludeSchema,
  concludeInitialValues,
  stipendForProgram,
  addDurationMonths,
  formatDeploymentDate,
  goBack,
  submitRenewal,
  submitConclusion,
} = useGipRenewAppointment()
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">
    <!-- ─── Header ─── -->
    <div class="space-y-1">
      <Button variant="ghost" size="sm" class="-ml-2 cursor-pointer" :disabled="isSubmitting" @click="goBack">
        <ArrowLeft class="size-4 shrink-0" />
        Back
      </Button>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Renew or Conclude Appointment</h1>
      <p v-if="intern" class="text-sm text-muted-foreground">
        {{ intern.fullName }} · <span class="font-mono">{{ intern.code }}</span> · {{ intern.municipality }}
      </p>
      <Skeleton v-else-if="isLoading" class="h-5 w-64" />
    </div>

    <!-- ─── Loading (opened directly, registry not loaded yet) ─── -->
    <div v-if="!intern && isLoading" class="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <Skeleton class="h-72 w-full lg:col-span-2" />
      <Skeleton class="h-96 w-full lg:col-span-3" />
    </div>

    <!-- ─── Not found / not active ─── -->
    <Card v-else-if="!intern || !canDecide">
      <CardContent>
        <Empty class="py-10">
          <EmptyHeader>
            <EmptyTitle>{{ intern ? 'No active appointment' : 'Intern not found' }}</EmptyTitle>
            <EmptyDescription>
              {{ intern
                ? `${intern.fullName}'s internship is ${intern.status.toLowerCase()}; there is no appointment to renew or conclude.`
                : 'This GIP intern record may have been removed.' }}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" variant="outline" class="cursor-pointer" @click="goBack">Back to Interns</Button>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>

    <div v-else class="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
      <!-- ─── Current Appointment ─── -->
      <Card class="min-w-0 lg:col-span-2">
        <CardHeader>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <CardTitle class="text-base">Current Appointment · Term {{ currentTermNumber }}</CardTitle>
            <Badge v-if="intern.currentAppointment?.isExpired" variant="destructive">Expired</Badge>
            <Badge
              v-else-if="intern.currentAppointment?.isExpiringSoon"
              variant="outline"
              class="border-warning/30 bg-warning/10 text-warning"
            >
              Ends in {{ intern.daysRemaining }} days
            </Badge>
            <Badge v-else variant="outline" :class="getGipStatusBadgeClass('Active')">Active</Badge>
          </div>
          <CardDescription>GIP {{ intern.program }} Intern</CardDescription>
        </CardHeader>
        <CardContent class="grid min-w-0 grid-cols-1 gap-4">
          <div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-1">
            <div class="min-w-0">
              <span class="text-xs text-muted-foreground">Host Office</span>
              <p class="text-sm font-medium">
                {{ intern.assignedOffice || '—' }}
                <span v-if="findOffice(intern.assignedOffice)" class="font-mono text-xs text-muted-foreground">
                  ({{ findOffice(intern.assignedOffice)?.office_code }})
                </span>
              </p>
            </div>
            <div class="min-w-0">
              <span class="text-xs text-muted-foreground">Supervisor</span>
              <p class="text-sm font-medium">{{ intern.supervisor || '—' }}</p>
            </div>
            <div class="min-w-0">
              <span class="text-xs text-muted-foreground">Program & Rate</span>
              <p class="text-sm font-medium">{{ intern.program }} · {{ intern.stipend }}</p>
            </div>
            <div class="min-w-0">
              <span class="text-xs text-muted-foreground">Period Coverage</span>
              <p class="text-sm font-medium">{{ intern.period }}</p>
            </div>
            <div v-if="intern.currentAppointment?.appointmentCode" class="min-w-0">
              <span class="text-xs text-muted-foreground">Appointment Code</span>
              <p class="font-mono text-sm font-medium">{{ intern.currentAppointment.appointmentCode }}</p>
            </div>
          </div>

          <!-- Appointment History -->
          <Collapsible v-if="intern.appointmentHistory && intern.appointmentHistory.length > 0">
            <CollapsibleTrigger as-child>
              <Button variant="link" size="sm" class="group h-auto cursor-pointer p-0 text-muted-foreground">
                View appointment history ({{ intern.appointmentHistory.length }} term{{ intern.appointmentHistory.length > 1 ? 's' : '' }})
                <ChevronDown class="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul class="mt-3 divide-y rounded-lg border">
                <li
                  v-for="apt in intern.appointmentHistory"
                  :key="apt.id"
                  class="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium" :title="apt.assignedOffice">Term {{ apt.termNumber }} · {{ apt.assignedOffice }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ formatDisplayDate(apt.startDate, apt.startDate) }} to {{ formatDisplayDate(apt.endDate, apt.endDate) }} · {{ apt.dailyStipend }}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    class="shrink-0"
                    :class="apt.status === 'Renewed' ? 'border-info/30 bg-info/10 text-info' : getGipStatusBadgeClass(apt.status)"
                  >
                    {{ apt.status }}
                  </Badge>
                </li>
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      <!-- ─── Decision ─── -->
      <Card class="min-w-0 lg:col-span-3">
        <CardHeader>
          <CardTitle class="text-base">Decision</CardTitle>
          <CardDescription>Renew the appointment for another term, or conclude the internship.</CardDescription>
        </CardHeader>
        <CardContent class="grid min-w-0 grid-cols-1 gap-6">
          <div class="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="tablist">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              role="tab"
              :aria-selected="actionMode === 'renew'"
              :disabled="isSubmitting"
              :class="['cursor-pointer', actionMode === 'renew' && 'bg-background shadow-xs hover:bg-background']"
              @click="actionMode = 'renew'"
            >
              Renew (Term {{ nextTermNumber }})
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              role="tab"
              :aria-selected="actionMode === 'conclude'"
              :disabled="isSubmitting"
              :class="['cursor-pointer', actionMode === 'conclude' && 'bg-background shadow-xs hover:bg-background']"
              @click="actionMode = 'conclude'"
            >
              Conclude Internship
            </Button>
          </div>

          <!-- Renew -->
          <template v-if="actionMode === 'renew'">
            <div v-if="!renewInitialValues" class="grid gap-4">
              <Skeleton class="h-16 w-full" />
              <Skeleton class="h-9 w-full" />
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Skeleton class="h-9 w-full" />
                <Skeleton class="h-9 w-full" />
              </div>
            </div>

            <Form
              v-else
              :key="intern.id"
              v-slot="{ values, setFieldValue }"
              :validation-schema="renewSchema"
              :initial-values="renewInitialValues"
              class="grid min-w-0 grid-cols-1 gap-4"
              @submit="submitRenewal"
            >
              <!-- Funding program -->
              <FormField v-slot="{ value, handleChange }" name="program">
                <FormItem>
                  <FormLabel>Funding Program</FormLabel>
                  <FormControl>
                    <div role="radiogroup" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        v-for="opt in programOptions"
                        :key="opt.value"
                        type="button"
                        role="radio"
                        :aria-checked="value === opt.value"
                        :disabled="isSubmitting"
                        :class="[
                          'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                          value === opt.value ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted/50',
                        ]"
                        @click="() => {
                          handleChange(opt.value)
                          const stipend = stipendForProgram(opt.value, values.stipend)
                          if (stipend) setFieldValue('stipend', stipend)
                        }"
                      >
                        <img :src="opt.logo" :alt="opt.value" class="size-8 shrink-0 rounded-md border bg-background object-cover" />
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-semibold">{{ opt.label }}</p>
                          <p class="text-xs text-muted-foreground">{{ opt.description }}</p>
                        </div>
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <!-- Term period -->
              <div class="grid min-w-0 gap-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="text-sm font-medium">Renewed Term Period</span>
                  <div class="flex items-center gap-1">
                    <Button
                      v-for="months in durationPresets"
                      :key="months"
                      type="button"
                      variant="outline"
                      size="sm"
                      class="h-7 cursor-pointer"
                      :disabled="!values.startDate || isSubmitting"
                      @click="setFieldValue('endDate', addDurationMonths(values.startDate, months))"
                    >
                      {{ months }} months
                    </Button>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField v-slot="{ value, handleChange }" name="startDate">
                    <FormItem class="min-w-0">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger as-child>
                          <FormControl>
                            <Button type="button" variant="outline" class="w-full justify-start font-normal" :disabled="isSubmitting">
                              <span v-if="value">{{ formatDeploymentDate(value) }}</span>
                              <span v-else class="text-muted-foreground">Pick start date</span>
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent class="w-auto p-0" align="start">
                          <Calendar :model-value="value" :min-value="minStartDate ?? undefined" initial-focus @update:model-value="handleChange" />
                        </PopoverContent>
                      </Popover>
                      <FormDescription v-if="minStartDate">On or after {{ formatDeploymentDate(minStartDate) }}, after the previous term</FormDescription>
                      <FormMessage />
                    </FormItem>
                  </FormField>

                  <FormField v-slot="{ value, handleChange }" name="endDate">
                    <FormItem class="min-w-0">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger as-child>
                          <FormControl>
                            <Button type="button" variant="outline" class="w-full justify-start font-normal" :disabled="isSubmitting">
                              <span v-if="value">{{ formatDeploymentDate(value) }}</span>
                              <span v-else class="text-muted-foreground">Pick end date</span>
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent class="w-auto p-0" align="start">
                          <Calendar :model-value="value" :min-value="values.startDate ?? minStartDate ?? undefined" initial-focus @update:model-value="handleChange" />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <!-- Assigned office (full row so long names never spill into the supervisor field) -->
                <FormField v-slot="{ value, handleChange }" name="office">
                  <FormItem class="min-w-0 sm:col-span-2">
                    <FormLabel>Assigned Office / Station</FormLabel>
                    <Combobox
                      v-model:search-term="officeSearchQuery"
                      class="min-w-0"
                      :model-value="value"
                      :ignore-filter="true"
                      by="id"
                      @update:model-value="(office) => {
                        handleChange(office)
                        setFieldValue('supervisor', (office as DirectoryRow | null)?.office_head ?? '')
                      }"
                    >
                      <ComboboxAnchor as-child>
                        <ComboboxTrigger as-child>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              class="w-full min-w-0 justify-between overflow-hidden font-normal"
                              :disabled="isLoadingOffices || isSubmitting"
                            >
                              <span v-if="isLoadingOffices" class="truncate text-muted-foreground">Loading offices...</span>
                              <span v-else-if="value" class="flex min-w-0 flex-1 items-center gap-2 text-left">
                                <span class="truncate">{{ (value as DirectoryRow).office_name }}</span>
                                <span class="shrink-0 font-mono text-xs text-muted-foreground">
                                  {{ (value as DirectoryRow).office_code }}
                                </span>
                              </span>
                              <span v-else class="truncate text-muted-foreground">Select office...</span>
                              <ChevronsUpDownIcon class="size-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </ComboboxTrigger>
                      </ComboboxAnchor>

                      <ComboboxList>
                        <ComboboxInput
                          placeholder="Search office, abbreviation, or head..."
                          @input="officeSearchQuery = ($event.target as HTMLInputElement).value"
                        />
                        <ComboboxViewport>
                          <ComboboxEmpty>No office found.</ComboboxEmpty>
                          <ComboboxGroup>
                            <ComboboxItem v-for="office in filteredOffices" :key="office.id" :value="office">
                              <div class="flex min-w-0 flex-1 flex-col">
                                <span class="truncate">{{ office.office_name }}</span>
                                <span class="truncate text-xs text-muted-foreground">
                                  {{ office.office_head || 'No head designated' }}
                                </span>
                              </div>
                              <span class="shrink-0 font-mono text-xs text-muted-foreground">{{ office.office_code }}</span>
                              <ComboboxItemIndicator>
                                <CheckIcon class="size-4 shrink-0" />
                              </ComboboxItemIndicator>
                            </ComboboxItem>
                          </ComboboxGroup>
                        </ComboboxViewport>
                      </ComboboxList>
                    </Combobox>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <!-- Supervisor -->
                <FormField v-slot="{ componentField }" name="supervisor">
                  <FormItem class="min-w-0">
                    <FormLabel>Designated Supervisor</FormLabel>
                    <FormControl>
                      <Input
                        v-bind="componentField"
                        placeholder="e.g. Maria Santos, Division Head"
                        :readonly="!!values.office?.office_head"
                        :class="values.office?.office_head ? 'bg-muted/40' : ''"
                        :disabled="isSubmitting"
                      />
                    </FormControl>
                    <FormDescription v-if="values.office?.office_head">Auto-filled from office directory</FormDescription>
                    <FormMessage />
                  </FormItem>
                </FormField>

                <!-- Stipend -->
                <FormField v-slot="{ componentField }" name="stipend">
                  <FormItem class="min-w-0">
                    <FormLabel>Daily Stipend</FormLabel>
                    <FormControl>
                      <Input v-bind="componentField" placeholder="e.g. ₱479.35 / day" class="font-mono" :disabled="isSubmitting" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>

              <!-- Notes -->
              <FormField v-slot="{ componentField }" name="notes">
                <FormItem>
                  <FormLabel>Renewal Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      v-bind="componentField"
                      rows="3"
                      :placeholder="`e.g. Satisfactory performance in Term ${currentTermNumber}`"
                      :disabled="isSubmitting"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <div class="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" class="cursor-pointer" :disabled="isSubmitting" @click="goBack">
                  Cancel
                </Button>
                <Button type="submit" class="cursor-pointer" :disabled="isSubmitting">
                  <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
                  {{ isSubmitting ? 'Renewing...' : `Renew for Term ${nextTermNumber}` }}
                </Button>
              </div>
            </Form>
          </template>

          <!-- Conclude -->
          <Form
            v-else
            :key="`conclude-${intern.id}`"
            :validation-schema="concludeSchema"
            :initial-values="concludeInitialValues"
            class="grid grid-cols-1 gap-4"
            @submit="submitConclusion"
          >
            <FormField v-slot="{ componentField }" name="action">
              <FormItem>
                <FormLabel>Concluding Status</FormLabel>
                <FormControl>
                  <SearchSelect
                    v-bind="componentField"
                    :options="concludeOptions"
                    placeholder="Select concluding status..."
                    search-placeholder="Search status..."
                    class="w-full sm:w-80"
                    :disabled="isSubmitting"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField v-slot="{ componentField }" name="notes">
              <FormItem>
                <FormLabel>Exit / Concluding Remarks</FormLabel>
                <FormControl>
                  <Textarea
                    v-bind="componentField"
                    rows="3"
                    placeholder="e.g. Completed standard 6-month GIP program. Certificate issued."
                    :disabled="isSubmitting"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <div class="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" class="cursor-pointer" :disabled="isSubmitting" @click="goBack">
                Cancel
              </Button>
              <Button type="submit" variant="destructive" class="cursor-pointer" :disabled="isSubmitting">
                <Loader2 v-if="isSubmitting" class="size-4 shrink-0 animate-spin" />
                {{ isSubmitting ? 'Concluding...' : 'Conclude Internship' }}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
