import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGipStore } from '@/stores/peso/provincialPeso/gipStore'
import { useToastAlert } from '@/composables/common/useToastAlert'
import { privacyService } from '@/services/common/privacyService'
import { gipAppointmentRecordService } from '@/services/peso/provincialPeso/gipAppointmentRecordService'
import type { GipAppointmentRecordSavePayload } from '@/types/peso/provincialPeso/gipAppointmentRecord'
import type { GipInternRecord } from '@/types/peso/provincialPeso/gip'
import {
  DEFAULT_GIP_DESIGNATION,
  DEFAULT_GIP_SIGNATORIES,
  DEFAULT_SOURCE_OF_FUNDS,
  appointmentRecordRow,
  appointmentRecordStatement,
  downloadGipAppointmentRecord,
  formatRate,
  printGipAppointmentRecord,
  type GipAppointmentRecordSettings,
  type GipAppointmentSignatory,
  type GipProgramCode,
} from '@/helpers/peso/provincialPeso/gipAppointmentRecordHelper'

const SIGNATORIES_KEY = 'gip-appointment-record-signatories'
const AUDIT_TABLE = 'esmdd.gips'

const defaultSignatories = (): GipAppointmentSignatory[] => DEFAULT_GIP_SIGNATORIES.map((s) => ({ ...s }))

/** Signatory edits are remembered on this browser so the next record starts with them */
function loadSignatories(): GipAppointmentSignatory[] {
  try {
    const saved = JSON.parse(localStorage.getItem(SIGNATORIES_KEY) ?? 'null')
    if (Array.isArray(saved) && saved.length === DEFAULT_GIP_SIGNATORIES.length) {
      return saved.map((s, i) => ({
        label: DEFAULT_GIP_SIGNATORIES[i]!.label,
        name: typeof s?.name === 'string' ? s.name : DEFAULT_GIP_SIGNATORIES[i]!.name,
        position: typeof s?.position === 'string' ? s.position : DEFAULT_GIP_SIGNATORIES[i]!.position,
      }))
    }
  } catch {
    // Storage blocked or bad JSON: fall back to the defaults
  }
  return defaultSignatories()
}

function saveSignatories(signatories: GipAppointmentSignatory[]) {
  try {
    localStorage.setItem(SIGNATORIES_KEY, JSON.stringify(signatories))
  } catch {
    // Not remembered; the record itself is unaffected
  }
}

/**
 * The GIP Appointment Record dialog: the interns it lists (every name of a bulk deploy), the designation
 * (Administrative Aide by default), source of funds and the four signatories, then Download / Print.
 * Opens on its own for the interns just deployed (gipStore.pendingAppointmentRecordIds), or with open(ids).
 */
export function useGipAppointmentRecord() {
  const gipStore = useGipStore()
  const { interns, pendingAppointmentRecordIds } = storeToRefs(gipStore)
  const toastAlert = useToastAlert()
  const router = useRouter()

  const isOpen = ref(false)
  const internIds = ref<string[]>([])
  const designation = ref(DEFAULT_GIP_DESIGNATION)
  const sourceOfFunds = ref(DEFAULT_SOURCE_OF_FUNDS.PGAS)
  const signatories = ref<GipAppointmentSignatory[]>(loadSignatories())
  const busy = ref<'download' | 'print' | null>(null)
  /** Shown after a deploy ("3 interns deployed") rather than when opened from the list */
  const justDeployed = ref(false)
  // Saved to GIP → Appointments (migration 117); saving again after an edit updates the same record
  const isSaving = ref(false)
  const savedRecordId = ref<string | null>(null)
  const savedFingerprint = ref<string | null>(null)

  const recordInterns = computed<GipInternRecord[]>(() =>
    internIds.value
      .map((id) => interns.value.find((intern) => intern.id === id))
      .filter((intern): intern is GipInternRecord => !!intern),
  )
  const rows = computed(() => recordInterns.value.map((intern) => appointmentRecordRow(intern, designation.value)))
  const programs = computed(() => [...new Set(recordInterns.value.map((i) => i.program))] as GipProgramCode[])
  const hasMixedPrograms = computed(() => programs.value.length > 1)
  const statement = computed(() => appointmentRecordStatement(rows.value))
  const signatoriesChanged = computed(() =>
    signatories.value.some(
      (s, i) => s.name !== DEFAULT_GIP_SIGNATORIES[i]!.name || s.position !== DEFAULT_GIP_SIGNATORIES[i]!.position,
    ),
  )

  function open(ids: string[], afterDeploy = false) {
    internIds.value = [...new Set(ids)]
    designation.value = DEFAULT_GIP_DESIGNATION
    sourceOfFunds.value = DEFAULT_SOURCE_OF_FUNDS[programs.value[0] ?? 'PGAS']
    justDeployed.value = afterDeploy
    savedRecordId.value = null
    savedFingerprint.value = null
    isOpen.value = true
  }

  function onOpenChange(open: boolean) {
    if (!open && (busy.value || isSaving.value)) return
    isOpen.value = open
  }

  function resetSignatories() {
    signatories.value = defaultSignatories()
    saveSignatories(signatories.value)
  }

  // Just deployed: open once their records are in the loaded intern list
  watch(
    [pendingAppointmentRecordIds, interns],
    ([pending]) => {
      if (pending.length === 0) return
      const found = pending.filter((id) => interns.value.some((intern) => intern.id === id))
      if (found.length === 0) return
      pendingAppointmentRecordIds.value = []
      open(found, true)
    },
    { immediate: true },
  )

  function settings(): GipAppointmentRecordSettings {
    return {
      designation: designation.value,
      sourceOfFunds: sourceOfFunds.value.trim() || DEFAULT_SOURCE_OF_FUNDS[programs.value[0] ?? 'PGAS'],
      signatories: signatories.value.map((s) => ({ ...s, name: s.name.trim(), position: s.position.trim() })),
    }
  }

  // ─── Save (GIP → Appointments) ───
  function savePayload(): GipAppointmentRecordSavePayload {
    const s = settings()
    return {
      program: programs.value.length > 1 ? 'Mixed' : (programs.value[0] ?? 'PGAS'),
      sourceOfFunds: s.sourceOfFunds,
      designation: s.designation.trim() || DEFAULT_GIP_DESIGNATION,
      statement: statement.value,
      signatories: s.signatories,
      entries: rows.value,
      gipIds: recordInterns.value.map((intern) => intern.id),
    }
  }
  const fingerprint = computed(() => (isOpen.value ? JSON.stringify(savePayload()) : ''))
  /** Saved, and nothing edited since */
  const isSaved = computed(() => savedRecordId.value !== null && savedFingerprint.value === fingerprint.value)

  async function save() {
    if (rows.value.length === 0 || isSaving.value || isSaved.value) return
    isSaving.value = true
    try {
      saveSignatories(signatories.value)
      const payload = savePayload()
      const record = savedRecordId.value
        ? await gipAppointmentRecordService.update(savedRecordId.value, payload)
        : await gipAppointmentRecordService.create(payload)
      savedRecordId.value = record.id
      savedFingerprint.value = JSON.stringify(payload)
      toastAlert.success('Appointment Record Saved', 'It is listed under View Appointments.')
    } catch (err: any) {
      toastAlert.error('Appointment Record', err?.message || 'Could not save the appointment record.')
    } finally {
      isSaving.value = false
    }
  }

  function goToAppointments() {
    isOpen.value = false
    router.push({ name: 'provincial-peso-gip-appointments' })
  }

  async function generate(kind: 'download' | 'print') {
    if (rows.value.length === 0 || busy.value) return
    busy.value = kind
    try {
      saveSignatories(signatories.value)
      if (kind === 'download') await downloadGipAppointmentRecord(rows.value, settings())
      else await printGipAppointmentRecord(rows.value, settings())
      void privacyService.logPersonalDataAccess('EXPORT', AUDIT_TABLE, null, {
        document: 'appointment_record',
        interns: internIds.value,
      })
    } catch (err: any) {
      toastAlert.error('Appointment Record', err?.message || 'Could not generate the appointment record.')
    } finally {
      busy.value = null
    }
  }

  return {
    isOpen,
    justDeployed,
    recordInterns,
    rows,
    hasMixedPrograms,
    statement,
    designation,
    sourceOfFunds,
    signatories,
    signatoriesChanged,
    busy,
    formatRate,
    open,
    onOpenChange,
    resetSignatories,
    isSaving,
    isSaved,
    savedRecordId,
    save,
    goToAppointments,
    download: () => generate('download'),
    print: () => generate('print'),
  }
}
