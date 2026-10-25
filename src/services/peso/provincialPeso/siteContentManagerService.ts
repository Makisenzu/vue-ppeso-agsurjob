import { supabase } from '@/lib/supabaseClient'
import { mediaService } from '@/services/common/mediaService'
import { buildSiteContentMediaPath } from '@/helpers/peso/provincialPeso/siteContentManagerHelper'
import {
  SITE_CONTENT_MEDIA_BUCKET,
  type AgsurMunicipality,
  type LandingProgram,
  type MunicipalityLogoItem,
  type MunicipalityLogoRow,
  type OrgChartPositionInsert,
  type OrgChartPositionItem,
  type OrgChartPositionRow,
  type OrgChartUnitInsert,
  type OrgChartUnitRow,
  type PageHeroItem,
  type PageHeroRow,
  type ProgramCardItem,
  type ProgramCardRow,
  type PublicPage,
  type SiteContentInsert,
  type SiteContentListItem,
  type SiteContentPlacement,
  type SiteContentRow,
  type SiteContentUpdate,
} from '@/types/common/siteContent'

// system.landing_program_cards (migration 049) is not in database.types.ts until `npm run types:gen`
// is re-run, so the typed client does not know the table yet. Rows are typed by ProgramCardRow.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const programCardsTable = () => (supabase.schema('system') as any).from('landing_program_cards')

// Same for system.landing_municipality_logos (migration 050), typed by MunicipalityLogoRow
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const municipalityLogosTable = () => (supabase.schema('system') as any).from('landing_municipality_logos')

// Same for system.public_page_heroes (migration 051), typed by PageHeroRow
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pageHeroesTable = () => (supabase.schema('system') as any).from('public_page_heroes')

// Same for system.org_chart_units / org_chart_positions (migration 052)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const orgChartTable = (table: 'org_chart_units' | 'org_chart_positions') => (supabase.schema('system') as any).from(table)

const toOrgChartPositionItem = (row: OrgChartPositionRow): OrgChartPositionItem => ({
  ...row,
  photo_url: row.photo_path ? mediaService.getPublicUrl(row.photo_path, SITE_CONTENT_MEDIA_BUCKET) : null,
})

/** Readable messages for the constraints in 052 that PESO can run into from the forms. */
const orgChartError = (error: { code?: string; message?: string }, fallback: string) => {
  if (error.code === '23505') return new Error('This group already has a head. Unmark the current head first.')
  if (error.code === '23503') return new Error('This division still has positions. Move or delete them first.')
  return new Error(error.message || fallback)
}

const toPageHeroItem = (row: PageHeroRow): PageHeroItem => ({
  ...row,
  image_url: row.image_path ? mediaService.getPublicUrl(row.image_path, SITE_CONTENT_MEDIA_BUCKET) : null,
})

const toMunicipalityLogoItem = (row: MunicipalityLogoRow): MunicipalityLogoItem => ({
  ...row,
  image_url: row.image_path ? mediaService.getPublicUrl(row.image_path, SITE_CONTENT_MEDIA_BUCKET) : null,
})

const toProgramCardItem = (row: ProgramCardRow): ProgramCardItem => ({
  ...row,
  image_url: row.image_path ? mediaService.getPublicUrl(row.image_path, SITE_CONTENT_MEDIA_BUCKET) : null,
})

const toListItem = (row: SiteContentRow): SiteContentListItem => ({
  ...row,
  image_url: row.image_path ? mediaService.getPublicUrl(row.image_path, SITE_CONTENT_MEDIA_BUCKET) : null,
})

/** Provincial PESO / admin management of system.site_contents (RLS: full CRUD for those roles). */
export const siteContentManagerService = {
  /** Every row of a placement, drafts and archived included. */
  async fetchAll(placement: SiteContentPlacement): Promise<SiteContentListItem[]> {
    const { data, error } = await supabase
      .schema('system')
      .from('site_contents')
      .select('*')
      .eq('placement', placement)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message || 'Failed to load site contents.')
    return (data ?? []).map(toListItem)
  },

  async create(payload: SiteContentInsert): Promise<SiteContentListItem> {
    const { data, error } = await supabase
      .schema('system')
      .from('site_contents')
      .insert(payload)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to create the content.')
    return toListItem(data)
  },

  async update(id: string, payload: SiteContentUpdate): Promise<SiteContentListItem> {
    const { data, error } = await supabase
      .schema('system')
      .from('site_contents')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update the content.')
    return toListItem(data)
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.schema('system').from('site_contents').delete().eq('id', id)
    if (error) throw new Error(error.message || 'Failed to delete the content.')
  },

  /** Uploads a photo or video under the row's folder (the storage policy requires an existing row id); returns the path. */
  async uploadMedia(contentId: string, file: File): Promise<string> {
    const path = buildSiteContentMediaPath(contentId, file.name)
    const { error } = await supabase.storage
      .from(SITE_CONTENT_MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (error) throw new Error(error.message || 'Failed to upload the file.')
    return path
  },

  async fetchProgramCards(): Promise<ProgramCardItem[]> {
    const { data, error } = await programCardsTable().select('*')
    if (error) throw new Error(error.message || 'Failed to load the program cards.')
    return ((data ?? []) as ProgramCardRow[]).map(toProgramCardItem)
  },

  /** Sets or clears a card's photo; the rows themselves are fixed (049), so there is no create or delete. */
  async updateProgramCardImage(program: LandingProgram, imagePath: string | null): Promise<ProgramCardItem> {
    const { data, error } = await programCardsTable()
      .update({ image_path: imagePath })
      .eq('program', program)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update the program card.')
    return toProgramCardItem(data as ProgramCardRow)
  },

  /** Uploads a card photo under programs/<program>/ (the storage policy in 049 only allows those folders); returns the path. */
  async uploadProgramCardImage(program: LandingProgram, file: File): Promise<string> {
    const path = buildSiteContentMediaPath(`programs/${program}`, file.name)
    const { error } = await supabase.storage
      .from(SITE_CONTENT_MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (error) throw new Error(error.message || 'Failed to upload the photo.')
    return path
  },

  async fetchMunicipalityLogos(): Promise<MunicipalityLogoItem[]> {
    const { data, error } = await municipalityLogosTable().select('*')
    if (error) throw new Error(error.message || 'Failed to load the municipality logos.')
    return ((data ?? []) as MunicipalityLogoRow[]).map(toMunicipalityLogoItem)
  },

  /** Sets or clears a logo; the rows themselves are fixed (050), so there is no create or delete. */
  async updateMunicipalityLogo(municipality: AgsurMunicipality, imagePath: string | null): Promise<MunicipalityLogoItem> {
    const { data, error } = await municipalityLogosTable()
      .update({ image_path: imagePath })
      .eq('municipality', municipality)
      .select()
      .single()

    if (error) throw new Error(error.message || 'Failed to update the logo.')
    return toMunicipalityLogoItem(data as MunicipalityLogoRow)
  },

  /** Uploads a logo under municipalities/<municipality>/ (the storage policy in 050 only allows those folders); returns the path. */
  async uploadMunicipalityLogo(municipality: AgsurMunicipality, file: File): Promise<string> {
    const path = buildSiteContentMediaPath(`municipalities/${municipality}`, file.name)
    const { error } = await supabase.storage
      .from(SITE_CONTENT_MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (error) throw new Error(error.message || 'Failed to upload the logo.')
    return path
  },

  async fetchPageHeroes(): Promise<PageHeroItem[]> {
    const { data, error } = await pageHeroesTable().select('*')
    if (error) throw new Error(error.message || 'Failed to load the page banners.')
    return ((data ?? []) as PageHeroRow[]).map(toPageHeroItem)
  },

  /** Edits a page's banner; the rows themselves are fixed (051), so there is no create or delete. */
  async updatePageHero(
    page: PublicPage,
    payload: Partial<Pick<PageHeroRow, 'eyebrow' | 'title' | 'description' | 'image_path' | 'image_alt'>>,
  ): Promise<PageHeroItem> {
    const { data, error } = await pageHeroesTable().update(payload).eq('page', page).select().single()
    if (error) throw new Error(error.message || 'Failed to update the page banner.')
    return toPageHeroItem(data as PageHeroRow)
  },

  /** Uploads a banner photo under pages/<page>/ (the storage policy in 051 only allows those folders); returns the path. */
  async uploadPageHeroImage(page: PublicPage, file: File): Promise<string> {
    const path = buildSiteContentMediaPath(`pages/${page}`, file.name)
    const { error } = await supabase.storage
      .from(SITE_CONTENT_MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (error) throw new Error(error.message || 'Failed to upload the photo.')
    return path
  },

  async fetchOrgUnits(): Promise<OrgChartUnitRow[]> {
    const { data, error } = await orgChartTable('org_chart_units').select('*').order('sort_order').order('created_at')
    if (error) throw new Error(error.message || 'Failed to load the divisions.')
    return (data ?? []) as OrgChartUnitRow[]
  },

  async createOrgUnit(payload: OrgChartUnitInsert): Promise<OrgChartUnitRow> {
    const { data, error } = await orgChartTable('org_chart_units').insert(payload).select().single()
    if (error) throw orgChartError(error, 'Failed to add the division.')
    return data as OrgChartUnitRow
  },

  async updateOrgUnit(id: string, payload: Partial<OrgChartUnitInsert>): Promise<OrgChartUnitRow> {
    const { data, error } = await orgChartTable('org_chart_units').update(payload).eq('id', id).select().single()
    if (error) throw orgChartError(error, 'Failed to update the division.')
    return data as OrgChartUnitRow
  },

  /** Fails while the division still has positions (FK RESTRICT in 052). */
  async deleteOrgUnit(id: string): Promise<void> {
    const { error } = await orgChartTable('org_chart_units').delete().eq('id', id)
    if (error) throw orgChartError(error, 'Failed to delete the division.')
  },

  async fetchOrgPositions(): Promise<OrgChartPositionItem[]> {
    const { data, error } = await orgChartTable('org_chart_positions').select('*').order('sort_order').order('created_at')
    if (error) throw new Error(error.message || 'Failed to load the positions.')
    return ((data ?? []) as OrgChartPositionRow[]).map(toOrgChartPositionItem)
  },

  async createOrgPosition(payload: OrgChartPositionInsert): Promise<OrgChartPositionItem> {
    const { data, error } = await orgChartTable('org_chart_positions').insert(payload).select().single()
    if (error) throw orgChartError(error, 'Failed to add the position.')
    return toOrgChartPositionItem(data as OrgChartPositionRow)
  },

  async updateOrgPosition(
    id: string,
    payload: Partial<OrgChartPositionInsert & Pick<OrgChartPositionRow, 'photo_path'>>,
  ): Promise<OrgChartPositionItem> {
    const { data, error } = await orgChartTable('org_chart_positions').update(payload).eq('id', id).select().single()
    if (error) throw orgChartError(error, 'Failed to update the position.')
    return toOrgChartPositionItem(data as OrgChartPositionRow)
  },

  async deleteOrgPosition(id: string): Promise<void> {
    const { error } = await orgChartTable('org_chart_positions').delete().eq('id', id)
    if (error) throw orgChartError(error, 'Failed to delete the position.')
  },

  /** Uploads a photo under org-chart/<position id>/ (the storage policy in 052 requires an existing position); returns the path. */
  async uploadOrgPositionPhoto(positionId: string, file: File): Promise<string> {
    const path = buildSiteContentMediaPath(`org-chart/${positionId}`, file.name)
    const { error } = await supabase.storage
      .from(SITE_CONTENT_MEDIA_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (error) throw new Error(error.message || 'Failed to upload the photo.')
    return path
  },

  async removeImages(paths: string[]): Promise<void> {
    if (!paths.length) return
    const { error } = await supabase.storage.from(SITE_CONTENT_MEDIA_BUCKET).remove(paths)
    if (error) throw new Error(error.message || 'Failed to remove the file.')
  },
}
