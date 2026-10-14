import { computed, ref, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { GenericObject } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useSpesStore } from '@/stores/peso/provincialPeso/spesStore'
import { spesService } from '@/services/peso/provincialPeso/spesService'
import { getBarangays, getCities, getProvinces, getRegions } from '@/helpers/common/psgcHelpers'
import {
  computeSpesEndDate,
  countSpesCalendarDays,
  formatSpesFormName,
  getSpesBeneficiaryType,
  getSpesHomeLocation,
  normalizePsgcName,
} from '@/helpers/peso/provincialPeso/spesHelper'
import {
  SPES_DURATION_OPTIONS,
  type SpesAppointee,
  type SpesAppointmentDetails,
  type SpesAppointmentEntry,
  type SpesDurationOption,
} from '@/types/peso/provincialPeso/spes'

/** Provincial PESO appoints SPES beneficiaries for either 10 or 20 working days. */
const DEFAULT_DAYS_DURATION: SpesDurationOption = 20

export const SPES_DURATION_CHOICES = SPES_DURATION_OPTIONS.map((days) => ({
  value: days,
  label: `${days} days`,
  description: `${days} working days, Monday to Friday`,
}))

/** Province preselected on a new appointment — SPES is run by the Provincial PESO of Agusan del Sur. */
const DEFAULT_ASSIGNED_PROVINCE = 'Agusan del Sur'

/** Assignments are limited to the provinces of Caraga (Region XIII). */
const ASSIGNMENT_REGION_PATTERN = /caraga/i

interface PsgcLocation {
  code: string
  name: string
}

/** Exact (case-insensitive) match first, then a loose one so "Bayugan City" finds "City of Bayugan". */
const byName = (list: PsgcLocation[], name: string | undefined) => {
  const target = name?.trim().toLowerCase()
  if (!target) return undefined
  const exact = list.find((item) => item.name.trim().toLowerCase() === target)
  if (exact) return exact
  const key = normalizePsgcName(target)
  return key ? list.find((item) => normalizePsgcName(item.name) === key) : undefined
}

const sortByName = (list: PsgcLocation[]) => [...list].sort((a, b) => a.name.localeCompare(b.name))

const appointmentZodSchema = z
  .object({
    // 'form:<spes_form id>' for an approved applicant, 'spes:<esmdd.spes id>' for a former beneficiary
    appointee: z.string().min(1, 'Select who to appoint.'),
    spesYear: z.coerce
      .number({ message: 'Enter the SPES year.' })
      .int('Enter a valid year.')
      .min(2000, 'Enter a valid year.')
      .max(2100, 'Enter a valid year.'),
    assignedProvince: z.string().trim().min(1, 'Select a province.'),
    assignedMunicipality: z.string().trim().min(1, 'Select a municipality.'),
    assignedBarangay: z.string().trim().min(1, 'Select a barangay.'),
    startDate: z.string().min(1, 'Pick a start date.'),
    daysDuration: z.coerce
      .number({ message: 'Choose 10 or 20 days.' })
      .refine((days) => (SPES_DURATION_OPTIONS as readonly number[]).includes(days), 'Choose 10 or 20 days.'),
    notes: z.string().trim().optional(),
  })
  .refine((v) => computeSpesEndDate(v.startDate, v.daysDuration) !== null, {
    message: 'Enter a valid start date.',
    path: ['startDate'],
  })

type AppointmentFormValues = z.infer<typeof appointmentZodSchema>

function toAppointeeValue(appointee: SpesAppointee): string {
  return appointee.kind === 'applicant' ? `form:${appointee.formId}` : `spes:${appointee.spesId}`
}

function parseAppointee(value: string): SpesAppointee | null {
  const [kind, id] = value.split(':')
  if (!id) return null
  if (kind === 'form') return { kind: 'applicant', formId: id }
  if (kind === 'spes') return { kind: 'beneficiary', spesId: id }
  return null
}

function toFormValues(entry: SpesAppointmentEntry): Partial<AppointmentFormValues> {
  return {
    appointee: `spes:${entry.spes_id}`,
    spesYear: entry.spes_year,
    assignedProvince: entry.assigned_province ?? '',
    assignedMunicipality: entry.assigned_municipality,
    assignedBarangay: entry.assigned_barangay ?? '',
    startDate: entry.start_date,
    daysDuration: entry.days_duration,
    notes: entry.decision_notes ?? '',
  }
}

export function useSpesAppointmentForm() {
  const store = useSpesStore()
  const {
    isAppointmentFormOpen,
    editingAppointment,
    presetAppointee,
    isSubmitting,
    selectedYear,
    enrollableApplicants,
    reappointableBeneficiaries,
    spesForms,
    spesBeneficiaries,
    drawAppointQueue,
    drawAppointTotal,
  } = storeToRefs(store)
  const { appointSpes, updateAppointment, closeAppointmentDialog } = store

  const isEditMode = computed(() => editingAppointment.value !== null)

  /** Approved applicants not yet enrolled — appointing them enrolls them as new beneficiaries. */
  const applicantOptions = computed(() =>
    enrollableApplicants.value.map((form) => ({
      value: `form:${form.id}`,
      label: formatSpesFormName(form),
      hint: getSpesBeneficiaryType(form) === 'Returning' ? 'Returning (per SPES form)' : 'New applicant',
    }))
  )

  /** Former beneficiaries without an appointment in the selected year — they can become SPES again. */
  const beneficiaryOptions = computed(() =>
    reappointableBeneficiaries.value.map((spes) => {
      const years = spes.appointments.map((a) => a.spes_year)
      return {
        value: `spes:${spes.id}`,
        label: formatSpesFormName(spes.spes_form),
        hint: years.length ? `Last SPES ${Math.max(...years)} · ${years.length} availment(s)` : 'No appointment yet',
      }
    })
  )

  /** "2 of 5" while appointing the applicants of a randomizer draw one after another, else null. */
  const drawAppointProgress = computed(() => {
    const total = drawAppointTotal.value
    if (!total || !drawAppointQueue.value.length || isEditMode.value) return null
    return { current: total - drawAppointQueue.value.length + 1, total }
  })

  /** Name shown instead of the picker when editing or re-appointing a specific beneficiary. */
  const fixedAppointeeName = computed(() => {
    if (editingAppointment.value) return formatSpesFormName(editingAppointment.value.beneficiary.spes_form)
    if (!presetAppointee.value) return null
    const value = toAppointeeValue(presetAppointee.value)
    return [...applicantOptions.value, ...beneficiaryOptions.value].find((o) => o.value === value)?.label ?? null
  })

  // ─── Form Setup (the <Form> remounts per open via formKey) ───
  const appointmentSchema = toTypedSchema(appointmentZodSchema)

  const appointmentInitialValues = computed<Partial<AppointmentFormValues>>(() => {
    if (editingAppointment.value) return toFormValues(editingAppointment.value)
    return {
      appointee: presetAppointee.value ? toAppointeeValue(presetAppointee.value) : '',
      spesYear: selectedYear.value,
      assignedProvince: DEFAULT_ASSIGNED_PROVINCE,
      assignedMunicipality: '',
      assignedBarangay: '',
      startDate: '',
      daysDuration: DEFAULT_DAYS_DURATION,
      notes: '',
    }
  })

  const appointmentFormKey = computed(() =>
    editingAppointment.value
      ? `edit-${editingAppointment.value.id}`
      : `new-${presetAppointee.value ? toAppointeeValue(presetAppointee.value) : 'any'}-${selectedYear.value}`
  )

  // ─── Assignment location (PSGC: province → municipality → barangay) ───
  const provinces = ref<PsgcLocation[]>([])
  const municipalities = ref<PsgcLocation[]>([])
  const barangays = ref<PsgcLocation[]>([])
  const isLoadingProvinces = ref(false)
  const isLoadingMunicipalities = ref(false)
  const isLoadingBarangays = ref(false)
  const locationError = ref<string | null>(null)

  const loadMunicipalities = async (provinceName: string | undefined) => {
    municipalities.value = []
    barangays.value = []
    const province = byName(provinces.value, provinceName)
    if (!province) return
    isLoadingMunicipalities.value = true
    try {
      municipalities.value = sortByName(await getCities(province.code))
    } catch {
      locationError.value = 'Could not load municipalities from PSGC. Check your connection and try again.'
    } finally {
      isLoadingMunicipalities.value = false
    }
  }

  const loadBarangays = async (municipalityName: string | undefined) => {
    barangays.value = []
    const municipality = byName(municipalities.value, municipalityName)
    if (!municipality) return
    isLoadingBarangays.value = true
    try {
      barangays.value = sortByName(await getBarangays(municipality.code))
    } catch {
      locationError.value = 'Could not load barangays from PSGC. Check your connection and try again.'
    } finally {
      isLoadingBarangays.value = false
    }
  }

  /** The appointment <Form> (`ref="appointmentForm"`), so the home address can be filled in after it mounts. */
  const appointmentFormRef = useTemplateRef<{ setFieldValue: (field: string, value: unknown) => void }>('appointmentForm')
  /** Tells PESO where the prefilled assignment came from (or that there was nothing to prefill). */
  const homeLocationNote = ref<string | null>(null)
  const isLoadingHomeLocation = ref(false)
  let homeLocationRequest = 0

  const ensureProvinces = async (): Promise<boolean> => {
    if (provinces.value.length) return true
    isLoadingProvinces.value = true
    try {
      const caraga = ((await getRegions()) as PsgcLocation[]).find((region) => ASSIGNMENT_REGION_PATTERN.test(region.name))
      if (!caraga) throw new Error('Caraga region not found in PSGC')
      provinces.value = sortByName(await getProvinces(caraga.code))
      return true
    } catch {
      locationError.value = 'Could not load provinces from PSGC. Check your connection and try again.'
      return false
    } finally {
      isLoadingProvinces.value = false
    }
  }

  const findAppointeeForm = (value: string) => {
    const appointee = parseAppointee(value)
    if (!appointee) return null
    if (appointee.kind === 'applicant') return spesForms.value.find((form) => form.id === appointee.formId) ?? null
    return spesBeneficiaries.value.find((spes) => spes.id === appointee.spesId)?.spes_form ?? null
  }

  /**
   * New appointments start at the appointee's home address (Entry of Applicants, else their
   * SPES form municipality). PESO can still assign them to another place.
   */
  const autofillHomeLocation = async (appointeeValue: string) => {
    const requestId = ++homeLocationRequest
    homeLocationNote.value = null
    const form = findAppointeeForm(appointeeValue)
    if (!form) return

    isLoadingHomeLocation.value = true
    try {
      const address = await spesService.fetchApplicantAddress(form).catch(() => null)
      if (requestId !== homeLocationRequest) return
      const home = getSpesHomeLocation(address, form)
      if (!home || !(await ensureProvinces()) || requestId !== homeLocationRequest) {
        if (requestId === homeLocationRequest) {
          homeLocationNote.value = 'No address on record for this applicant. Pick the assignment manually.'
        }
        return
      }

      const setField = (field: LocationField, value: string) => appointmentFormRef.value?.setFieldValue(field, value)
      const province = byName(provinces.value, home.province)
      if (!province) {
        homeLocationNote.value = `Their address (${home.province}) is outside Caraga. Pick a Caraga province to assign them.`
        return
      }
      setField('assignedProvince', province.name)
      setField('assignedMunicipality', '')
      setField('assignedBarangay', '')
      await loadMunicipalities(province.name)
      if (requestId !== homeLocationRequest) return

      const municipality = byName(municipalities.value, home.municipality)
      if (municipality) {
        setField('assignedMunicipality', municipality.name)
        await loadBarangays(municipality.name)
        if (requestId !== homeLocationRequest) return
        const barangay = byName(barangays.value, home.barangay)
        if (barangay) setField('assignedBarangay', barangay.name)
      }

      homeLocationNote.value = municipality
        ? "Prefilled from the applicant's home address. Change it to assign them to another municipality."
        : "Only the applicant's province is on record. Pick the municipality and barangay."
    } finally {
      if (requestId === homeLocationRequest) isLoadingHomeLocation.value = false
    }
  }

  /** Loads the lists for the form's initial location so an edited appointment shows its saved place. */
  const loadInitialLocation = async () => {
    locationError.value = null
    homeLocationNote.value = null
    homeLocationRequest++
    isLoadingHomeLocation.value = false
    const { appointee, assignedProvince, assignedMunicipality } = appointmentInitialValues.value
    if (!(await ensureProvinces())) return
    // Re-appointing from the history dialog: the appointee is known when the form opens
    if (!isEditMode.value && appointee) {
      await autofillHomeLocation(appointee)
      return
    }
    await loadMunicipalities(assignedProvince)
    await loadBarangays(assignedMunicipality)
  }

  watch(
    () => isAppointmentFormOpen.value && appointmentFormKey.value,
    (key) => {
      if (key) void loadInitialLocation()
    },
    { immediate: true }
  )

  /** Picking someone to appoint fills the assignment with where they live. */
  const onAppointeeChange = (value: unknown) => {
    if (isEditMode.value || typeof value !== 'string' || !value) return
    void autofillHomeLocation(value)
  }

  type LocationField = 'assignedProvince' | 'assignedMunicipality' | 'assignedBarangay'

  /** Picking a province clears the municipality and barangay below it. */
  const onProvinceChange = (name: string, setFieldValue: (field: LocationField, value: string) => void) => {
    setFieldValue('assignedProvince', name)
    setFieldValue('assignedMunicipality', '')
    setFieldValue('assignedBarangay', '')
    void loadMunicipalities(name)
  }

  /** Picking a municipality clears the barangay below it. */
  const onMunicipalityChange = (name: string, setFieldValue: (field: LocationField, value: string) => void) => {
    setFieldValue('assignedMunicipality', name)
    setFieldValue('assignedBarangay', '')
    void loadBarangays(name)
  }

  /** End date = last working day (Mon–Fri) of the chosen 10 or 20 working days, counted from the start date. */
  const getEndDate = (startDate: string | undefined, daysDuration: number | string | undefined) =>
    computeSpesEndDate(startDate, Number(daysDuration))

  const onAppointmentOpenChange = (open: boolean) => {
    if (open) return
    closeAppointmentDialog()
  }

  const submitAppointment = async (formValues: GenericObject) => {
    const values = formValues as AppointmentFormValues
    const details: SpesAppointmentDetails = {
      spes_year: values.spesYear,
      assigned_province: values.assignedProvince,
      assigned_municipality: values.assignedMunicipality,
      assigned_barangay: values.assignedBarangay,
      days_duration: values.daysDuration,
      start_date: values.startDate,
      // Always derived, never typed in, so it only ever counts working days
      end_date: getEndDate(values.startDate, values.daysDuration)!,
      decision_notes: values.notes || null,
    }

    if (editingAppointment.value) {
      await updateAppointment(details)
      return
    }

    const appointee = parseAppointee(values.appointee)
    if (appointee) await appointSpes(appointee, details)
  }

  return {
    isAppointmentFormOpen,
    isSubmitting,
    isEditMode,
    editingAppointment,
    applicantOptions,
    beneficiaryOptions,
    fixedAppointeeName,
    drawAppointProgress,
    appointmentSchema,
    appointmentInitialValues,
    appointmentFormKey,
    provinces,
    municipalities,
    barangays,
    isLoadingProvinces,
    isLoadingMunicipalities,
    isLoadingBarangays,
    locationError,
    retryLoadLocation: loadInitialLocation,
    homeLocationNote,
    isLoadingHomeLocation,
    onAppointeeChange,
    onProvinceChange,
    onMunicipalityChange,
    durationChoices: SPES_DURATION_CHOICES,
    getEndDate,
    countSpesCalendarDays,
    onAppointmentOpenChange,
    submitAppointment,
  }
}
