import { DOCUMENT_UPLOAD_BUCKET, formatFileSize } from '@/helpers/common/uploadHelpers'
import { mediaService } from '@/services/common/mediaService'

export interface RequirementRowLike {
  id?: string | number | null
  requirement_id?: string | number | null
  remarks?: string | null
  name?: string | null
  title?: string | null
}

export interface RequirementMediaLike {
  applicant_requirement_id?: string | number | null
  filename?: string | null
  size?: number | null
  mime_type?: string | null
  path?: string | null
  alt_text?: string | null
  description?: string | null
}

export interface RequirementFileMeta {
  filename: string
  typeLabel: string
  sizeLabel: string | null
  path: string | null
  publicUrl: string | null
}

export interface RequirementDisplaySource {
  filename?: string | null
  remarks?: string | null
  requirement_id?: string | number | null
  id?: string | number | null
}

export function normalizeRequirementLabel(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function getRequirementRowLabel(row: RequirementRowLike) {
  return String(row?.remarks ?? row?.name ?? row?.title ?? row?.id ?? '')
}

export function getRequirementMediaMeta(
  requirement: string,
  requirementMedia: RequirementMediaLike[] = [],
  requirementRows: RequirementRowLike[] = []
): RequirementFileMeta | null {
  const normalizedRequirement = normalizeRequirementLabel(requirement)
  if (!normalizedRequirement) return null

  const matchedRequirement = requirementRows.find((row) => {
    const rowLabel = normalizeRequirementLabel(getRequirementRowLabel(row))
    const rowRequirementId = normalizeRequirementLabel(row?.requirement_id)

    return rowLabel === normalizedRequirement || rowRequirementId === normalizedRequirement
  })

  const matchedMedia = matchedRequirement
    ? requirementMedia.find(
        (media) => String(media?.applicant_requirement_id ?? '') === String(matchedRequirement.id)
      )
    : requirementMedia.find((media) => {
        const normalizedFilename = normalizeRequirementLabel(media?.filename)
        const normalizedAltText = normalizeRequirementLabel(media?.alt_text)
        const normalizedDescription = normalizeRequirementLabel(media?.description)

        return (
          normalizedFilename === normalizedRequirement ||
          normalizedAltText === normalizedRequirement ||
          normalizedDescription === normalizedRequirement
        )
      })

  if (!matchedMedia) return null

  const filename = String(matchedMedia.filename ?? requirement)
  const size = matchedMedia.size ?? null

  let typeLabel = ''
  if (matchedMedia.mime_type) {
    const parts = String(matchedMedia.mime_type).split('/')
    if (parts.length > 1) typeLabel = parts[1].toUpperCase()
  }

  if (!typeLabel) {
    const lastDot = filename.lastIndexOf('.')
    if (lastDot !== -1) typeLabel = filename.slice(lastDot + 1).toUpperCase()
  }

  const path = matchedMedia.path ?? null

  return {
    filename,
    typeLabel,
    sizeLabel: size ? formatFileSize(Number(size)) : null,
    path,
    publicUrl: path ? mediaService.getPublicUrl(path, DOCUMENT_UPLOAD_BUCKET) : null,
  }
}

export function isRequirementUploaded(
  requirement: string,
  requirementMedia: RequirementMediaLike[] = [],
  requirementRows: RequirementRowLike[] = []
) {
  return getRequirementMediaMeta(requirement, requirementMedia, requirementRows) !== null
}

export function getRequirementDisplayLabel(item: RequirementDisplaySource) {
  return String(item?.filename ?? item?.remarks ?? item?.requirement_id ?? item?.id ?? '')
}