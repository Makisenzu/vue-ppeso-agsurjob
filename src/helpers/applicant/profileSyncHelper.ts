import type { Database } from '@/types/database.types'
import type { ApplicantRecordRow, ApplicantRecordUpdate } from '@/types/applicant/applicantCompletion'
import type { ApplicantAddressJson } from '@/types/common/signup'
import { calculateAge } from '@/helpers/common/signupHelper'

type GenderType = Database['core']['Enums']['gender_type']

/** Fields of `core.profiles` that the profile editor saves and the NSRP record mirrors. */
export interface ProfileSyncSource {
  firstname?: string | null
  middlename?: string | null
  lastname?: string | null
  birthdate?: string | null
  contact_number?: string | null
  gender?: GenderType | null
  region?: string | null
  province?: string | null
  geographic?: string | null
  barangay?: string | null
}

/** NSRP `sex` only has Male / Female; other genders leave the NSRP value as it is. */
export function mapGenderToSex(gender: GenderType | null | undefined): 'Male' | 'Female' | null {
  if (gender === 'man' || gender === 'cisgender_man') return 'Male'
  if (gender === 'woman' || gender === 'cisgender_woman') return 'Female'
  return null
}

const clean = (value: string | null | undefined) => value?.trim() || ''

/**
 * Patch that brings `applicants.applicants` in line with a saved `core.profiles` row
 * (profile ↔ NSRP: firstname → first_name, lastname → surname, geographic → address.municipality, …).
 * Blank profile values never wipe NSRP data, the NSRP-only address parts (street, village) and any
 * extra contact numbers are kept, and an empty patch means the record is already aligned.
 */
export function buildApplicantPatchFromProfile(
  profile: ProfileSyncSource,
  record: ApplicantRecordRow
): ApplicantRecordUpdate {
  const patch: ApplicantRecordUpdate = {}

  const firstName = clean(profile.firstname)
  if (firstName && firstName !== record.first_name) patch.first_name = firstName

  const surname = clean(profile.lastname)
  if (surname && surname !== record.surname) patch.surname = surname

  const middleName = clean(profile.middlename) || null
  if (middleName !== (record.middle_name || null)) patch.middle_name = middleName

  const birthdate = clean(profile.birthdate).slice(0, 10)
  if (birthdate && birthdate !== record.date_of_birth) {
    patch.date_of_birth = birthdate
    patch.age = calculateAge(birthdate)
  }

  const sex = mapGenderToSex(profile.gender)
  if (sex && sex !== record.sex) patch.sex = sex

  const contact = clean(profile.contact_number)
  const numbers = record.contact_numbers ?? []
  if (contact && contact !== numbers[0]) {
    patch.contact_numbers = [contact, ...numbers.slice(1).filter((n) => n !== contact)]
  }

  const currentAddress = (
    record.address && typeof record.address === 'object' && !Array.isArray(record.address) ? record.address : {}
  ) as Partial<ApplicantAddressJson>
  const location = {
    region: clean(profile.region),
    province: clean(profile.province),
    municipality: clean(profile.geographic),
    barangay: clean(profile.barangay),
  }
  const addressChanges = Object.fromEntries(
    Object.entries(location).filter(([key, value]) => value && value !== currentAddress[key as keyof typeof location])
  )
  if (Object.keys(addressChanges).length > 0) {
    patch.address = { ...currentAddress, ...addressChanges }
  }

  return patch
}
