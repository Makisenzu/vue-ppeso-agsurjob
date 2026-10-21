import {
  ESTABLISHMENT_FORM_FIELDS,
  type EstablishmentFormFields,
  type EstablishmentRow,
} from '@/types/common/establishment'

/** The Form 2 fields of an establishment, e.g. to merge onto an activity row. */
export function pickEstablishmentFormFields(row: EstablishmentRow): EstablishmentFormFields {
  return Object.fromEntries(ESTABLISHMENT_FORM_FIELDS.map((key) => [key, row[key]])) as EstablishmentFormFields
}
