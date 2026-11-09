<script setup lang="ts">
// ApplicantNsrpDetails.vue — Section III: language / dialect proficiency (view / edit)
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle2, Languages, Loader2, Pencil, Plus, Save, Trash2, X } from '@lucide/vue'
import { useApplicantNsrpDetailsContext } from '@/composables/peso/provincialPeso/applicantNsrpDetailsContext'

const {
  applicant,
  editingSection,
  isSaving,
  startEdit,
  cancelEdit,
  saveSection,
  editLanguageProficiencies,
  editNewLanguageName,
  addEditLanguage,
  removeEditLanguage,
} = useApplicantNsrpDetailsContext()
</script>

<template>
  <Card v-if="applicant" class="border shadow-xs">
    <CardHeader class="pb-3 border-b bg-muted/20">
      <div class="flex items-center justify-between">
        <CardTitle class="text-sm font-semibold flex items-center gap-2">
          <span>III. Language / Dialect</span>
        </CardTitle>

        <Button
          v-if="editingSection !== 'language'"
          variant="ghost"
          size="sm"
          class="gap-1.5 text-xs cursor-pointer print:hidden h-7 px-2 hover:bg-muted"
          @click="startEdit('language')"
        >
          <Pencil class="h-3.5 w-3.5 text-muted-foreground" />
          <span>Edit</span>
        </Button>
        <div v-else class="flex items-center gap-1.5 print:hidden">
          <Button
            variant="ghost"
            size="sm"
            class="gap-1 text-xs h-7 px-2 cursor-pointer"
            :disabled="isSaving"
            @click="cancelEdit"
          >
            <X class="h-3.5 w-3.5" />
            <span>Cancel</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            class="gap-1 text-xs h-7 px-2.5 cursor-pointer shadow-xs"
            :disabled="isSaving"
            @click="saveSection('language')"
          >
            <Loader2 v-if="isSaving" class="h-3.5 w-3.5 animate-spin" />
            <Save v-else class="h-3.5 w-3.5" />
            <span>Save</span>
          </Button>
        </div>
      </div>
    </CardHeader>

    <!-- VIEW MODE -->
    <CardContent v-if="editingSection !== 'language'" class="p-4 space-y-4 text-xs">
      <div class="space-y-2">
        <span class="text-muted-foreground block text-[11px] font-semibold flex items-center gap-1.5">
          <Languages class="h-3.5 w-3.5 text-primary" />
          Language &amp; Dialect Proficiencies
        </span>
        <div v-if="applicant.languageProficiencies.length > 0" class="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="text-[10px] font-semibold h-7 py-1">Language / Dialect</TableHead>
                <TableHead class="text-[10px] font-semibold h-7 py-1 text-center">Read</TableHead>
                <TableHead class="text-[10px] font-semibold h-7 py-1 text-center">Write</TableHead>
                <TableHead class="text-[10px] font-semibold h-7 py-1 text-center">Speak</TableHead>
                <TableHead class="text-[10px] font-semibold h-7 py-1 text-center">Understand</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="(lang, idx) in applicant.languageProficiencies"
                :key="idx"
                class="text-xs"
              >
                <TableCell class="py-1.5 font-medium">{{ lang.language }}</TableCell>
                <TableCell class="py-1.5 text-center">
                  <CheckCircle2 v-if="lang.read" class="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                  <span v-else class="text-muted-foreground text-[10px]">-</span>
                </TableCell>
                <TableCell class="py-1.5 text-center">
                  <CheckCircle2 v-if="lang.write" class="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                  <span v-else class="text-muted-foreground text-[10px]">-</span>
                </TableCell>
                <TableCell class="py-1.5 text-center">
                  <CheckCircle2 v-if="lang.speak" class="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                  <span v-else class="text-muted-foreground text-[10px]">-</span>
                </TableCell>
                <TableCell class="py-1.5 text-center">
                  <CheckCircle2 v-if="lang.understand" class="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                  <span v-else class="text-muted-foreground text-[10px]">-</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p v-else class="text-[11px] text-muted-foreground italic">No language proficiencies recorded</p>
      </div>
    </CardContent>

    <!-- EDIT MODE -->
    <CardContent v-else class="p-4 space-y-4 text-xs">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-foreground text-xs flex items-center gap-1">
            <Languages class="h-3.5 w-3.5 text-primary" />
            Languages &amp; Dialects
          </span>
          <div class="flex items-center gap-1.5">
            <Input
              v-model="editNewLanguageName"
              placeholder="Language name"
              class="h-7 text-xs w-32"
              @keyup.enter="addEditLanguage"
            />
            <Button size="sm" variant="outline" class="h-7 text-xs px-2 cursor-pointer" @click="addEditLanguage">
              <Plus class="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div class="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader class="bg-muted/40">
              <TableRow>
                <TableHead class="text-[10px] font-semibold h-7 py-1">Language</TableHead>
                <TableHead class="text-[10px] font-semibold h-7 py-1 text-center w-10">R</TableHead>
                <TableHead class="text-[10px] font-semibold h-7 py-1 text-center w-10">W</TableHead>
                <TableHead class="text-[10px] font-semibold h-7 py-1 text-center w-10">S</TableHead>
                <TableHead class="text-[10px] font-semibold h-7 py-1 text-center w-10">U</TableHead>
                <TableHead class="text-[10px] font-semibold h-7 py-1 text-right w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(lang, idx) in editLanguageProficiencies" :key="idx">
                <TableCell class="py-1.5 font-medium text-xs">{{ lang.language }}</TableCell>
                <TableCell class="py-1.5 text-center">
                  <input type="checkbox" v-model="lang.read" class="h-3.5 w-3.5 rounded accent-primary text-primary cursor-pointer" />
                </TableCell>
                <TableCell class="py-1.5 text-center">
                  <input type="checkbox" v-model="lang.write" class="h-3.5 w-3.5 rounded accent-primary text-primary cursor-pointer" />
                </TableCell>
                <TableCell class="py-1.5 text-center">
                  <input type="checkbox" v-model="lang.speak" class="h-3.5 w-3.5 rounded accent-primary text-primary cursor-pointer" />
                </TableCell>
                <TableCell class="py-1.5 text-center">
                  <input type="checkbox" v-model="lang.understand" class="h-3.5 w-3.5 rounded accent-primary text-primary cursor-pointer" />
                </TableCell>
                <TableCell class="py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-5 w-5 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                    @click="removeEditLanguage(idx)"
                  >
                    <Trash2 class="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
