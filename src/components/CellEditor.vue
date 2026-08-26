<template>
  <div class="cell-edit">
    <n-input
      v-if="editing"
      ref="inputEl"
      v-model:value="text"
      size="small"
      placeholder="课次名"
      @blur="commit"
      @keyup.enter="commit"
      @keyup.esc="cancel"
    />
    <n-select
      v-else
      :value="current.value"
      :options="options"
      size="small"
      :consistent-menu-width="false"
      @update:value="onSel"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { NInput, NSelect } from 'naive-ui'

const props = defineProps({
  modelValue: { type: String, default: '' },
  groups: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue', 'custom'])

const editing = ref(false)
const text = ref('')
const inputEl = ref(null)

// 所有体系课次的平铺名单（用于判断所选值是否为"已知课次"）
const allLessonNames = computed(() => props.groups.flatMap((g) => g.options))
function isInList(v) {
  return allLessonNames.value.includes(v)
}

const current = computed(() => {
  const v = props.modelValue
  if (!v) return { value: '__rest__' }
  if (isInList(v)) return { value: v }
  return { value: '__custom__' }
})

const options = computed(() => {
  const opts = [
    { label: '休（无课）', value: '__rest__' },
    { label: '＋ 自定义…', value: '__custom__' }
  ]
  for (const g of props.groups) {
    opts.push({
      type: 'group',
      label: g.label,
      key: g.sysId,
      options: g.options.map((l) => ({ label: l, value: l }))
    })
  }
  return opts
})

function onSel(v) {
  if (v === '__custom__') {
    editing.value = true
    text.value = props.modelValue && !isInList(props.modelValue) ? props.modelValue : ''
    nextTick(() => inputEl.value && inputEl.value.focus())
    return
  }
  emit('update:modelValue', v === '__rest__' ? '' : v)
}

function commit() {
  editing.value = false
  const v = text.value.trim()
  if (v) {
    emit('update:modelValue', v)
    emit('custom', v)
  } else {
    emit('update:modelValue', '')
  }
}
function cancel() {
  editing.value = false
}
</script>

<style scoped>
.cell-edit {
  min-width: 96px;
}
</style>