import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { usePageHeroManagerStore } from '@/stores/peso/provincialPeso/pageHeroManagerStore'
import { assertPageHeroPhoto } from '@/helpers/peso/provincialPeso/siteContentManagerHelper'
import {
  PAGE_HERO_LIMITS,
  PUBLIC_PAGES,
  SITE_CONTENT_IMAGE_MAX_MB,
  type PageHeroItem,
  type PublicPage,
} from '@/types/common/siteContent'

const limitedText = (max: number, label: string) =>
  z.string().trim().max(max, `Keep the ${label} under ${max} characters.`).optional()

// Limits mirror the column CHECKs in migration 051
const heroSchema = toTypedSchema(
  z.object({
    eyebrow: limitedText(PAGE_HERO_LIMITS.eyebrow, 'label'),
    title: limitedText(PAGE_HERO_LIMITS.title, 'title'),
    description: limitedText(PAGE_HERO_LIMITS.description, 'description'),
    imageAlt: limitedText(PAGE_HERO_LIMITS.imageAlt, 'photo description'),
  })
)

const toFormValues = (hero: PageHeroItem | undefined) => ({
  eyebrow: hero?.eyebrow ?? '',
  title: hero?.title ?? '',
  description: hero?.description ?? '',
  imageAlt: hero?.image_alt ?? '',
})

// Empty fields are saved as null, so the page falls back to its built-in text
const orNull = (value: string | undefined) => value?.trim() || null

/** One page's banner editor: photo upload / removal, and the text form with the built-in text as placeholders. */
export function usePageHeroEditor(page: PublicPage) {
  const store = usePageHeroManagerStore()
  const { heroes, savingImagePage, savingTextPage } = storeToRefs(store)
  const { saveText, replaceImage, requestClear } = store

  const pageInfo = PUBLIC_PAGES.find((item) => item.key === page)!
  const hero = computed(() => heroes.value.find((item) => item.page === page))

  const { handleSubmit, resetForm, meta } = useForm({
    validationSchema: heroSchema,
    initialValues: toFormValues(hero.value),
  })

  // Saved rows arrive after the form is created, and come back changed after a save
  watch(hero, (value) => resetForm({ values: toFormValues(value) }))

  const isSavingText = computed(() => savingTextPage.value === page)
  const isSavingImage = computed(() => savingImagePage.value === page)

  const submitText = handleSubmit(async (values) => {
    await saveText(page, {
      eyebrow: orNull(values.eyebrow),
      title: orNull(values.title),
      description: orNull(values.description),
      image_alt: orNull(values.imageAlt),
    })
  })

  // Validation message for a picked file (wrong type or too large)
  const fileError = ref<string | null>(null)

  const selectImage = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      assertPageHeroPhoto(file)
    } catch (error: any) {
      fileError.value = error.message
      return
    }
    fileError.value = null
    await replaceImage(page, file)
  }

  return {
    pageInfo,
    defaults: pageInfo.defaults,
    imageUrl: computed(() => hero.value?.image_url ?? null),
    isDirty: computed(() => meta.value.dirty),
    isSavingText,
    isSavingImage,
    fileError,
    imageAccept: '.jpg,.jpeg,.png,.webp',
    imageMaxMb: SITE_CONTENT_IMAGE_MAX_MB,
    limits: PAGE_HERO_LIMITS,
    submitText,
    resetText: () => resetForm({ values: toFormValues(hero.value) }),
    selectImage,
    requestClear: () => requestClear(page),
  }
}
