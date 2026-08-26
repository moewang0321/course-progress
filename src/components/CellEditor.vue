<template>
  <div class="cell-edit">
    <template v-if="editing">
      <input
        v-model="text"
        ref="input"
        class="cell-input"
        @blur="commit"
        @keyup.enter="commit"
        @keyup.esc="cancel"
      />
    </template>
    <select v-else :value="current.mode" @change="onSel" class="cell-select" size="0">
      <option value="__rest__">休（无课）</option>
      <option value="__custom__">＋ 自定义…</option>
      <optgroup v-for="g in groups" :key="g.sysId" :label="g.label">
        <option v-for="l in g.options" :key="g.sysId + l" :value="l">{{ l }}</option>
      </optgroup>
    </select>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  groups: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue', 'custom'])

const editing = ref(false)
const text = ref('')
const input = ref(null)

// 所有体系课次的平铺名单（用于判断所选值是否为"已知课次"）
const allLessonNames = computed(() =>
  props.groups.flatMap((g) => g.options)
)
function isInList(v) {
  return allLessonNames.value.includes(v)
}

const current = computed(() => {
  const v = props.modelValue
  if (!v) return { mode: '__rest__', label: '休' }
  if (isInList(v)) return { mode: v, label: v }
  return { mode: '__custom__', label: v }
})

function onSel(e) {
  const v = e.target.value
  if (v === '__custom__') {
    // 若当前值是已知课次，则预填为空（重新输入自定义）
    editing.value = true
    text.value = props.modelValue && !isInList(props.modelValue) ? props.modelValue : ''
    nextTick(() => input.value && input.value.focus())
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
.cell-select,
.cell-input {
  width: 100%;
  font-size: 12px;
  padding: 5px 6px;
  border: 1px solid var(--line-2);
  border-radius: 4px;
  background: #fff;
  font-family: 'PingFang SC', '宋体', serif;
}
.cell-input {
  border-color: var(--accent);
}
.cell-select {
  line-height: 1.2;
}
</style>