import { computed, ref } from 'vue'

/**
 * Bot protection for Supabase Auth with Cloudflare Turnstile.
 *
 * Off until VITE_TURNSTILE_SITE_KEY is set, so local development keeps working. Turn it on in
 * three steps, in this order:
 *   1. Create a Turnstile widget in Cloudflare (allowed hostnames: the production domain).
 *   2. Set VITE_TURNSTILE_SITE_KEY to its site key and deploy.
 *   3. Supabase → Authentication → Attack Protection: enable CAPTCHA, provider Turnstile, paste the
 *      secret key. From then on every sign-in and sign-up must carry a token.
 */
export const CAPTCHA_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || ''
export const isCaptchaEnabled = CAPTCHA_SITE_KEY !== ''

/**
 * Token state for one form. A Turnstile token is single-use, so `reset()` after every attempt
 * re-mounts the widget (bind `resetKey` to its `:key`) for a fresh one.
 */
export function useCaptcha() {
  const token = ref<string | null>(null)
  const resetKey = ref(0)

  /** True when the form may submit: CAPTCHA is off, or the visitor passed it */
  const isReady = computed(() => !isCaptchaEnabled || !!token.value)

  /** The `captchaToken` option for supabase.auth calls; undefined while CAPTCHA is off */
  const authOptions = computed(() => (isCaptchaEnabled && token.value ? { captchaToken: token.value } : {}))

  function reset() {
    token.value = null
    resetKey.value++
  }

  return { isEnabled: isCaptchaEnabled, token, resetKey, isReady, authOptions, reset }
}
