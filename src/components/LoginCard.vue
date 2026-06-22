<script setup lang="ts">
import { ref, computed } from 'vue'

const emailOrUsername = ref('')
const isFocused = ref(false)

const labelFloated = computed(() => isFocused.value || emailOrUsername.value.length > 0)

const handleNext = () => {
  console.log('Next clicked:', emailOrUsername.value)
}

const handleCreate = () => {
  console.log('Create account clicked')
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

      <!-- Title -->
      <div class="login-title-area">
        <h1 class="login-title">Sign In to AGSURJOB</h1>
        <p class="login-subtitle">Use your agsurjob account</p>
      </div>

      <!-- Wave decoration – SVG recreation of red/white/blue swooping wave -->
      <div class="login-wave-container">
        <!-- If user has wave.png, show it; otherwise the SVG fallback below shows -->
        <img
          src="/src/assets/images/wave.png"
          alt=""
          class="login-wave-img"
          @error="($event.target as HTMLImageElement).style.display = 'none'; ($event.target as HTMLImageElement).nextElementSibling!.classList.add('wave-svg-visible')"
        />
      </div>
    </div>

    <div class="login-right">
      <!-- Input -->
      <div class="login-input-area">
        <div class="input-wrapper">
          <input
            type="text"
            id="loginEmail"
            v-model="emailOrUsername"
            @focus="isFocused = true"
            @blur="isFocused = false"
            autocomplete="username"
          />
          <label for="loginEmail" :class="{ floated: labelFloated }">
            Email or username
          </label>
        </div>
      </div>

      <!-- Social -->
      <div class="login-social">
        <span class="social-label">Continue with</span>
        <div class="social-icons">
          <!-- Facebook -->
          <button class="social-btn" aria-label="Continue with Facebook">
            <svg viewBox="0 0 24 24" width="42" height="42">
              <path fill="#1877f2" d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
            </svg>
          </button>
          <!-- Google -->
          <button class="social-btn" aria-label="Continue with Google">
            <svg viewBox="0 0 48 48" width="42" height="42">
              <path fill="#ffc107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#ff3d00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4caf50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976d2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
          </button>
          <!-- LinkedIn -->
          <button class="social-btn" aria-label="Continue with LinkedIn">
            <svg viewBox="0 0 24 24" width="42" height="42">
              <path fill="#0a66c2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="login-actions">
        <button class="btn-create" @click="handleCreate">CREATE</button>
        <button class="btn-next" @click="handleNext">NEXT</button>
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

.logo-dark {
  color: #0f1d3d;
}

.logo-red {
  color: #d32f2f;
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

/* Wave Container – absolute bottom-left of the left column */
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

/* SVG fallback – hidden unless the PNG fails to load */
.login-wave-svg {
  display: none;
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.login-wave-svg.wave-svg-visible {
  display: block;
}

.login-back-btn:hover {
  background: #1f2937;
}

.login-back-btn:active {
  transform: scale(0.93);
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
}

/* Input area */
.login-input-area {
  margin-bottom: 36px;
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

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .login-card {
    flex-direction: column;
    max-width: 420px;
    min-height: auto;
    border-radius: 20px;
  }

  .login-left {
    width: 100%;
    padding: 28px 28px 0;
    min-height: 200px;
  }

  .login-wave-container {
    height: auto;
  }

  .login-back-btn {
    bottom: 16px;
    left: 16px;
    width: 34px;
    height: 34px;
  }

  .login-right {
    padding: 32px 28px 28px;
  }

  .login-title {
    font-size: 22px;
  }
}
</style>
