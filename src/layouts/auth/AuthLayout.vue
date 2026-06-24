<!-- src/layouts/auth/AuthLayout.vue -->
<template>
  <div class="auth-layout">
    <div class="auth-container">
      <!-- This is where Login.vue or Signup.vue content drops in -->
      <slot />
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff; /* Entire screen background is pure white */
  padding: 24px;
  box-sizing: border-box;
}

.auth-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>