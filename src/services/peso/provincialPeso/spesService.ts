import { supabase } from '@/lib/supabaseClient'
import { fetchAllInChunks, fetchAllPages, IN_FILTER_CHUNK_SIZE } from '@/helpers/common/supabasePaging'
import type {
  SpesFormInsert,
  SpesFormReview,
  SpesFormRow,
  SpesFormUpdate,
  SpesAppointmentDetails,
  SpesAppointmentInsert,
  SpesAppointmentRow,
  SpesAppointmentUpdate,
  SpesBeneficiary,
  SpesBeneficiaryType,
  SpesConcludeStatus,
  SpesLinkableJobseeker,
  SpesRow,
  SpesWithApplicant,
} from '@/types/peso/provincialPeso/spes'
import type { SpesFormTableInsert, SpesFormTableUpdate } from '@/types/common/spesForm'
import { generateSpesAppointmentCode } from '@/helpers/peso/provincialPeso/spesHelper'
import { assertStatusRemarks } from '@/helpers/common/statusRemarksHelper'

// esmdd.spes_appointments (migration 015) is not in database.types.ts until `npm run types:gen`
// is re-run, so the typed client does not know the table yet. Rows are typed by SpesAppointmentRow.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const spesAppointmentsTable = () => (supabase.schema('esmdd') as any).from('spes_appointments')

// PostgREST cannot embed across schemas, so the `applicants.spes_form` rows a
// beneficiary was enrolled from are fetched separately and merged by `application_id`.
async function fetchFormsByIds(formIds: string[]): Promise<Map<string, SpesFormRow>> {
  if (!formIds.length) return new Map()

  const { data, error } = await fetchAllInChunks(formIds, (chunk) =>
    supabase.schema('applicants').from('spes_form').select('*').in('id', chunk).order('id')
  )

  if (error) throw new Error(error.message || 'Failed to load SPES forms.')
  return new Map(data.map((form) => [form.id, form]))
}

async function attachForms(rows: SpesRow[]): Promise<SpesWithApplicant[]> {
  const forms = await fetchFormsByIds(rows.flatMap((row) => (row.application_id ? [row.application_id] : [])))
  return rows.map((row) => ({ ...row, spes_form: row.application_id ? forms.get(row.application_id) ?? null : null }))
}

/** Adds each beneficiary's appointments, newest SPES year first. */
async function attachAppointments(rows: SpesWithApplicant[]): Promise<SpesBeneficiary[]> {
  if (!rows.length) return []

  const { data, error } = await fetchAllInChunks<SpesAppointmentRow, string>(
    rows.map((row) => row.id),
    (chunk) => spesAppointmentsTable().select('*').in('spes_id', chunk).order('id')
  )

  if (error) throw new Error(error.message || 'Failed to load SPES appointments.')

  // Chunked results arrive per chunk, so restore newest-year-first per beneficiary here
  data.sort((a, b) => b.spes_year - a.spes_year)
  const bySpes = new Map<string, SpesAppointmentRow[]>()
  for (const appointment of data) {
    bySpes.set(appointment.spes_id, [...(bySpes.get(appointment.spes_id) ?? []), appointment])
  }
  return rows.map((row) => ({ ...row, appointments: bySpes.get(row.id) ?? [] }))
}

export const spesService = {
  // ─── SPES Forms (applicants.spes_form) ───

  async fetchSpesForms(): Promise<SpesFormRow[]> {
    const { data, error } = await fetchAllPages(() =>
      supabase
        .schema('applicants')
        .from('spes_form')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id')
    )

    if (error) throw new Error(error.message || 'Failed to load SPES forms.')
    return data
  },

  async fetchSpesFormById(formId: string): Promise<SpesFormRow> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .select('*')
      .eq('id', formId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load the SPES form.')
    if (!data) throw new Error('SPES form not found.')
    return data
  },

  async createSpesForm(payload: SpesFormInsert): Promise<SpesFormRow> {
    const { data, error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .insert(payload as SpesFormTableInsert)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to save the SPES form.')
    return data
  },

  async updateSpesForm(formId: string, payload: SpesFormUpdate): Promise<SpesFormRow> {
    // updated_at is set by the spes_form_set_updated_at trigger
    const { data, error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .update(payload as SpesFormTableUpdate)
      .eq('id', formId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update the SPES form.')
    return data
  },

  /** PESO review decision (status / remarks) on a submitted form. */
  async reviewSpesForm(formId: string, review: SpesFormReview): Promise<SpesFormRow> {
    assertStatusRemarks(review.status, review.remarks)
    const isApproved = review.status === 'Approved'
    if (isApproved && !review.orientation_at) throw new Error('Set the orientation date and time when approving.')
    // The schedule only belongs to an approval; any other status clears it
    const update = {
      ...review,
      orientation_at: isApproved ? review.orientation_at : null,
      orientation_note: isApproved ? review.orientation_note : null,
    }
    const { data, error } = await supabase
      .schema('applicants')
      .from('spes_form')
      // orientation_* (067) are not in database.types.ts until `npm run types:gen`
      .update(update as SpesFormTableUpdate)
      .eq('id', formId)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update the SPES application status.')
    return data
  },

  /**
   * Approves the applicants drawn by the randomizer in one update. Only forms that are still
   * Pending are changed, so a form reviewed meanwhile by someone else is left as it is.
   */
  async approveDrawnForms(formIds: string[], remarks: string): Promise<SpesFormRow[]> {
    const approved: SpesFormRow[] = []
    for (let i = 0; i < formIds.length; i += IN_FILTER_CHUNK_SIZE) {
      const { data, error } = await supabase
        .schema('applicants')
        .from('spes_form')
        .update({ status: 'Approved', remarks })
        .in('id', formIds.slice(i, i + IN_FILTER_CHUNK_SIZE))
        .eq('status', 'Pending')
        .select()

      if (error) throw new Error(error.message || 'Failed to approve the drawn SPES applicants.')
      approved.push(...(data ?? []))
    }
    return approved
  },

  /** Also removes its SPES beneficiary record (ON DELETE CASCADE). */
  async deleteSpesForm(formId: string): Promise<void> {
    const { error } = await supabase
      .schema('applicants')
      .from('spes_form')
      .delete()
      .eq('id', formId)

    if (error) throw new Error(error.message || 'Failed to delete the SPES form.')
  },

  /** Jobseekers from Entry of Applicants that have an account a SPES form can belong to. */
  async fetchLinkableJobseekers(): Promise<SpesLinkableJobseeker[]> {
    const { data, error } = await fetchAllPages(() =>
      supabase
        .schema('applicants')
        .from('applicants')
        .select('id, profile_id, first_name, middle_name, surname, date_of_birth, sex, civil_status, contact_numbers, email')
        .not('profile_id', 'is', null)
        .order('surname', { ascending: true })
        .order('id')
    )

    if (error) throw new Error(error.message || 'Failed to load jobseeker accounts.')
    return data as SpesLinkableJobseeker[]
  },

  /**
   * Address (`applicants.applicants.address` JSON) of the jobseeker a SPES form belongs to —
   * matched by the linked applicant record, or by the account for self-registered applicants.
   */
  async fetchApplicantAddress(form: Pick<SpesFormRow, 'applicant_id' | 'profile_id'>): Promise<unknown> {
    if (!form.applicant_id && !form.profile_id) return null

    const query = supabase.schema('applicants').from('applicants').select('address')
    const { data, error } = await (form.applicant_id
      ? query.eq('id', form.applicant_id)
      : query.eq('profile_id', form.profile_id as string)
    )
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message || "Failed to load the applicant's address.")
    return data?.address ?? null
  },

  // ─── SPES Beneficiaries (esmdd.spes) ───

  /** Every beneficiary with its SPES form and yearly appointments. */
  async fetchBeneficiaries(): Promise<SpesBeneficiary[]> {
    const { data, error } = await fetchAllPages(() =>
      supabase
        .schema('esmdd')
        .from('spes')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id')
    )

    if (error) throw new Error(error.message || 'Failed to load SPES beneficiaries.')
    return attachAppointments(await attachForms(data))
  },

  async fetchBeneficiaryById(spesId: string): Promise<SpesBeneficiary> {
    const { data, error } = await supabase
      .schema('esmdd')
      .from('spes')
      .select('*')
      .eq('id', spesId)
      .maybeSingle()

    if (error) throw new Error(error.message || 'Failed to load the SPES beneficiary.')
    if (!data) throw new Error('SPES beneficiary not found.')
    const [beneficiary] = await attachAppointments(await attachForms([data]))
    return beneficiary!
  },

  /**
   * Enrolls an approved applicant as a beneficiary together with their first appointment.
   * The beneficiary row is removed again if the appointment cannot be saved.
   */
  async enrollBeneficiary(
    formId: string,
    beneficiaryType: SpesBeneficiaryType,
    details: SpesAppointmentDetails,
    decidedBy: string | null
  ): Promise<SpesBeneficiary> {
    const { data: spes, error } = await supabase
      .schema('esmdd')
      .from('spes')
      .insert({ application_id: formId, beneficiary: beneficiaryType, status: 'Active' })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') throw new Error('This SPES applicant is already enrolled as a beneficiary.')
      throw new Error(error.message || 'Failed to add SPES beneficiary.')
    }

    try {
      await this.createAppointment(spes.id, details, decidedBy)
    } catch (appointmentError) {
      await this.deleteSpes(spes.id).catch(() => undefined)
      throw appointmentError
    }
    return this.fetchBeneficiaryById(spes.id)
  },

  async deleteSpes(spesId: string): Promise<void> {
    const { error } = await supabase
      .schema('esmdd')
      .from('spes')
      .delete()
      .eq('id', spesId)

    if (error) throw new Error(error.message || 'Failed to delete SPES beneficiary.')
  },

  // ─── SPES Appointments (esmdd.spes_appointments) ───
  // The spes_appointment_sync_spes trigger keeps esmdd.spes status / days_duration /
  // beneficiary in step, so callers re-read the beneficiary after a change.

  /** Appoints a beneficiary for a SPES year — their first year, or a returning year. */
  async createAppointment(spesId: string, details: SpesAppointmentDetails, decidedBy: string | null): Promise<void> {
    const payload: SpesAppointmentInsert = {
      ...details,
      spes_id: spesId,
      appointment_code: generateSpesAppointmentCode(details.spes_year, spesId),
      status: 'Active',
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
    }
    const { error } = await spesAppointmentsTable().insert(payload)

    if (error) {
      if (error.code === '23505') {
        throw new Error(`This beneficiary already has an appointment for SPES ${details.spes_year}.`)
      }
      throw new Error(error.message || 'Failed to save the SPES appointment.')
    }
  },

  async updateAppointment(appointmentId: string, payload: SpesAppointmentUpdate): Promise<void> {
    // updated_at is set by the trg_spes_appointment_updated_at trigger
    const { error } = await spesAppointmentsTable().update(payload).eq('id', appointmentId)

    if (error) {
      if (error.code === '23505') {
        throw new Error(`This beneficiary already has an appointment for SPES ${payload.spes_year}.`)
      }
      throw new Error(error.message || 'Failed to update the SPES appointment.')
    }
  },

  /** Provincial PESO decision closing an appointment (Completed / Terminated). */
  async concludeAppointment(
    appointmentId: string,
    status: SpesConcludeStatus,
    notes: string | null,
    decidedBy: string | null
  ): Promise<void> {
    await this.updateAppointment(appointmentId, {
      status,
      decision_notes: notes,
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
    })
  },

  async deleteAppointment(appointmentId: string): Promise<void> {
    const { error } = await spesAppointmentsTable().delete().eq('id', appointmentId)
    if (error) throw new Error(error.message || 'Failed to delete the SPES appointment.')
  },
}
