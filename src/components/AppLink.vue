<script setup lang="ts">
import { computed } from 'vue'
import { useLink, type RouteLocationRaw } from 'vue-router'

/**
 * Every link in the app, in place of RouterLink (registered globally in main.ts) and plain <a href>.
 * It has no href, so the browser never previews the URL on hover or focus; it navigates on click
 * instead. Enter clicks it, as on a real link, so click listeners on it run from the keyboard too.
 * Ctrl / Cmd / Shift / middle click still open a new tab.
 *
 * - `to`: an app route, same as RouterLink (active classes and aria-current included)
 * - `href`: a file, external page, mailto: or tel: link; `target="_blank"` opens it in a new tab
 */
const props = withDefaults(
  defineProps<{
    to?: RouteLocationRaw
    href?: string
    target?: string
    replace?: boolean
    activeClass?: string
    exactActiveClass?: string
  }>(),
  {
    to: undefined,
    href: undefined,
    target: undefined,
    replace: false,
    activeClass: 'router-link-active',
    exactActiveClass: 'router-link-exact-active',
  }
)

// useLink needs a route; an href-only link resolves the home route and never uses it
const link = useLink({ to: computed(() => props.to ?? '/'), replace: computed(() => props.replace) })
const isRoute = computed(() => props.to !== undefined)

/** Where a new tab goes: the route's address, or the href */
const url = computed(() => (isRoute.value ? link.href.value : (props.href ?? '')))

const classes = computed(() =>
  isRoute.value
    ? {
        [props.activeClass]: link.isActive.value,
        [props.exactActiveClass]: link.isExactActive.value,
      }
    : {}
)

const wantsNewTab = (event: MouseEvent) =>
  event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1

function open(event: MouseEvent) {
  if (event.defaultPrevented || !url.value) return
  event.preventDefault()
  if (wantsNewTab(event) || props.target === '_blank') {
    window.open(url.value, '_blank', 'noopener')
    return
  }
  if (isRoute.value) void link.navigate()
  else window.location.assign(url.value)
}
</script>

<template>
  <a
    role="link"
    tabindex="0"
    class="cursor-pointer"
    :class="classes"
    :aria-current="isRoute && link.isExactActive.value ? 'page' : undefined"
    @click="open"
    @auxclick="(event: MouseEvent) => event.button === 1 && open(event)"
    @keydown.enter.prevent="($event.currentTarget as HTMLElement).click()"
  >
    <slot />
  </a>
</template>
