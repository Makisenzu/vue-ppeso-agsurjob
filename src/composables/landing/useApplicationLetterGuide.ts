import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import type { ApplicationLetterConfig, ApplicationLetterGuide } from '@/types/common/applicationLetter'

/**
 * Who a program's Application Letter goes to (GIP, SPES), named from the org chart when it has them.
 * Loads the org chart; until it arrives, or when a position is vacant, titles show instead of names.
 */
export function useApplicationLetterGuide(letter: ApplicationLetterConfig) {
  const siteContentStore = useSiteContentStore()
  const { orgChart } = storeToRefs(siteContentStore)

  // Holder of a top org chart position; null while loading, vacant, or not on the chart (title only then)
  const topHolder = (pattern: RegExp) =>
    orgChart.value?.top.find((person) => pattern.test(person.position))?.name ?? null

  const letterGuide = computed<ApplicationLetterGuide>(() => {
    const { addressee, through, salutation, tips } = letter
    const governor = topHolder(addressee.titlePattern)
    const pesoManager = topHolder(through.titlePattern) ?? through.fallbackName
    return {
      addressLines: [
        governor ? `${governor.toUpperCase()}` : `The ${addressee.title}`,
        ...(governor ? [addressee.title] : []),
        addressee.office,
        // addressee.address,
      ],
      through: { name: pesoManager.toUpperCase(), title: through.title },
      salutation,
      tips,
    }
  })

  onMounted(() => {
    void siteContentStore.loadOrgChart()
  })

  return { letterGuide }
}
