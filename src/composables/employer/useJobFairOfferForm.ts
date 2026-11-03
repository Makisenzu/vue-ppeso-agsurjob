import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useEmployerJobFairStore } from '@/stores/employer/jobFairStore'

const MAX_OPENINGS = 9999

const openingsField = z.coerce
  .number({ invalid_type_error: 'Enter the number of openings.' })
  .int('Whole numbers only.')
  .min(1, 'At least 1 opening.')
  .max(MAX_OPENINGS, `Up to ${MAX_OPENINGS} openings.`)

const offerSchema = toTypedSchema(
  z.object({
    postingId: z.string({ required_error: 'Pick a job posting.' }).min(1, 'Pick a job posting.'),
    openings: openingsField,
  }),
)

const openingsSchema = toTypedSchema(z.object({ openings: openingsField }))

/** "Add vacancy" dialog: offer one of the company's open postings at the job fair */
export function useJobFairOfferForm() {
  const store = useEmployerJobFairStore()
  const { isAddOfferOpen, isSubmitting, availablePostings } = storeToRefs(store)

  const { handleSubmit, resetForm, setFieldValue, values } = useForm({
    validationSchema: offerSchema,
    initialValues: { postingId: '', openings: 1 },
  })

  const postingOptions = computed(() =>
    availablePostings.value.map((posting) => ({
      value: posting.id,
      label: posting.position_title,
      description: posting.vacancy_count ? `${posting.vacancy_count} in the posting` : undefined,
    })),
  )

  watch(isAddOfferOpen, (open) => {
    if (open) resetForm({ values: { postingId: '', openings: 1 } })
  })

  // Openings default to the posting's own count
  watch(
    () => values.postingId,
    (id) => {
      const posting = availablePostings.value.find((item) => item.id === id)
      if (posting?.vacancy_count) setFieldValue('openings', posting.vacancy_count)
    },
  )

  const onOpenChange = (open: boolean) => {
    isAddOfferOpen.value = open
  }

  const submit = handleSubmit(async (formValues) => {
    await store.offerPosting(formValues.postingId, formValues.openings)
  })

  return { isAddOfferOpen, isSubmitting, postingOptions, onOpenChange, submit, maxOpenings: MAX_OPENINGS }
}

/** "Edit openings" dialog for one offer */
export function useJobFairOpeningsForm() {
  const store = useEmployerJobFairStore()
  const { offerToEdit, busyOfferId } = storeToRefs(store)

  const { handleSubmit, resetForm } = useForm({
    validationSchema: openingsSchema,
    initialValues: { openings: 1 },
  })

  const isOpen = computed(() => !!offerToEdit.value)
  const isSaving = computed(() => !!offerToEdit.value && busyOfferId.value === offerToEdit.value.id)

  watch(offerToEdit, (offer) => {
    if (offer) resetForm({ values: { openings: offer.vacancy_count ?? 1 } })
  })

  const onOpenChange = (open: boolean) => {
    if (!open) offerToEdit.value = null
  }

  const submit = handleSubmit(async (formValues) => {
    if (offerToEdit.value) await store.updateOpenings(offerToEdit.value, formValues.openings)
  })

  return { offerToEdit, isOpen, isSaving, onOpenChange, submit, maxOpenings: MAX_OPENINGS }
}
