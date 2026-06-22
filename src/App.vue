<script setup lang="ts">
import LoginCard from './components/LoginCard.vue'
</script>

<template>
  <div class="login-page">
    <LoginCard />
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
