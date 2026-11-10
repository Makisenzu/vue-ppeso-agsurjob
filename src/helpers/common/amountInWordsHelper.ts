/**
 * Peso amounts in words, as written on receipts and payroll forms:
 *   5300     → "FIVE THOUSAND, THREE HUNDRED PESOS ONLY"
 *   5300.5   → "FIVE THOUSAND, THREE HUNDRED PESOS AND FIFTY CENTAVOS ONLY"
 *   1        → "ONE PESO ONLY"
 * Used to suggest the words for a typed amount; the person can still edit them.
 */

const ONES = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
  'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
] as const
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'] as const
const SCALES = [
  { value: 1_000_000_000, label: 'BILLION' },
  { value: 1_000_000, label: 'MILLION' },
  { value: 1_000, label: 'THOUSAND' },
] as const

/** 0–999 in words ("THREE HUNDRED FORTY-FIVE"); empty for 0 */
function belowThousand(n: number): string {
  const parts: string[] = []
  const hundreds = Math.floor(n / 100)
  const rest = n % 100
  if (hundreds) parts.push(`${ONES[hundreds]} HUNDRED`)
  if (rest >= 20) parts.push(rest % 10 ? `${TENS[Math.floor(rest / 10)]}-${ONES[rest % 10]}` : TENS[Math.floor(rest / 10)]!)
  else if (rest) parts.push(ONES[rest]!)
  return parts.join(' ')
}

/** A whole number in words, groups separated by commas ("FIVE THOUSAND, THREE HUNDRED") */
export function integerInWords(value: number): string {
  let n = Math.floor(Math.abs(value))
  if (n === 0) return 'ZERO'
  const groups: string[] = []
  for (const scale of SCALES) {
    if (n >= scale.value) {
      groups.push(`${belowThousand(Math.floor(n / scale.value))} ${scale.label}`)
      n %= scale.value
    }
  }
  if (n) groups.push(belowThousand(n))
  return groups.join(', ')
}

/** The amount in words for a receipt; empty when the amount is not a positive number */
export function pesoAmountInWords(amount: number | string | null | undefined): string {
  const value = typeof amount === 'string' ? Number(amount.replace(/,/g, '')) : amount
  if (value == null || !Number.isFinite(value) || value <= 0) return ''
  const cents = Math.round(value * 100)
  const pesos = Math.floor(cents / 100)
  const centavos = cents % 100

  const pesoPart = pesos ? `${integerInWords(pesos)} ${pesos === 1 ? 'PESO' : 'PESOS'}` : ''
  const centavoPart = centavos ? `${integerInWords(centavos)} ${centavos === 1 ? 'CENTAVO' : 'CENTAVOS'}` : ''
  return `${[pesoPart, centavoPart].filter(Boolean).join(' AND ')} ONLY`
}

/** "5,300.00" */
export function formatPesoAmount(amount: number | string | null | undefined): string {
  const value = typeof amount === 'string' ? Number(amount.replace(/,/g, '')) : amount
  if (value == null || !Number.isFinite(value)) return ''
  return value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
