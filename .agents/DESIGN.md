# AGSURJOBS — Design System Agent

> **Purpose**: This document is the authoritative reference for the AGSURJOBS visual design system.
> Any AI agent creating or modifying UI must follow these rules to maintain visual consistency.

---

## 1. Design Philosophy & UI/UX Core Principles

AGSURJOBS is a **government job portal** for the Province of Agusan del Sur, Philippines.
The design must be:

- **Professional & trustworthy** — befitting a government LGU platform
- **Accessible** — usable by applicants across varying digital literacy levels
- **Role-aware** — 5 roles share a design system but have distinct navigation and layout contexts
- **Dark-mode native** — every component must work seamlessly in both light and dark themes

### 1.1 UI/UX Guiding Principles

Every component, page, and interaction must follow these principles. They are **non-negotiable**.

| Principle                   | Meaning                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Visual hierarchy**        | The most important element on screen should be the most visually prominent. Use size, weight, and contrast — not icons or color quantity — to establish hierarchy. |
| **Whitespace is structure**  | Generous spacing between groups creates scannable sections. Cramming elements together harms readability.  |
| **Reduce cognitive load**    | Show only what the user needs at each step. Hide complexity behind progressive disclosure (`Accordion`, `Collapsible`, `Sheet`). |
| **Consistency over creativity** | Every similar action should look and behave the same way across all roles and pages.                    |
| **Text communicates, decoration does not** | Labels, headings, and descriptions carry meaning. Decorative icons, colored badges for non-status info, and ornamental borders add noise. |
| **Feedback is immediate**    | Every user action (click, submit, delete) must produce visible feedback within 100ms — use loading states, disabled buttons, or `Skeleton` placeholders. |
| **Content density must be intentional** | Dense UIs (data tables, dashboards) are acceptable. Dense forms and dialogs are not — space out form fields and use clear section breaks. |

> [!CAUTION]
> **Before adding ANY visual element** (icon, badge, border, color, shadow, animation), ask:
> 1. Does this help the user **complete their task faster**?
> 2. Does this **communicate information** that isn't already conveyed by text or layout?
> 3. If I removed this, would the user **lose any understanding**?
>
> If the answer to all three is "no", **do not add it**.

> [!NOTE]
> Design **taste skills** are installed for public-facing and marketing work. See **Section 17** for when to use them and how they yield to this document.

---

## 2. Color System — oklch Design Tokens

All colors are defined as **CSS custom properties** using the `oklch()` color space in [`src/style.css`](file:///c:/Users/Denmark%20B.%20Rivera/OneDrive/Documents/Work/vue-agsurjobs/src/style.css).

### Light Mode Palette (`:root`)

| Token                      | oklch Value                         | Purpose                          |
| -------------------------- | ----------------------------------- | -------------------------------- |
| `--background`             | `oklch(1 0 0)`                      | Page background (white)          |
| `--foreground`             | `oklch(0.147 0.004 49.3)`           | Primary text                     |
| `--primary`                | `oklch(0.55 0.17 142)`              | Brand accent (green): buttons, checkboxes, switches, links, progress, active sidebar |
| `--primary-foreground`     | `oklch(0.982 0.018 155.826)`        | Text on primary surfaces         |
| `--secondary`              | `oklch(0.967 0.001 286.375)`        | Secondary surface                |
| `--muted`                  | `oklch(0.96 0.002 17.2)`            | Muted backgrounds                |
| `--muted-foreground`       | `oklch(0.547 0.021 43.1)`           | Secondary/hint text              |
| `--destructive`            | `oklch(0.577 0.245 27.325)`         | Error / danger states            |
| `--success`                | `oklch(0.596 0.145 163.225)`        | Positive status (Approved, Active, Valid) |
| `--warning`                | `oklch(0.666 0.179 58.318)`         | Attention status (Pending, Expiring, Needs Check) |
| `--info`                   | `oklch(0.588 0.158 241.966)`        | Informational status (Hired)     |
| `--border`                 | `oklch(0.922 0.005 34.3)`           | Default borders                  |
| `--button`                 | `oklch(58.862% 0.18554 139.497)`    | Legacy green CTA (superseded by `--primary`) |
| `--buttonTwo`              | `oklch(43.895% 0.12656 148.166)`    | Legacy dark green CTA (superseded by `--primary`) |
| `--sidebar`                | `oklch(0.986 0.002 67.8)`           | Sidebar background               |
| `--sidebar-primary`        | `oklch(0.55 0.17 142)`              | Active sidebar item              |

### Dark Mode Palette (`.dark`)

Dark tokens mirror light but shift toward `oklch` values with lower lightness. Key differences:
- `--background`: `oklch(0.147 0.004 49.3)` (near black with warm undertone)
- `--border`: `oklch(1 0 0 / 10%)` (translucent white borders)
- `--input`: `oklch(1 0 0 / 15%)` (subtle translucent inputs)
- `--card`: `oklch(0.214 0.009 43.1)` (elevated surfaces)
- `--primary`: `oklch(0.627 0.194 149.214)` (lighter green) with dark `--primary-foreground` `oklch(0.145 0.02 150)`, so green text stays readable on dark surfaces

### Rules

> [!CAUTION]
> 1. **NEVER hard-code colors** like `bg-white`, `text-black`, `#333`, `rgb(...)`.
> 2. **ALWAYS use semantic tokens**: `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, etc.
> 3. **NEVER use inline `style="color: ..."`** — use Tailwind utility classes with design tokens.
> 4. **Charts use** `--chart-1` through `--chart-5` tokens.
> 4a. **Status badges** use `--success` / `--warning` / `--info` / `--destructive` with the pattern `bg-{token}/10 text-{token} border-{token}/30` (e.g. `getGipStatusBadgeClass()` in `gipHelper.ts`). Never use raw palette colors like `amber-500` or `emerald-600`.
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

### 5.1 Component Usage — Use Installed Primitives, Don't Create Wrappers

The project has **40 shadcn-vue primitives** already installed. When you need a dialog, drawer, alert, dropdown, popover, tooltip, or any other standard UI pattern, **use the installed shadcn-vue component directly** in your template. **DO NOT create a new `.vue` wrapper file** for something that shadcn-vue already provides.

#### UI Need → shadcn-vue Component Mapping

| UI Need                          | Use This Component(s)                                | ❌ Do NOT Create                     |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------ |
| Modal / confirmation popup       | `Dialog`, `AlertDialog`                              | `ConfirmModal.vue`, `MyDialog.vue`   |
| Side panel / overlay form        | `Sheet`, `Drawer`                                    | `SidePanel.vue`, `SlideOver.vue`     |
| Dropdown actions / context menu  | `DropdownMenu`                                       | `ActionMenu.vue`, `ContextMenu.vue`  |
| Inline expandable content        | `Collapsible`, `Accordion`                           | `ExpandSection.vue`                  |
| Tooltip / info hover             | `Tooltip`, `HoverCard`                               | `InfoPopup.vue`, `HoverInfo.vue`     |
| Floating content / picker        | `Popover`                                            | `FloatingPanel.vue`                  |
| Selection dropdown               | `Select`, `Combobox`, `NativeSelect`                 | `CustomSelect.vue`                   |
| Notifications / feedback         | `useToastAlert()` (wraps `Sonner`)                   | `NotificationBanner.vue`             |
| Destructive confirmation         | `AlertDialog`                                        | `DeleteConfirm.vue`                  |
| Step-by-step flow                | `Stepper`                                            | `WizardStepper.vue`                  |
| Loading placeholder              | `Skeleton`                                           | `LoadingPlaceholder.vue`             |
| Empty state                      | `Empty`                                              | `NoDataFound.vue`                    |
| Progress indicator               | `Progress`                                           | `ProgressBar.vue`                    |

#### Correct Pattern — Inline Composition

Compose shadcn-vue primitives **directly in the parent component's template**:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const open = ref(false)
</script>

<template>
  <Button @click="open = true">Open Dialog</Button>

  <Dialog v-model:open="open">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogDescription>Are you sure you want to proceed?</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button @click="handleConfirm">Confirm</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
```

#### When Is a Custom Component Justified?

Only create a new `.vue` component when you are composing **significant business logic or role-specific layout** that goes beyond what a single shadcn-vue primitive provides — for example, a `UserAccountsTable.vue` that wires up `@tanstack/vue-table` with column definitions, search, pagination, and row actions. Simple structural wrappers around a single primitive (like a "ConfirmDialog" that just wraps `<AlertDialog>`) are **NOT justified**.

> [!CAUTION]
> 1. **DO NOT create new `.vue` files** that merely wrap a single shadcn-vue primitive (Dialog, Sheet, Drawer, AlertDialog, Popover, etc.).
> 2. **Compose primitives inline** in the parent component's `<template>` where they are used.
> 3. If the same dialog/sheet pattern is reused across **3+ unrelated components**, extract it — but import and extend the shadcn-vue primitive, never re-implement its functionality.
> 4. **Always check the installed primitives list** (Section 5) before building any UI pattern from scratch.

---

## 6. Icons — Lucide Vue (Use Sparingly)

| Setting        | Value                |
| -------------- | -------------------- |
| Package        | `@lucide/vue`        |
| Default size   | `class="size-4"`     |
| Stroke width   | Lucide default (2px) |

### 6.1 Icon Philosophy — Less Is More

Icons should **aid comprehension**, not decorate every element. Overusing icons creates visual noise, slows scanning, and makes the interface feel cluttered rather than professional. Before adding an icon, ask: **"Does this icon communicate something that the text alone does not?"** If the answer is no, omit the icon.

### 6.2 When to Use Icons

| ✅ Use Icons Here                         | Why                                                            |
| ----------------------------------------- | -------------------------------------------------------------- |
| **Sidebar navigation items**              | Icons help users scan and recognize sections quickly           |
| **Icon-only buttons** (e.g., theme toggle, close) | No text label — the icon IS the label                   |
| **Status indicators** (success ✓, error ✕, warning ⚠) | Reinforces meaning alongside color for accessibility |
| **Empty states**                          | A single illustration-style icon sets the tone                 |
| **Primary action buttons** (1 per toolbar max) | Draws attention to the main CTA                          |
| **Breadcrumb separators / chevrons**      | Structural navigation cue                                      |

### 6.3 When NOT to Use Icons

| ❌ Avoid Icons Here                       | Why                                                            |
| ----------------------------------------- | -------------------------------------------------------------- |
| **Every button in a button group**        | Text labels are sufficient; icons add clutter                  |
| **Dialog / sheet titles**                 | The title text is clear enough on its own                      |
| **Section headers / labels inside forms** | `<FormLabel>` text is self-explanatory                         |
| **Every Badge**                           | Badges are already visually distinct via color/shape           |
| **List item prefixes** (e.g., before every name) | Avatar or initials already identify the item            |
| **Repeated icons in table rows**          | If every row has the same icon, it adds no information         |
| **Secondary / outline action buttons**    | Text-only buttons keep secondary actions visually subordinate  |
| **Inline text labels** (e.g., `<Globe class="h-3 w-3" /> Overseas Locations`) | The label text already says what it is |

### 6.4 Before / After Example

❌ **Over-decorated (avoid)**:
```vue
<DialogTitle class="flex items-center gap-2">
  <Briefcase class="size-4 text-primary" />
  Bulk GIP Deployment
</DialogTitle>
<!-- ... -->
<Button @click="deploy">
  <Briefcase class="size-4" />
  Deploy Selected (5)
</Button>
<span class="flex items-center gap-1">
  <Globe class="h-3 w-3 text-primary" />
  Preferred Overseas Locations
</span>
```

✅ **Clean and readable (preferred)**:
```vue
<DialogTitle>Bulk GIP Deployment</DialogTitle>
<!-- ... -->
<Button @click="deploy">Deploy Selected (5)</Button>
<span class="text-muted-foreground text-[11px] font-semibold">
  Preferred Overseas Locations
</span>
```

### 6.5 Usage Pattern

```vue
<script setup lang="ts">
import { Sun, Moon, ChevronRight } from '@lucide/vue'
</script>

<template>
  <!-- Icon-only button — icon IS the label -->
  <Button variant="ghost" size="icon">
    <Sun class="size-4 shrink-0" />
  </Button>
</template>
```

### Rules

> [!IMPORTANT]
> 1. **Lucide icons ONLY.** Do not add Heroicons, FontAwesome, Material Icons, or any other icon library.
> 2. Import icons individually — never import the entire library.
> 3. Apply `shrink-0` when icons are inside flex containers to prevent unwanted shrinking.
> 4. **Do NOT add icons to dialog/sheet titles, form labels, or text-labeled buttons by default.** Only add an icon when it communicates meaning that the text cannot.
> 5. **Maximum 1 icon per button.** If a button has a text label, the icon is optional — prefer text-only for secondary actions.
> 6. **Never prefix every item in a list or table column with the same icon** — it adds visual weight without information.

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

---

## 16. UI/UX Design Rules — Strict Compliance

This section defines **mandatory UI/UX patterns** that all agents must follow when creating or modifying any component, dialog, page, or layout.

### 16.1 Visual Hierarchy

- **Page title** (`<h1>` or equivalent): largest, boldest text on the page. One per view.
- **Section headings**: use `font-semibold text-base` or `text-lg` — never the same weight/size as body text.
- **Body text**: `text-sm text-foreground` for primary content, `text-sm text-muted-foreground` for secondary.
- **Hint/help text**: `text-xs text-muted-foreground`.
- **Hierarchy is achieved through font size and weight** — not through adding icons, colored backgrounds, or borders to every heading.

### 16.2 Spacing & Density

| Context                  | Spacing Pattern                                    |
| ------------------------ | -------------------------------------------------- |
| Between page sections    | `space-y-6` or `gap-6`                             |
| Between cards in a grid  | `gap-4` or `gap-6`                                 |
| Inside a `Card`          | Use `CardHeader` + `CardContent` (built-in padding)|
| Between form fields      | `space-y-4` minimum                                |
| Between items in a list  | `divide-y` on the container, or `space-y-2`        |
| Inside a dialog          | `DialogHeader` → content → `DialogFooter` (no extra wrappers) |
| Inline label + value     | `flex justify-between` or `grid grid-cols-2`       |

> [!IMPORTANT]
> **Do NOT pack elements tightly.** If a section feels visually cramped, add spacing — don't add borders or backgrounds to "separate" things. Use `Separator` from shadcn-vue when a visual divider is truly needed.

### 16.3 Information Density — Progressive Disclosure

Not all information needs to be visible at once. Use installed shadcn-vue components to manage complexity:

| Scenario                                  | Use This Pattern                                                    |
| ----------------------------------------- | ------------------------------------------------------------------- |
| Long list of details (10+ fields)         | Group into `Card` sections with clear headings, or use `Accordion`  |
| Optional/advanced settings                | Hide in a `Collapsible` or `Sheet` — show a "More options" trigger  |
| Bulk actions on selected rows             | Show action bar only when `selectedIds.length > 0`                  |
| Supplementary context (history, metadata) | Place in a `Sheet` (side panel) triggered by a link or button       |
| Viewing full record details               | Use `Dialog` or dedicated route — don't inline everything in a list |
| Tooltips for field explanations            | Use `Tooltip` with concise text, not a paragraph                    |

### 16.4 Content Layout Patterns

**Key-value detail views** (e.g., applicant profile, deployment details):
```vue
<!-- Preferred: clean grid, no icons on labels -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
  <div>
    <span class="text-xs text-muted-foreground">Full Name</span>
    <p class="text-sm font-medium">{{ record.fullName }}</p>
  </div>
  <div>
    <span class="text-xs text-muted-foreground">Municipality</span>
    <p class="text-sm font-medium">{{ record.municipality }}</p>
  </div>
</div>
```

**Grouped sections** inside a detail view:
```vue
<!-- Use Card for visual grouping, Separator between sections -->
<Card>
  <CardHeader>
    <CardTitle class="text-base">Personal Information</CardTitle>
  </CardHeader>
  <CardContent>
    <!-- key-value grid here -->
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitle class="text-base">Employment Preferences</CardTitle>
  </CardHeader>
  <CardContent>
    <!-- content -->
  </CardContent>
</Card>
```

### 16.5 Interactive Feedback & Loading States

| State                | Implementation                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Page loading         | `Skeleton` placeholders matching the layout shape (not a spinner)                           |
| Button submitting    | Disable button + show `Loader2` (spin icon) + change label to gerund ("Saving...")          |
| Data fetching        | `Skeleton` rows in tables, `Skeleton` cards in grids                                        |
| Empty result         | `Empty` component with a clear message and optional action button                           |
| Destructive action   | `AlertDialog` with explicit consequence description — never a bare `window.confirm()`       |
| Success feedback     | `useToastAlert().success()` — brief, auto-dismissing                                        |
| Error feedback       | `useToastAlert().error()` — includes actionable message when possible                       |
| Progress (uploads)   | `Progress` bar with percentage — not just a spinner                                         |

### 16.6 Common Anti-Patterns — DO NOT DO THESE

| ❌ Anti-Pattern                                      | ✅ Correct Approach                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Icon on every label, heading, and button              | Icons only where they add meaning (see Section 6)                  |
| Colored badge for every piece of metadata             | Badges for **status values only** (Approved, Pending, Rejected)    |
| Deep nesting of `div > div > div` for spacing         | Use `space-y-*`, `gap-*`, or `Card`/`Separator` for structure     |
| Custom-built modal/dialog component                   | Use shadcn `Dialog` or `AlertDialog` inline (see Section 5.1)     |
| `window.confirm()` or `window.alert()`                | Use `AlertDialog` for confirms, `useToastAlert()` for feedback     |
| Showing all 20+ fields in a flat list                 | Group with `Card` sections or `Accordion`, use progressive disclosure |
| Spinner for everything                                | `Skeleton` for content, `Loader2` for buttons, `Progress` for uploads |
| Hardcoded `bg-orange-500/10 text-orange-700` colors   | Define a semantic token or use existing design tokens              |
| Creating a `<style scoped>` block for one-off styling | Use Tailwind utility classes exclusively                           |
| Adding `border` + `rounded` + `shadow` to everything  | Use `Card` when elevation is needed; plain containers otherwise    |
| Avatar/initials on every list item in a dialog        | Only use Avatars in primary lists (member lists, profiles)         |

> [!CAUTION]
> **Every UI decision must be justifiable by a UX principle from Section 1.1.** If you cannot explain which principle a visual element serves, remove it.

---

## 17. Taste Skills — Art Direction for Public-Facing Pages

The **taste-skill** pack ([`Leonxlnx/taste-skill`](https://github.com/Leonxlnx/taste-skill)) is installed as agent skills. These skills give art direction and catch "AI-made" generic output. They were written for marketing sites, **not** for this app's dashboards, so they are **scoped and subordinate to this document**.

### 17.1 Installation

```bash
npx skills add Leonxlnx/taste-skill
```

Skills install globally to `~/.agents/skills/` (symlinked into `~/.claude/skills/`). They are **not committed to this repo**. Each developer or agent environment must run the command above.

### 17.2 Installed Skills & When to Use Them

| Skill                     | Purpose                                                                                                   | Use In AGSURJOBS For                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `design-taste-frontend`   | tasteskill v2. Researched art directions, a strict no-slop house style, and a screenshot look-and-fix loop | Public landing page, `AuthLayout` pages (login/signup), program info pages (GIP, SPES, Job Fair promos) |
| `high-end-visual-design`  | Agency-level spacing, shadows, card structure, and motion guidance                                        | Spacing and polish ideas for public pages only. Not used for its font, icon, or navbar rules            |
| `gpt-taste`               | Layout variance, AIDA page structure, GSAP scroll motion                                                  | AIDA structure for a public landing page only. **Do not add GSAP** (see 17.4)                           |
| `brandkit`                | Brand-guidelines boards and logo system **image generation**                                              | AGSURJOBS / PESO branding visuals and presentation boards. Does not produce code                        |
| `imagegen-frontend-web`   | One design-reference **image** per page section                                                           | Mockup references before building a public page. Does not produce code                                  |

### 17.3 Scope — Where Taste Skills Do NOT Apply

> [!CAUTION]
> **Do NOT invoke taste skills for authenticated app screens.** This includes everything under `/admin`, `/app`, `/employer`, `/provincial-peso`, and `/municipal-peso`: dashboards, data tables, forms, dialogs, sheets, steppers, and sidebars. Those screens follow Sections 1–16 only. Section 1.1 ("Consistency over creativity") wins there.

### 17.4 Conflict Resolution — This Document Always Wins

When a taste skill rule conflicts with DESIGN.md or AGENTS.md, **the project rule wins**. Known conflicts:

| Taste Skill Says                                                    | AGSURJOBS Rule (Overrides)                                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Ban Lucide; use Phosphor / Remix icons                              | **Lucide only** (Section 6)                                                                |
| Use Geist / Satoshi / Clash Display / serif display fonts           | **Nunito Sans only** (Section 3)                                                           |
| Use GSAP / ScrollTrigger                                             | **`@vueuse/motion`, `tw-animate-css`, Vue `<transition>` only.** No new animation libraries |
| Hex values (`#050505`, `#FDFBF7`), raw `rgba()` shadows             | **Semantic `oklch` tokens only** (Section 2). Add new tokens to `src/style.css` if needed  |
| `style={{ backgroundImage }}` inline styles, `<style>` blocks       | **Tailwind utilities only**, no inline styles (Section 15)                                 |
| Custom pill buttons, double-bezel cards built from scratch          | **Compose shadcn-vue primitives** (`Button`, `Card`) with Tailwind classes (Section 5.1)    |
| Floating pill navbar, avoid sticky edge-to-edge headers             | App shells keep the sticky header in Section 7. Public pages may vary                      |
| React / JSX examples (`className`, `@gsap/react`)                   | Translate to **Vue 3 `<script setup lang="ts">`** and `class`                              |
| Dark-only or light-only palettes                                    | **Must work in both modes** (Section 8)                                                    |
| `scripts/assets.mjs` external images                                | Store and serve images through the project's media/storage services (see BACKEND.md). Credit sources |

### 17.5 What to Take From Them

Even within the project's constraints, these skill ideas are worth using on public pages:

- **Subject-first concepts.** Ground visuals in Agusan del Sur itself: its municipalities, its PESO programs, and real program numbers. Avoid generic "job portal" imagery.
- **No-slop checks.** Avoid centered hero + three icon cards + soft gradient defaults, meaningless eyebrow labels ("SECTION 01"), and dead cells in bento grids (use `grid-flow-dense`).
- **Hero headings limited to 2–3 lines.** Use wide containers.
- **Look-and-fix loop.** Screenshot at mobile, tablet, and desktop widths in both themes, then fix and re-check.
- **Reduced motion.** Respect `prefers-reduced-motion` for any entrance or scroll animation.
