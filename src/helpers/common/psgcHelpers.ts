import psgcApi from '@/services/common/psgc'
import { getOrSetPersistentCache } from '@/helpers/common/persistentCache'

const PSGC_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30

function buildPsgcCacheKey(endpoint: string) {
  return `psgc:${endpoint}`
}

export const getRegions = async () => {
  return getOrSetPersistentCache(buildPsgcCacheKey('/regions/'), PSGC_CACHE_TTL_MS, async () => {
    const { data } = await psgcApi.get('/regions/')
    return data.data || []
  })
}

export const getAllProvinces = async () => {
  return getOrSetPersistentCache(buildPsgcCacheKey('/provinces/'), PSGC_CACHE_TTL_MS, async () => {
    const { data } = await psgcApi.get('/provinces/')
    return data.data || []
  })
}

export const getProvinces = async (regionCode: string) => {
  return getOrSetPersistentCache(buildPsgcCacheKey(`/regions/${regionCode}/provinces/`), PSGC_CACHE_TTL_MS, async () => {
    const { data } = await psgcApi.get(`/regions/${regionCode}/provinces/`)
    return data.data || []
  })
}

export const getCities = async (provinceCode: string) => {
  return getOrSetPersistentCache(buildPsgcCacheKey(`/provinces/${provinceCode}/cities-municipalities/`), PSGC_CACHE_TTL_MS, async () => {
    const { data } = await psgcApi.get(`/provinces/${provinceCode}/cities-municipalities/`)
    return data.data || []
  })
}

export const getBarangays = async (cityCode: string) => {
  return getOrSetPersistentCache(buildPsgcCacheKey(`/cities-municipalities/${cityCode}/barangays/`), PSGC_CACHE_TTL_MS, async () => {
    const { data } = await psgcApi.get(`/cities-municipalities/${cityCode}/barangays/`)
    return data.data || []
  })
}