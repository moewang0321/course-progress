<template>
  <div class="cell-edit">
    <n-select
      :value="internal"
      :options="options"
      children-field="options"
      size="small"
      filterable
      clearable
      placeholder="选课次"
      :consistent-menu-width="false"
      @update:value="onSelect"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { NSelect } from 'naive-ui'

const props = defineProps({
  modelValue: { type: String, default: '' },
  groups: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue', 'custom'])

// 所有体系课次的平铺名单
const allLessonNames = computed(() => props.groups.flatMap((g) => g.options))
function isInList(v) {
  return allLessonNames.value.includes(v)
}

const internal = computed(() => {
  const v = props.modelValue
  if (!v) return '__rest__'
  return isInList(v) ? v : '__rest__'
})

// 选项：休课 + 各体系课次（optgroup 分组），支持 filterable 输入查询
const options = computed(() => {
  const opts = [{ label: '休（无课）', value: '__rest__' }]
  for (const g of props.groups || []) {
    const list = Array.isArray(g.options) ? g.options : []
    if (!list.length) continue
    opts.push({
      type: 'group',
      label: g.label || String(g.sysId),
      key: g.sysId ? String(g.sysId) : 'g-' + opts.length,
      options: list.map((l) => ({ label: l, value: l }))
    })
  }
  return opts
})

function onSelect(v) {
  emit('update:modelValue', v === '__rest__' ? '' : v)
}
</script>

<style scoped>
.cell-edit {
  min-width: 150px;
}
</style>