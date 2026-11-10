import { format, isWeekend, parseISO } from 'date-fns'
import type { jsPDF } from 'jspdf'
import { printPdf, renderPaginatedPdf, type PaginatedBlock, type PaginatedDocument } from '@/helpers/common/htmlPdfHelper'
import { formatPesoAmount } from '@/helpers/common/amountInWordsHelper'
import {
  daysBetween,
  formatReportPeriod,
  formatLongDate,
  formatReceiptPeriod,
} from '@/helpers/common/gipAccomplishmentHelper'
import type {
  GipAccomplishmentActivity,
  GipAccomplishmentDay,
  GipAccomplishmentPrintContext,
  GipAccomplishmentProgram,
} from '@/types/common/gipAccomplishment'

/**
 * The printable GIP accomplishment report on the funding's own form (templates in public/templates):
 *   DOLE_GIP.docx — GIP Work Accomplishment Report: DOLE letterhead, every day of the report's dates with what was done
 *   PGAS_GIP.docx — Accomplishment Report: Activities / Output / Remarks + Acknowledgement Receipt of Payment
 * Built as HTML and laid out on A4 pages by renderPaginatedPdf (long reports continue on the next page).
 */

/** What the form prints: the saved report or the editor's current values */
export interface GipAccomplishmentPrintData {
  program: GipAccomplishmentProgram
  dailyEntries: GipAccomplishmentDay[]
  activities: GipAccomplishmentActivity[]
  designation: string | null
  supervisorName: string | null
  approverName: string | null
  approverPosition: string | null
  amount: number | string | null
  amountInWords: string | null
}

const escapeHtml = (value: string | null | undefined) =>
  (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const asset = (path: string) => new URL(path, window.location.origin).href

/** One accomplishment per line → bullet items */
const bulletLines = (text: string | null) =>
  (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•➢]\s*)?/, '').trim())
    .filter(Boolean)

// ─── DOLE: GIP Work Accomplishment Report ─────────────────────────────────

const DOLE_STYLES = `
  .page { padding: 34px 72px 30px; font-family: Calibri, Carlito, 'Segoe UI', Arial, sans-serif; color: #000; font-size: 14.5px; }
  .letterhead { display: flex; align-items: center; justify-content: center; gap: 18px; padding-bottom: 10px; }
  .letterhead img { height: 92px; width: auto; object-fit: contain; }
  .letterhead .seal-right { height: 80px; }
  .letterhead .agency { text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 17px; line-height: 1.2; }
  .letterhead .agency b { font-size: 18px; }
  .page-body { padding-top: 18px; }
  .page-footer { display: flex; align-items: flex-end; gap: 48px; padding: 8px 0 0 72px; font-family: 'Times New Roman', Times, serif; font-size: 12px; line-height: 1.25; }
  .page-footer img { height: 46px; width: auto; }
  .title { text-align: center; line-height: 1.35; margin: 4px 0 26px; }
  .title b { font-size: 15px; }
  .identity { line-height: 1.5; margin-bottom: 14px; }
  table.report { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.report td { border: 1px solid #000; vertical-align: top; padding: 2px 8px; line-height: 1.4; text-transform: uppercase; }
  table.report td.date { text-align: center; white-space: nowrap; }
  table.report ul { margin: 0; padding: 0; list-style: none; }
  table.report li { position: relative; padding-left: 26px; }
  table.report li::before { content: '\\27A2'; position: absolute; left: 4px; }
  table.report .off { color: #e00000; }
  .closing { margin-top: 34px; line-height: 1.45; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; column-gap: 40px; margin-top: 36px; }
  .signatures .label { margin-bottom: 44px; }
  .signer b { text-transform: uppercase; }
  .signer .name { font-weight: bold; text-transform: uppercase; }
  .signer .name.underline { text-decoration: underline; }
  .approved { margin-top: 40px; }
`

function doleDayRow(date: string, day: GipAccomplishmentDay | undefined): string {
  const dateCell = `<td class="date">${escapeHtml(formatLongDate(date))}</td>`
  if (isWeekend(parseISO(date))) {
    return `<tr>${dateCell}<td><ul><li class="off">${format(parseISO(date), 'EEEE').toUpperCase()}</li></ul></td></tr>`
  }
  if (!day) return `<tr>${dateCell}<td>&nbsp;</td></tr>`

  const items = bulletLines(day.entry).map((line) => `<li>${escapeHtml(line)}</li>`)
  if (day.status === 'Holiday') items.unshift('<li class="off">HOLIDAY</li>')
  if (day.status === 'Leave') items.unshift('<li class="off">ON LEAVE</li>')
  return `<tr>${dateCell}<td><ul>${items.join('')}</ul></td></tr>`
}

function buildDoleDocument(data: GipAccomplishmentPrintData, ctx: GipAccomplishmentPrintContext): PaginatedDocument {
  const byDate = new Map(data.dailyEntries.map((day) => [day.date, day]))
  const period = formatReportPeriod(ctx.from, ctx.to).toUpperCase()

  const headerHtml = `
    <div class="letterhead">
      <img src="${asset('/images/dole.png')}" alt="DOLE">
      <div class="agency">Republic of the Philippines<br><b>DEPARTMENT OF LABOR AND EMPLOYMENT</b><br>CARAGA Regional Office<br><b>Agusan del Sur Provincial Office</b></div>
      <img class="seal-right" src="${asset('/images/bagongPilipinas.png')}" alt="Bagong Pilipinas">
    </div>`
  const footerHtml = `
    <img src="${asset('/images/isoSeal.png')}" alt="ISO 9001:2015">
    <div>Address:&nbsp; 2f D'Survi Bldg. Brgy.3 San Francisco, Agusan del Sur<br>Tel. No:&nbsp;&nbsp; (085) 839-5932<br>Email&nbsp;&nbsp;&nbsp; : dole_ads@yahoo.com</div>`

  const blocks: PaginatedBlock[] = [
    {
      kind: 'html',
      html: `<div>
        <div class="title"><b>GIP WORK ACCOMPLISHMENT REPORT</b><br>For the period of <b>${escapeHtml(period)}</b></div>
        <div class="identity">NAME: ${escapeHtml(ctx.internName.toUpperCase())}<br>OFFICE ASSIGNMENT: ${escapeHtml(ctx.office.toUpperCase())}</div>
      </div>`,
    },
    {
      kind: 'table',
      tableTag: '<table class="report">',
      head: '<colgroup><col style="width:23%"><col></colgroup>',
      rows: daysBetween(ctx.from, ctx.to).map((date) => doleDayRow(date, byDate.get(date))),
    },
    {
      kind: 'html',
      html: `<div class="closing">I hereby certify that the above report is true and correct. This report is prepared to support my claim of salary within the period started.</div>`,
    },
    {
      kind: 'html',
      html: `<div class="signatures">
        <div class="signer"><div class="label">Prepared by:</div>
          <div class="name underline">${escapeHtml(ctx.internName) || 'NAME OF GIP'}</div><div style="padding-left:40px">GIP</div></div>
        <div class="signer"><div class="label">Noted by:</div>
          <div class="name">${escapeHtml(data.supervisorName) || 'NAME OF SUPERVISOR'}</div><div style="padding-left:12px">SUPERVISOR</div></div>
      </div>`,
    },
    {
      kind: 'html',
      html: `<div class="approved signer"><div class="label" style="margin-bottom:44px">Approved by:</div>
        <div class="name">${escapeHtml(data.approverName) || 'NAME OF OFFICE HEAD'}</div>
        <div style="text-transform:uppercase">${escapeHtml(data.approverPosition) || 'POSITION OF OFFICE HEAD'}</div></div>`,
    },
  ]

  return { styles: DOLE_STYLES, headerHtml, footerHtml, blocks }
}

// ─── PGAS: Accomplishment Report + Acknowledgement Receipt of Payment ─────

const PGAS_STYLES = `
  .page { padding: 64px 96px 56px; font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 15px; }
  .province { text-align: center; line-height: 1.3; }
  .province .name { font-size: 17px; font-variant: small-caps; letter-spacing: 0.3px; }
  .title { text-align: center; margin-top: 18px; line-height: 1.25; }
  .title b { font-size: 18px; }
  .identity { margin: 18px 0 22px; line-height: 1.45; }
  .identity .line { display: inline-block; min-width: 380px; border-bottom: 1px solid #000; padding: 0 4px; }
  table.report { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.report th { border: 1px solid #000; padding: 4px 6px; font-weight: bold; text-align: center; }
  table.report td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; line-height: 1.35; white-space: pre-line; height: 40px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; column-gap: 48px; margin-top: 26px; }
  .signer .label { font-weight: bold; margin-bottom: 34px; }
  .signer .line { border-bottom: 1.5px solid #000; min-height: 20px; text-align: center; font-weight: bold; text-transform: uppercase; padding: 0 4px; }
  .signer .role { text-align: center; font-style: italic; }
  .certify { margin-top: 18px; font-style: italic; text-indent: 48px; line-height: 1.35; }
  .approved { display: grid; grid-template-columns: 1fr 1fr; column-gap: 48px; margin-top: 8px; }
  .receipt-title { text-align: center; font-weight: bold; margin-top: 62px; }
  .receipt { margin-top: 18px; text-indent: 48px; line-height: 1.45; text-align: justify; }
  .receipt u { font-weight: bold; }
  .receipt-sign { display: grid; grid-template-columns: 1fr 1fr; column-gap: 48px; margin-top: 64px; }
`

function buildPgasDocument(data: GipAccomplishmentPrintData, ctx: GipAccomplishmentPrintContext): PaginatedDocument {
  // At least the template's four rows, so a short report still looks like the form
  const rows = data.activities.map(
    (row) =>
      `<tr><td>${escapeHtml(row.activity)}</td><td>${escapeHtml(row.output)}</td><td style="text-align:center">${escapeHtml(row.remarks)}</td></tr>`
  )
  while (rows.length < 4) rows.push('<tr><td></td><td></td><td></td></tr>')

  const amount = formatPesoAmount(data.amount)
  const words = (data.amountInWords ?? '').trim().toUpperCase()

  const blocks: PaginatedBlock[] = [
    {
      kind: 'html',
      html: `<div>
        <div class="province"><div class="name">PROVINCE OF AGUSAN DEL SUR</div>Gov. Democrito O. Plaza Government Center, Prosperidad</div>
        <div class="title"><b>ACCOMPLISHMENT REPORT</b><br><i>For the period of <b><u>${escapeHtml(formatReportPeriod(ctx.from, ctx.to))}</u></b></i></div>
        <div class="identity">
          Name: <span class="line">${escapeHtml(ctx.internName)}</span><br>
          Designation: <span class="line">${escapeHtml(data.designation)}</span><br>
          Office: <span class="line">${escapeHtml(ctx.office)}</span>
        </div>
      </div>`,
    },
    {
      kind: 'table',
      tableTag: '<table class="report">',
      head: '<colgroup><col style="width:51%"><col style="width:30%"><col style="width:19%"></colgroup><thead><tr><th>ACTIVITIES</th><th>OUTPUT</th><th>REMARKS</th></tr></thead>',
      rows,
    },
    {
      kind: 'html',
      html: `<div class="signatures">
        <div class="signer"><div class="label">Prepared by:</div><div class="line">${escapeHtml(ctx.internName)}</div><div class="role">GIP</div></div>
        <div class="signer"><div class="label">Reviewed by:</div><div class="line">${escapeHtml(data.supervisorName)}</div><div class="role">Supervisor</div></div>
      </div>`,
    },
    {
      kind: 'html',
      html: `<div>
        <div class="certify">I certify that the above listed activities/task/output had been accomplished by the named employee in compliance with the agreed conditions and is/are officially accepted by this office.</div>
        <div class="approved"><div></div><div class="signer"><div class="label">Approved by:</div>
          <div class="line">${escapeHtml(data.approverName)}</div><div class="role">${escapeHtml(data.approverPosition)}</div></div></div>
      </div>`,
    },
    {
      kind: 'html',
      html: `<div>
        <div class="receipt-title">ACKNOWLEDGEMENT RECEIPT OF PAYMENT</div>
        <div class="receipt">I hereby acknowledge the receipt of the sum of
          <u>${escapeHtml(words) || '&nbsp;'.repeat(40)}</u> <b>(${escapeHtml(amount) || '&nbsp;'.repeat(12)})</b>
          as payment for my services rendered for the period of <u>${escapeHtml(formatReceiptPeriod(ctx.from, ctx.to))}.</u></div>
        <div class="receipt-sign"><div></div><div class="signer"><div class="line">${escapeHtml(ctx.internName)}</div><div class="role" style="font-style:normal">GIP</div></div></div>
      </div>`,
    },
  ]

  return { styles: PGAS_STYLES, blocks }
}

// ─── Generate / print ─────────────────────────────────────────────────────

function buildDocument(data: GipAccomplishmentPrintData, ctx: GipAccomplishmentPrintContext): PaginatedDocument {
  return data.program === 'DOLE' ? buildDoleDocument(data, ctx) : buildPgasDocument(data, ctx)
}

export function createGipAccomplishmentPdf(
  data: GipAccomplishmentPrintData,
  ctx: GipAccomplishmentPrintContext
): Promise<jsPDF> {
  return renderPaginatedPdf(buildDocument(data, ctx))
}

/** "GIP_Accomplishment_2026-08-01_to_2026-08-15_juan_dela_cruz.pdf" */
export function gipAccomplishmentFileName(ctx: GipAccomplishmentPrintContext): string {
  const name = ctx.internName.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'gip'
  return `GIP_Accomplishment_${ctx.from}_to_${ctx.to}_${name}.pdf`
}

export async function downloadGipAccomplishmentPdf(
  data: GipAccomplishmentPrintData,
  ctx: GipAccomplishmentPrintContext
): Promise<void> {
  const pdf = await createGipAccomplishmentPdf(data, ctx)
  pdf.save(gipAccomplishmentFileName(ctx))
}

export async function printGipAccomplishment(
  data: GipAccomplishmentPrintData,
  ctx: GipAccomplishmentPrintContext
): Promise<void> {
  printPdf(await createGipAccomplishmentPdf(data, ctx))
}
