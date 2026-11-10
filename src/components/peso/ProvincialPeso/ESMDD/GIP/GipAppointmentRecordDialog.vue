<script setup lang="ts">
import { AlertTriangle, Check, ChevronDown, Download, FileText, ListChecks, Loader2, Printer, Save } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useGipAppointmentRecord } from '@/composables/peso/provincialPeso/useGipAppointmentRecord'

const {
  isOpen,
  justDeployed,
  rows,
  hasMixedPrograms,
  designation,
  sourceOfFunds,
  signatories,
  signatoriesChanged,
  busy,
  formatRate,
  isSaving,
  isSaved,
  savedRecordId,
  save,
  goToAppointments,
  open,
  onOpenChange,
  resetSignatories,
  download,
  print,
} = useGipAppointmentRecord()

defineExpose({ open })
</script>

<template>
  <Dialog :open="isOpen" @update:open="onOpenChange">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader>
        <div class="flex items-center justify-between gap-2 pr-8">
          <DialogTitle class="flex items-center gap-2">
            <FileText class="size-5 shrink-0" />
            Appointment Record
          </DialogTitle>
          <div class="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              class="size-8 cursor-pointer"
              title="Print"
              aria-label="Print"
              :disabled="!!busy || rows.length === 0"
              @click="print"
            >
              <Loader2 v-if="busy === 'print'" class="size-4 shrink-0 animate-spin" />
              <Printer v-else class="size-4 shrink-0" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="size-8 cursor-pointer"
              title="Download PDF"
              aria-label="Download PDF"
              :disabled="!!busy || rows.length === 0"
              @click="download"
            >
              <Loader2 v-if="busy === 'download'" class="size-4 shrink-0 animate-spin" />
              <Download v-else class="size-4 shrink-0" />
            </Button>
          </div>
        </div>
        <DialogDescription>
          <template v-if="justDeployed">
            {{ rows.length }} intern{{ rows.length === 1 ? '' : 's' }} deployed. Save their appointment record.
          </template>
          <template v-else>{{ rows.length }} intern{{ rows.length === 1 ? '' : 's' }} on this record.</template>
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-5">
        <Alert v-if="hasMixedPrograms" class="border-warning/40 text-warning">
          <AlertTriangle />
          <AlertDescription>These interns are from both PGAS and DOLE. Check the source of funds.</AlertDescription>
        </Alert>

        <!-- Names on the record -->
        <div class="max-h-64 overflow-auto rounded-md border">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-muted text-xs text-muted-foreground">
              <tr>
                <th class="px-3 py-2 text-left font-medium">No.</th>
                <th class="px-3 py-2 text-left font-medium">Name</th>
                <th class="hidden px-3 py-2 text-left font-medium sm:table-cell">Address</th>
                <th class="px-3 py-2 text-right font-medium">Rate</th>
                <th class="px-3 py-2 text-left font-medium">Period</th>
                <th class="hidden px-3 py-2 text-left font-medium md:table-cell">Area of assignment</th>
                <th class="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in rows" :key="row.internId" class="border-t">
                <td class="px-3 py-2 tabular-nums text-muted-foreground">{{ index + 1 }}</td>
                <td class="px-3 py-2 font-medium">{{ row.name }}</td>
                <td class="hidden px-3 py-2 text-muted-foreground sm:table-cell">{{ row.address }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ formatRate(row.rate) }}</td>
                <td class="px-3 py-2 text-xs whitespace-nowrap">{{ row.periodStart }} –<br>{{ row.periodEnd }}</td>
                <td class="hidden px-3 py-2 text-muted-foreground md:table-cell">{{ row.areaOfAssignment }}</td>
                <td class="px-3 py-2 text-xs whitespace-nowrap">{{ row.currentStatus }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="grid gap-2">
            <Label for="record-designation">Designation</Label>
            <Input id="record-designation" v-model="designation" maxlength="100" />
          </div>
          <div class="grid gap-2">
            <Label for="record-funds">Source of funds</Label>
            <Input id="record-funds" v-model="sourceOfFunds" maxlength="120" />
          </div>
        </div>

        <!-- Signatories (defaults; edits are remembered on this device) -->
        <Collapsible v-slot="{ open: signatoriesOpen }">
          <div class="flex items-center justify-between gap-2">
            <CollapsibleTrigger as-child>
              <Button variant="ghost" size="sm" class="-ml-2 cursor-pointer">
                <ChevronDown :class="['size-4 shrink-0 transition-transform', signatoriesOpen && 'rotate-180']" />
                Signatories
              </Button>
            </CollapsibleTrigger>
            <Button
              v-if="signatoriesChanged"
              variant="link"
              size="sm"
              class="h-auto cursor-pointer p-0 text-muted-foreground"
              @click="resetSignatories"
            >
              Reset to default
            </Button>
          </div>
          <p v-if="!signatoriesOpen" class="text-xs text-muted-foreground">
            {{ signatories.map((s) => s.name).join(' · ') }}
          </p>
          <CollapsibleContent class="mt-3 grid gap-4">
            <div v-for="(signatory, index) in signatories" :key="signatory.label" class="grid gap-2 sm:grid-cols-[10rem_1fr_1fr] sm:items-center">
              <Label :for="`record-signatory-${index}`" class="text-muted-foreground">{{ signatory.label.replace(':', '') }}</Label>
              <Input :id="`record-signatory-${index}`" v-model="signatory.name" placeholder="Name" maxlength="120" />
              <Input v-model="signatory.position" placeholder="Position" maxlength="120" :aria-label="`${signatory.label} position`" />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" class="cursor-pointer" :disabled="!!busy || isSaving" @click="onOpenChange(false)">Close</Button>
        <Button v-if="savedRecordId" variant="ghost" class="cursor-pointer" :disabled="isSaving" @click="goToAppointments">
          <ListChecks class="size-4 shrink-0" />
          View Appointments
        </Button>
        <Button class="cursor-pointer" :disabled="isSaving || isSaved || rows.length === 0" @click="save">
          <Loader2 v-if="isSaving" class="size-4 shrink-0 animate-spin" />
          <Check v-else-if="isSaved" class="size-4 shrink-0" />
          <Save v-else class="size-4 shrink-0" />
          {{ isSaving ? 'Saving...' : isSaved ? 'Saved' : savedRecordId ? 'Save Changes' : 'Save Record' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
