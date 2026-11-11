import { computed, ref } from 'vue'
import { applicantEntryService } from '@/services/peso/provincialPeso/applicantEntryService'
import { privacyService } from '@/services/common/privacyService'
import { mapToApplicantEntryRecord } from '@/helpers/peso/provincialPeso/applicantEntryHelper'
import { downloadNsrpFormPdf, printNsrpForm, renderNsrpFormPages } from '@/helpers/peso/provincialPeso/nsrpTemplateHelper'
import { errorMessageOf } from '@/helpers/peso/provincialPeso/skillsTrainingHelper'
import { useToastAlert } from '@/composables/common/useToastAlert'
import type { ApplicantEntryRecord } from '@/types/peso/provincialPeso/applicantEntry'

/**
 * A jobseeker's NSRP Form 1, shown as its printable pages (the same pages the PDF has), with print and
 * download. Opened by applicant id from lists that only hold a name, e.g. Skills Demand's jobseekers;
 * the page composes the Dialog inline (DESIGN.md §5.1).
 */
export function useApplicantNsrpPreview() {
  const toastAlert = useToastAlert()

  const applicantId = ref<string | null>(null)
  const applicant = ref<ApplicantEntryRecord | null>(null)
  const pages = ref<string[]>([])
  const isRendering = ref(false)
  const error = ref<string | null>(null)
  const busy = ref<'print' | 'download' | null>(null)
  let request = 0

  const isOpen = computed({
    get: () => applicantId.value !== null,
    set: (open: boolean) => {
      if (!open) {
        request++
        applicantId.value = null
        applicant.value = null
        pages.value = []
        error.value = null
        isRendering.value = false
      }
    },
  })

  async function render(id: string) {
    const current = ++request
    pages.value = []
    error.value = null
    isRendering.value = true
    try {
      const record = applicant.value?.id === id ? applicant.value : await loadApplicant(id)
      if (current !== request) return
      if (!record) {
        error.value = 'This jobseeker\'s NSRP record could not be found.'
        return
      }
      applicant.value = record
      const rendered = await renderNsrpFormPages(record)
      if (current === request) pages.value = rendered
    } catch (err) {
      if (current === request) error.value = errorMessageOf(err, 'Could not show the NSRP form.')
    } finally {
      if (current === request) isRendering.value = false
    }
  }

  async function loadApplicant(id: string): Promise<ApplicantEntryRecord | null> {
    const row = await applicantEntryService.fetchApplicantById(id)
    if (!row) return null
    void privacyService.logPersonalDataAccess('VIEW', 'applicants.applicants', id)
    return mapToApplicantEntryRecord(row)
  }

  function open(id: string) {
    applicantId.value = id
    if (applicant.value?.id !== id) applicant.value = null
    void render(id)
  }

  const retry = () => applicantId.value && void render(applicantId.value)

  const fullName = computed(() => {
    const a = applicant.value
    if (!a) return ''
    const given = [a.firstName, a.middleName ? `${a.middleName.charAt(0)}.` : '', a.suffix].filter(Boolean).join(' ')
    return [a.surname?.toUpperCase(), given].filter(Boolean).join(', ')
  })

  async function print() {
    if (!applicant.value || busy.value) return
    busy.value = 'print'
    try {
      await printNsrpForm(applicant.value)
    } catch (err) {
      toastAlert.error('Print Preparation Failed', errorMessageOf(err, 'Unable to prepare the NSRP form for printing.'))
    } finally {
      busy.value = null
    }
  }

  async function download() {
    if (!applicant.value || busy.value) return
    busy.value = 'download'
    try {
      await downloadNsrpFormPdf(applicant.value)
    } catch (err) {
      toastAlert.error('PDF Generation Failed', errorMessageOf(err, 'Unable to generate the NSRP form PDF.'))
    } finally {
      busy.value = null
    }
  }

  return { isOpen, applicant, fullName, pages, isRendering, error, busy, open, retry, print, download }
}
