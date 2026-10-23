import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import type { InfiniteSpiralItem } from '@/components/InfiniteSpiral.vue'
import agsurSeal from '@/assets/images/agsur.png'
import { useSiteContentStore } from '@/stores/common/siteContentStore'
import { LANDING_MUNICIPALITIES } from '@/types/common/siteContent'

/** "13 Municipalities and 1 City" section under the programs: text on the left, a spiral of LGU logos on the right. */
export function useLandingMunicipalities() {
  const store = useSiteContentStore()
  const { municipalityLogos } = storeToRefs(store)

  // Logos are set by Provincial PESO in Site Contents (system.landing_municipality_logos, migration 050);
  // an LGU without one shows the province seal, so the spiral always has all 14
  const spiralItems = computed<InfiniteSpiralItem[]>(() =>
    LANDING_MUNICIPALITIES.map((municipality) => {
      const logo = municipalityLogos.value[municipality.key]
      return {
        id: municipality.key,
        src: logo ?? agsurSeal,
        alt: logo ? `${municipality.name} logo` : '',
        label: municipality.isCity ? `City of ${municipality.name}` : municipality.name,
      }
    }),
  )

  onMounted(() => {
    void store.loadMunicipalityLogos()
  })

  return {
    titleLead: '13 Municipalities',
    titleAccent: 'and 1 City',
    description:
      'Provincial PESO serves job seekers and employers in every town of Agusan del Sur, together with the Public Employment Service Office of each local government.',
    municipalities: LANDING_MUNICIPALITIES,
    spiralItems,
  }
}
