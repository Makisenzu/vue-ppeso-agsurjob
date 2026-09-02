# AGSURJOBS — Design System Agent

> **Purpose**: This document is the authoritative reference for the AGSURJOBS visual design system.
> Any AI agent creating or modifying UI must follow these rules to maintain visual consistency.

---

## 1. Design Philosophy

AGSURJOBS is a **government job portal** for the Province of Agusan del Sur, Philippines.
The design must be:

- **Professional & trustworthy** — befitting a government LGU platform
- **Accessible** — usable by applicants across varying digital literacy levels
- **Role-aware** — 5 roles share a design system but have distinct navigation and layout contexts
- **Dark-mode native** — every component must work seamlessly in both light and dark themes

---

## 2. Color System — oklch Design Tokens

All colors are defined as **CSS custom properties** using the `oklch()` color space in [`src/style.css`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/style.css).

### Light Mode Palette (`:root`)

| Token                      | oklch Value                         | Purpose                          |
| -------------------------- | ----------------------------------- | -------------------------------- |
| `--background`             | `oklch(1 0 0)`                      | Page background (white)          |
| `--foreground`             | `oklch(0.147 0.004 49.3)`           | Primary text                     |
| `--primary`                | `oklch(0.457 0.24 277.023)`         | Brand accent (deep indigo-blue)  |
| `--primary-foreground`     | `oklch(0.962 0.018 272.314)`        | Text on primary surfaces         |
| `--secondary`              | `oklch(0.967 0.001 286.375)`        | Secondary surface                |
| `--muted`                  | `oklch(0.96 0.002 17.2)`            | Muted backgrounds                |
| `--muted-foreground`       | `oklch(0.547 0.021 43.1)`           | Secondary/hint text              |
| `--destructive`            | `oklch(0.577 0.245 27.325)`         | Error / danger states            |
| `--border`                 | `oklch(0.922 0.005 34.3)`           | Default borders                  |
| `--button`                 | `oklch(58.862% 0.18554 139.497)`    | Custom CTA button (green)        |
| `--buttonTwo`              | `oklch(43.895% 0.12656 148.166)`    | Secondary CTA button (dark green)|
| `--sidebar`                | `oklch(0.986 0.002 67.8)`           | Sidebar background               |
| `--sidebar-primary`        | `oklch(0.511 0.262 276.966)`        | Active sidebar item              |

### Dark Mode Palette (`.dark`)

Dark tokens mirror light but shift toward `oklch` values with lower lightness. Key differences:
- `--background`: `oklch(0.147 0.004 49.3)` (near black with warm undertone)
- `--border`: `oklch(1 0 0 / 10%)` (translucent white borders)
- `--input`: `oklch(1 0 0 / 15%)` (subtle translucent inputs)
- `--card`: `oklch(0.214 0.009 43.1)` (elevated surfaces)

### Rules

> [!CAUTION]
> 1. **NEVER hard-code colors** like `bg-white`, `text-black`, `#333`, `rgb(...)`.
> 2. **ALWAYS use semantic tokens**: `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, etc.
> 3. **NEVER use inline `style="color: ..."`** — use Tailwind utility classes with design tokens.
> 4. **Charts use** `--chart-1` through `--chart-5` tokens.
> 5. **Sidebar uses** dedicated `--sidebar-*` tokens for all sidebar-scoped colors.

---

## 3. Typography

| Property      | Value                                                |
| ------------- | ---------------------------------------------------- |
| **Font Family** | `Nunito Sans Variable`, sans-serif                 |
| **Import**     | Google Fonts CDN in `style.css`                     |
| **Weights**    | 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold) |
| **Heading Font** | Same as body (`--font-heading: var(--font-sans)`) |

### Rules

> [!IMPORTANT]
> 1. **DO NOT add or import additional fonts.** Nunito Sans is the only permitted font.
> 2. Use Tailwind's `font-sans` class, which maps to the Nunito Sans family.
> 3. Heading hierarchy must use proper `<h1>` through `<h6>` tags — one `<h1>` per page.

---

## 4. Border Radius System

Defined via CSS custom properties and mapped to Tailwind:

| Tailwind Class | CSS Variable                        | Computed Value |
| -------------- | ----------------------------------- | -------------- |
| `rounded-sm`   | `--radius-sm: calc(var(--radius) - 4px)` | `6.25px - 4 = 2.25px` |
| `rounded-md`   | `--radius-md: calc(var(--radius) - 2px)` | `4.25px`       |
| `rounded-lg`   | `--radius-lg: var(--radius)`        | `0.625rem` (10px) |
| `rounded-xl`   | `--radius-xl: calc(var(--radius) + 4px)` | `14px`         |

Base `--radius` = `0.625rem`.

---

## 5. Component Library — shadcn-vue

### Configuration ([`components.json`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/components.json))

| Setting        | Value           |
| -------------- | --------------- |
| Style          | `reka-vega`     |
| Font           | `nunito-sans`   |
| Base color     | `taupe`         |
| Icon library   | `lucide`        |
| TypeScript     | `true`          |
| CSS Variables  | `true`          |

### Installed Primitives (40 components)

Located in [`src/components/ui/`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/components/ui):

`accordion` · `alert` · `alert-dialog` · `attachment` · `avatar` · `badge` · `breadcrumb` · `button` · `calendar` · `card` · `chart` · `checkbox` · `collapsible` · `combobox` · `dialog` · `dot-field` · `drawer` · `dropdown-menu` · `empty` · `form` · `hover-card` · `input` · `input-group` · `label` · `native-select` · `popover` · `progress` · `radio-group` · `select` · `separator` · `sheet` · `skeleton` · `sidebar` · `sonner` · `stepper` · `switch` · `table` · `textarea` · `tooltip` · `variable-proximity`

### Rules

> [!CAUTION]
> 1. **NEVER manually edit** files inside `src/components/ui/`. They are shadcn-vue managed.
> 2. To add new primitives: `npx shadcn-vue@latest add <component-name>`
> 3. **DO NOT install** Vuetify, Element Plus, Quasar, PrimeVue, or any other component library.
> 4. Custom shared components live **outside** `ui/` at the `src/components/` root or role subdirectories.

---

## 6. Icons — Lucide Vue

| Setting        | Value                |
| -------------- | -------------------- |
| Package        | `@lucide/vue`        |
| Default size   | `class="size-4"`     |
| Stroke width   | Lucide default (2px) |

### Usage Pattern

```vue
<script setup lang="ts">
import { Sun, Moon, ChevronRight } from '@lucide/vue'
</script>

<template>
  <Sun class="size-4 shrink-0" />
</template>
```

### Rules

> [!IMPORTANT]
> 1. **Lucide icons ONLY.** Do not add Heroicons, FontAwesome, Material Icons, or any other icon library.
> 2. Import icons individually — never import the entire library.
> 3. Apply `shrink-0` when icons are inside flex containers to prevent unwanted shrinking.

---

## 7. Layout Architecture

Every role follows the same shell pattern, defined in [`src/layouts/`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/layouts):

```
┌──────────────────────────────────────────────────────────┐
│ SidebarProvider (default-open, persisted via storage-key)│
│ ┌──────────────┬───────────────────────────────────────┐ │
│ │  RoleSidebar │  <main>                               │ │
│ │  (collapsible│  ┌──────────────────────────────────┐ │ │
│ │   navigation)│  │ <header> (sticky, z-50)          │ │ │
│ │              │  │  SidebarTrigger + Breadcrumbs     │ │ │
│ │              │  │  + Theme Toggle (ml-auto)         │ │ │
│ │              │  ├──────────────────────────────────┤ │ │
│ │              │  │ Content area: <RouterView/>      │ │ │
│ │              │  │ (p-4 sm:p-6)                     │ │ │
│ │              │  └──────────────────────────────────┘ │ │
│ └──────────────┴───────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Header Pattern

```html
<header class="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2
  border-b border-sidebar-border/40 px-3 sm:px-4
  bg-background/95 backdrop-blur
  supports-backdrop-filter:bg-background/60 transition-colors duration-200">
```

Key features:
- **Sticky** with `backdrop-blur` glassmorphism
- **z-50** to stay above content
- **h-16** fixed height (64px)
- Theme toggle button in the far right (`ml-auto`)

### Content Area

```html
<div class="flex-1 p-4 sm:p-6 bg-background text-foreground
  transition-colors duration-200 overflow-x-hidden">
  <RouterView/>
</div>
```

### Layouts by Role

| Layout File                    | Sidebar Component         |
| ------------------------------ | ------------------------- |
| `AdminLayout.vue`              | `AdminSidebar.vue`        |
| `ApplicantLayout.vue`          | `ApplicantSidebar.vue`    |
| `EmployerLayout.vue`           | `EmployerSidebar.vue`     |
| `ProvincialPesoLayout.vue`     | `ProvincialPesoSidebar.vue` |
| `MunicipalPesoLayout.vue`      | `MunicipalPesoSidebar.vue`  |
| `AuthLayout.vue`               | _(no sidebar — public)_   |

---

## 8. Dark Mode

| Setting          | Value                                       |
| ---------------- | ------------------------------------------- |
| Implementation   | `@vueuse/core` → `useColorMode()`           |
| Variant          | `@custom-variant dark (&:is(.dark *))`       |
| Toggle           | Button in each layout header                 |
| Persistence      | Automatic via `useColorMode()` (localStorage)|

### Rules

> [!IMPORTANT]
> 1. **Every component must work in dark mode.** Use semantic tokens that have dark variants defined.
> 2. When a specific dark-only override is needed, use `dark:` prefix: `dark:bg-accent`.
> 3. **Test both modes** when creating new components.

---

## 9. Animation System

### Technologies

| Library            | Usage                                           |
| ------------------ | ----------------------------------------------- |
| `@vueuse/motion`   | Declarative motion directives (`v-motion`)       |
| `tw-animate-css`   | Tailwind-compatible CSS animation utilities      |
| Vue `<transition>` | Route transitions, enter/leave animations        |

### Route Transition

Defined in [`style.css`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/style.css#L199-L207):

```css
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
```

Applied in [`App.vue`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/App.vue):

```vue
<RouterView v-slot="{ Component }">
  <transition name="fade" mode="out-in">
    <component :is="Component" />
  </transition>
</RouterView>
```

### Shared Visual Effect Components

- [`Aurora.vue`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/components/Aurora.vue) — Animated aurora background effect
- [`Plasma.vue`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/components/Plasma.vue) — Plasma visual effect
- [`SpotLightCard.vue`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/components/SpotLightCard.vue) — Spotlight hover card

---

## 10. Sidebar Active State Styling

Active navigation links in sidebars are styled via CSS in [`style.css`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/style.css#L212-L219):

```css
.group\/sidebar-menu-button .router-link-active,
.group\/sidebar-menu-button .router-link-exact-active {
  @apply bg-sidebar-accent text-sidebar-accent-foreground font-medium;
}

.router-link-active span {
  @apply text-sidebar-accent-foreground;
}
```

These use sidebar-specific semantic tokens, not hardcoded colors.

---

## 11. Responsive Design

| Breakpoint | Tailwind Prefix | Usage                              |
| ---------- | --------------- | ---------------------------------- |
| Mobile     | _(default)_     | `p-3 px-3`                        |
| Small+     | `sm:`           | `sm:p-4 sm:px-4 sm:p-6`           |
| Medium+    | `md:`           | Layout adjustments                 |
| Large+     | `lg:`           | Full desktop layouts               |

### Rules

> [!IMPORTANT]
> 1. All layouts must be mobile-first (default classes = mobile).
> 2. Sidebar collapses on mobile via `SidebarProvider` built-in behavior.
> 3. Content must use `overflow-x-hidden` and `min-w-0` to prevent horizontal overflow.
> 4. Tables should have horizontal scroll containers on mobile.

---

## 12. Form Design Pattern

Forms use **vee-validate** + **zod** for validation with shadcn-vue form components:

```vue
<FormField v-slot="{ componentField }" name="email">
  <FormItem>
    <FormLabel>Email</FormLabel>
    <FormControl>
      <Input v-bind="componentField" placeholder="Enter email" />
    </FormControl>
    <FormMessage />
  </FormItem>
</FormField>
```

### Rules

> [!IMPORTANT]
> 1. **Always use** `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>` from shadcn-vue.
> 2. **Validation schemas** use `zod` and are connected via `@vee-validate/zod`.
> 3. Form error messages are rendered by `<FormMessage/>` — never build custom error displays.

---

## 13. Data Table Design

Tables use **@tanstack/vue-table** with shadcn-vue `<Table>` components:

- Column definitions live in the **composable** (e.g., `useUserAccounts.ts`), NOT the component
- Use `<Table>`, `<TableHeader>`, `<TableRow>`, `<TableHead>`, `<TableBody>`, `<TableCell>` from shadcn-vue
- Row actions use `<DropdownMenu>` or `<Button>` variants

---

## 14. Toast / Notification Design

Toast notifications use the custom [`useToastAlert()`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/composables/common/useToastAlert.ts) composable, rendered by the global [`ToastAlert.vue`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/components/ToastAlert.vue) in `App.vue` via `<Teleport to="body">`.

### Rules

> [!CAUTION]
> 1. **NEVER import `sonner` or `vue-sonner` directly** in components.
> 2. **Always use** `useToastAlert()` — it wraps sonner with project-specific styling.
> 3. Toast calls: `toastAlert.success(title, description)`, `.error()`, `.info()`.

---

## 15. Styling Rules — Summary

> [!CAUTION]
> 1. **NO `<style>` blocks** in `.vue` components. All styling via Tailwind utility classes.
> 2. **NO new CSS files.** All custom styles go in `src/style.css`.
> 3. **NO inline styles** (`style="..."`) — use Tailwind classes.
> 4. **NO hardcoded colors** — use design tokens.
> 5. **Component files** use `PascalCase.vue` naming.
> 6. **Always support dark mode** via semantic tokens or `dark:` prefix.
> 7. **Chart components** use `@unovis/vue` + `@unovis/ts` — no other charting libraries.
> 8. **Map components** use `mapbox-gl` — no other mapping libraries.
