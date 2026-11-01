import { computed, ref, toRef } from 'vue'
import { useSkillCombobox } from '@/composables/common/useSkillCombobox'
import { useUnknownSkillNames } from '@/composables/common/useSkillSearch'
import { joinSkillText, splitSkillText, toSkillKey } from '@/helpers/common/skillHelper'

/**
 * An NSRP free-text skill field ("Others, specify", training "skills acquired") as chips with
 * suggestions from the skill list. The value stays the same comma-separated text the field always
 * stored, so the official form, PDF and imports don't change; picking from the list just gets the
 * wording that matches (migration 100 links it).
 */
export function useSkillTextPicker(
  props: { modelValue?: string | null; disabled?: boolean },
  emit: { (e: 'update:modelValue', value: string): void; (e: 'blur', event: FocusEvent): void },
) {
  const draft = ref('')
  const names = computed(() => splitSkillText(props.modelValue))
  const takenKeys = computed(() => new Set(names.value.map(toSkillKey)))

  const setNames = (list: string[]) => emit('update:modelValue', joinSkillText(list))

  const add = (name: string) => {
    if (takenKeys.value.has(toSkillKey(name))) return
    setNames([...names.value, name])
  }
  const remove = (index: number) => setNames(names.value.filter((_, i) => i !== index))

  const combobox = useSkillCombobox({
    query: draft,
    takenKeys,
    disabled: toRef(() => !!props.disabled),
    pick: add,
    onBackspaceEmpty: () => {
      if (names.value.length) remove(names.value.length - 1)
    },
  })

  const { isUnknown } = useUnknownSkillNames(names)

  /** Leaving the box keeps what was typed, so nothing is lost by not pressing Enter */
  function onBlur(event: FocusEvent) {
    combobox.onBlur()
    if (combobox.typedOption.value) combobox.select(combobox.typedOption.value)
    else draft.value = ''
    emit('blur', event)
  }

  return { draft, names, remove, isUnknown, ...combobox, onBlur }
}
