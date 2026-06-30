<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/authService'
import { toast } from 'sonner'

const router = useRouter()

const step = ref(1)
const emailOrUsername = ref('')
const password = ref('')
const isEmailFocused = ref(false)
const isPasswordFocused = ref(false)
const loading = ref(false)

const labelFloated = computed(() => isEmailFocused.value || emailOrUsername.value.length > 0)
const passwordLabelFloated = computed(() => isPasswordFocused.value || password.value.length > 0)

const handleNext = async () => {
  if (step.value === 1) {
    if (!emailOrUsername.value.trim()) {
      toast.error('Please enter your email or username')
      return
    }
    step.value = 2
  } else {
    if (!password.value) {
      toast.error('Please enter your password')
      return
    }
    
    loading.value = true
    try {
      await authService.login({
        email: emailOrUsername.value.trim(),
        password: password.value
      })
      toast.success('Successfully logged in!')
      router.push({ name: 'dashboard' })
    } catch (error: any) {
      toast.error(error.message || 'Failed to login')
    } finally {
      loading.value = false
    }
  }
}

const handleBack = () => {
  step.value = 1
  password.value = ''
}

// Replaced custom $emit with Vue Router navigation
const handleCreate = () => {
  router.push('/signup')
}
</script>

<template>
  <div class="login-card">
    <div class="login-left">
      <div class="login-logo">
        <div class="login-seal">
          <img
            src="/src/assets/images/agsur-logo.png"
            alt="AGSURJOBS Logo"
            class="login-logo-img"
            @error="($event.target as HTMLImageElement).style.display = 'none'; ($event.target as HTMLImageElement).nextElementSibling!.classList.add('seal-visible')"
          />
          <svg class="login-seal-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="22" fill="#f5c518" stroke="#b8860b" stroke-width="2"/>
            <circle cx="24" cy="24" r="17" fill="none" stroke="#b8860b" stroke-width="1"/>
            <circle cx="24" cy="24" r="13" fill="#0b1d4e"/>
            <text x="24" y="22" text-anchor="middle" fill="#ffffff" font-size="7" font-weight="700" font-family="sans-serif" dy="0.3em">PH</text>
            <text x="24" y="30" text-anchor="middle" fill="#f5c518" font-size="4" font-weight="600" font-family="sans-serif">GOV</text>
          </svg>
        </div>
      </div>

      <div class="login-title-area">
        <h1 class="login-title">Sign In to AGSURJOB</h1>
        <p class="login-subtitle">Use your agsurjob account</p>
      </div>

      <div class="login-wave-container">
        <img
          src="/src/assets/images/wave.png"
          alt=""
          class="login-wave-img"
          @error="($event.target as HTMLImageElement).style.display = 'none'; ($event.target as HTMLImageElement).nextElementSibling!.classList.add('wave-svg-visible')"
        />
      </div>
    </div>

    <div class="login-right">
      <div class="login-input-area">
        <!-- Step 1: Email -->
        <div v-if="step === 1" class="input-wrapper">
          <input
            type="text"
            id="loginEmail"
            v-model="emailOrUsername"
            @focus="isEmailFocused = true"
            @blur="isEmailFocused = false"
            autocomplete="username"
            :disabled="loading"
            @keyup.enter="handleNext"
          />
          <label for="loginEmail" :class="{ floated: labelFloated }">
            Email or username
          </label>
        </div>

        <!-- Step 2: Password -->
        <div v-else class="input-wrapper">
          <input
            type="password"
            id="loginPassword"
            v-model="password"
            @focus="isPasswordFocused = true"
            @blur="isPasswordFocused = false"
            autocomplete="current-password"
            :disabled="loading"
            @keyup.enter="handleNext"
            ref="passwordInput"
          />
          <label for="loginPassword" :class="{ floated: passwordLabelFloated }">
            Password
          </label>
        </div>
      </div>

      <div class="login-social">
        <span class="social-label">Continue with</span>
        <div class="social-icons">
          <button class="social-btn" aria-label="Continue with Facebook" :disabled="loading">
            <svg viewBox="0 0 24 24" width="42" height="42">
              <path fill="#1877f2" d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
            </svg>
          </button>
          <button class="social-btn" aria-label="Continue with Google" :disabled="loading">
            <svg viewBox="0 0 48 48" width="42" height="42">
              <path fill="#ffc107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#ff3d00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4caf50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976d2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
          </button>
          <button class="social-btn" aria-label="Continue with LinkedIn" :disabled="loading">
            <svg viewBox="0 0 24 24" width="42" height="42">
              <rect x="2" y="2" width="20" height="20" rx="10" fill="#0a66c2"/>
              <path fill="#ffffff" d="M8.55 16V9.75H6.2v6.25h2.35zM7.38 8.8c.8 0 1.3-.53 1.3-1.18c-.02-.67-.5-1.18-1.27-1.18c-.77 0-1.3.5-1.3 1.18c0 .65.5 1.18 1.25 1.18h.02zm10.12 7.2V12.7c0-1.8-.9-2.6-2.2-2.6c-1.1 0-1.6.6-1.9 1v-1.4H10v6.3h2.4v-3.7c0-.2 0-.4.1-.5c.2-.5.6-.9 1.3-.9c.9 0 1.2.7 1.2 1.7V16h2.4z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="login-actions">
        <button v-if="step === 1" class="btn-create" :disabled="loading" @click="handleCreate">CREATE</button>
        <button v-else class="btn-create" :disabled="loading" @click="handleBack">BACK</button>
        <button class="btn-next" :disabled="loading" @click="handleNext">
          {{ loading ? 'SIGNING IN...' : (step === 1 ? 'NEXT' : 'SIGN IN') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ─── Card Container ─── */
.login-card {
  position: relative;
  display: flex;
  flex-direction: row;
  width: 100%;
  max-width: 880px;
  min-height: 460px;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.07), 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  font-family: 'Nunito Sans', system-ui, sans-serif;
  margin: 0 auto;
  padding: 0;
}

/* ─── Left Column ─── */
.login-left {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 46%;
  padding: 40px 0 0 44px;
  overflow: hidden;
  z-index: 1;
}

/* Logo */
.login-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.login-logo-img {
  height: 64px;
  width: auto;
  max-width: 220px;
  object-fit: contain;
  margin-top: -20px;
}

.login-seal {
  width: auto;
  height: auto;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.login-seal-svg {
  display: none;
  width: 64px;
  height: 64px;
}

.login-seal-svg.seal-visible {
  display: block;
}

/* Title Area */
.login-title-area {
  margin-top: -10px;
}

.login-title {
  font-size: 26px;
  font-weight: 800;
  color: #0f1d3d;
  margin: 0 0 6px 0;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.login-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  font-weight: 500;
}

/* Wave Container */
.login-wave-container {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: auto;
  z-index: 0;
  pointer-events: none;
}

.login-wave-img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
  object-position: bottom left;
}

/* ─── Right Column ─── */
.login-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 44px 36px 44px;
  z-index: 2;
  margin-top: 100px;
  min-width: 0;
  box-sizing: border-box;
}

/* Input area */
.login-input-area {
  margin-bottom: 36px;
  width: 100%;
}

.input-wrapper {
  position: relative;
  width: 100%;
}

.input-wrapper input {
  width: 100%;
  padding: 18px 18px 12px;
  font-size: 15px;
  font-family: inherit;
  color: #1f2937;
  border: 1.5px solid #9ca3af;
  border-radius: 6px;
  background: transparent;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.input-wrapper input:focus {
  border-color: #2563eb;
}

.input-wrapper label {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
  color: #6b7280;
  background: #ffffff;
  padding: 0 6px;
  pointer-events: none;
  transition: all 0.2s ease;
  font-weight: 600;
}

.input-wrapper label.floated {
  top: 0;
  font-size: 12px;
  color: #374151;
}

/* Social */
.login-social {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40px;
}

.social-label {
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 14px;
}

.social-icons {
  display: flex;
  gap: 16px;
}

.social-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.2s;
}

.social-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.social-btn:active {
  transform: scale(0.95);
}

/* Actions */
.login-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 20px;
  margin-top: auto;
}

.btn-create {
  font-size: 14px;
  font-weight: 800;
  color: #1f2937;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px 6px;
  font-family: inherit;
  transition: color 0.2s;
}

.btn-create:hover {
  color: #111827;
}

.btn-next {
  font-size: 14px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  background: #0b1d4e;
  border: none;
  border-radius: 24px;
  padding: 12px 32px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(11, 29, 78, 0.25);
}

.btn-next:hover {
  background: #091640;
  box-shadow: 0 4px 16px rgba(11, 29, 78, 0.35);
}

.btn-next:active {
  transform: scale(0.97);
}

/* ─── Responsive Media Queries ─── */
@media (max-width: 768px) {
  .login-card {
    flex-direction: column;
    max-width: 90%;
    min-height: auto;
    border-radius: 28px;
    margin: 24px auto;
    border: 1px solid #cccccc;
    box-shadow: none;
  }
  .login-left {
    width: 100%;
    padding: 40px 40px 0 40px;
    box-sizing: border-box;
  }
  .login-logo-img {
    height: 48px;
    max-width: 180px;
    margin-top: 0;
  }
  .login-title-area {
    width: 100%;
  }
  .login-title {
    font-size: 24px;
  }
  .login-wave-container {
    display: none !important;
  }
  .login-right {
    padding: 32px 40px 40px 40px;
    width: 100%;
    margin-top: 0;
    box-sizing: border-box;
  }
}

@media (max-width: 480px) {
  .login-card {
    max-width: 100%;
    margin: 16px auto;
  }
  .login-left {
    padding: 32px 24px 0 24px;
  }
  .login-title {
    font-size: 22px;
  }
  .login-right {
    padding: 24px 24px 32px 24px;
  }
  .btn-next {
    padding: 10px 24px;
  }
}
</style>