import psgcApi from '@/services/psgc'

export const getRegions = async () => {
  const { data } = await psgcApi.get('/regions/')
  return data
}

export const getProvinces = async (regionCode: string) => {
  const { data } = await psgcApi.get(`/regions/${regionCode}/provinces/`)
  return data
}

export const getCities = async (provinceCode: string) => {
  const { data } = await psgcApi.get(`/provinces/${provinceCode}/cities-municipalities/`)
  return data
}

export const getBarangays = async (cityCode: string) => {
  const { data } = await psgcApi.get(`/cities-municipalities/${cityCode}/barangays/`)
  return data
}