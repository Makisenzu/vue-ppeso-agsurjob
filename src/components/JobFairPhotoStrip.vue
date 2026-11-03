<script setup lang="ts">
/** The pictures PESO attached to a job fair; each opens full size in a new tab */
defineProps<{
  photos: string[]
  title: string
}>()
</script>

<template>
  <ul v-if="photos.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Job fair pictures">
    <li v-for="(photo, index) in photos" :key="photo" :class="photos.length === 1 ? 'col-span-2 sm:col-span-3' : ''">
      <AppLink
        :href="photo"
        target="_blank"
        class="block overflow-hidden rounded-lg border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        :aria-label="`Open picture ${index + 1} of ${title}`"
      >
        <img
          :src="photo"
          alt=""
          loading="lazy"
          class="w-full object-cover transition-transform hover:scale-[1.02]"
          :class="photos.length === 1 ? 'max-h-[28rem]' : 'aspect-[4/3]'"
        />
      </AppLink>
    </li>
  </ul>
</template>
