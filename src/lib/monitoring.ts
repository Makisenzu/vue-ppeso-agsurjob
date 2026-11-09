import type { App } from 'vue'
import type { Router } from 'vue-router'

/**
 * Production error monitoring (Sentry). Off until VITE_SENTRY_DSN is set, and never in `npm run dev`.
 *
 * Privacy (RA 10173, PRIVACY.md): errors only, no session replay, no IP / cookies / headers
 * (sendDefaultPii false), no user identity, no breadcrumbs that could carry form input, and every
 * string is scrubbed of emails, mobile numbers and long ids before it leaves the browser. The SDK is
 * loaded lazily so it costs nothing when monitoring is off.
 */
const DSN = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim() || ''

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const PH_MOBILE = /(\+?63|0)9\d{9}/g
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** Masks personal data in a message or URL */
export function scrubText(value: string): string {
  return value.replace(EMAIL, '[email]').replace(PH_MOBILE, '[mobile]').replace(UUID, '[id]')
}

export async function initMonitoring(app: App, router: Router): Promise<void> {
  if (!DSN || import.meta.env.DEV) return

  const Sentry = await import('@sentry/vue')
  Sentry.init({
    app,
    dsn: DSN,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration({ router })],
    // A sample of page loads for performance; errors are always sent
    tracesSampleRate: 0.1,
    // Console and click breadcrumbs may include names or form values
    beforeBreadcrumb: (crumb) => (crumb.category === 'console' || crumb.category === 'ui.input' ? null : crumb),
    beforeSend(event) {
      delete event.user
      delete event.request?.cookies
      delete event.request?.headers
      if (event.request?.url) event.request.url = scrubText(event.request.url)
      if (event.message) event.message = scrubText(event.message)
      for (const exception of event.exception?.values ?? []) {
        if (exception.value) exception.value = scrubText(exception.value)
      }
      return event
    },
  })
}
