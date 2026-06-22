<script setup lang="ts">
</script>

<template>
  <div class="login-page">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<style scoped>
.login-page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
  padding: 24px;
  box-sizing: border-box;
}

/* Transition Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>

<style>
/* Override the default #app constraints from style.css */
#app {
  width: 100% !important;
  max-width: 100% !important;
  min-height: 100vh !important;
  border: none !important;
  padding: 0 !important;
  margin: 0 !important;
  text-align: left !important;
}
</style>