<template>
  <div class="page">
    <div class="page-head">
      <h2>课程体系目录</h2>
      <span class="sub">体系、课次与衔接管理 · 作为进度自动生成的知识底座</span>
    </div>

    <div class="panel">
      <div class="toolbar">
        <span class="field">
          <label>学段</label>
          <n-select
            :value="filter.stage"
            :options="stageOptions"
            placeholder="全部"
            class="field-ctl"
            @update:value="(v) => (filter.stage = v)"
          />
        </span>
        <span class="field">
          <label>年龄</label>
          <n-select
            :value="filter.age"
            :options="ageOptions"
            placeholder="全部"
            class="field-ctl"
            @update:value="(v) => (filter.age = v)"
          />
        </span>
        <span class="field">
          <label>关键字</label>
          <n-input
            v-model:value="filter.kw"
            placeholder="体系名 / 课次"
            clearable
            class="field-ctl kw"
          />
        </span>
        <span class="count-badge">{{ filtered.length }} 个体系</span>
        <span class="spacer"></span>
        <n-button type="primary" @click="showAddSystem">新增体系</n-button>
      </div>

      <n-empty v-if="!grouped.length" description="未找到匹配的体系" class="empty" />

      <div class="catalog" v-else>
        <section v-for="st in grouped" :key="st.stage" class="stage-block">
          <div class="stage-head">
            <span class="stage-tag">{{ st.stage }}阶段</span>
            <span class="stage-count">{{ st.bands.reduce((n, b) => n + b.systems.length, 0) }} 个体系</span>
          </div>

          <div v-for="b in st.bands" :key="b.band" class="band">
            <div class="band-head">
              <span class="band-label">{{ b.band }}龄段</span>
              <span class="band-count">{{ b.systems.length }} 套体系</span>
            </div>

            <div class="series-list">
              <div v-for="s in b.systems" :key="s.id" class="series">
                <div class="series-head">
                  <div class="head-left">
                    <b class="sys-name">{{ s.name }}</b>
                    <span class="tag">{{ s.stage }}</span>
                    <span class="tag accent">{{ s.age }}</span>
                  </div>
                  <span class="count">{{ s.lessons.length }} 课</span>
                  <n-button size="small" secondary @click="openEdit(s)">编辑</n-button>
                </div>

                <div class="series-lessons">
                  <div v-for="(l, i) in s.lessons" :key="i" class="lesson-chip">
                    <i class="no">{{ i + 1 }}</i>
                    <span class="name">{{ l }}</span>
                    <button class="del" title="删除课次" @click="delLesson(s, i)">✕</button>
                  </div>
                  <div class="add-chip">
                    <n-input
                      v-model:value="inputMap[s.id]"
                      size="small"
                      :placeholder="`新增到「${s.name}」…`"
                      @keyup.enter="addLessonTo(s)"
                    />
                    <n-button size="small" @click="addLessonTo(s)">添加</n-button>
                  </div>
                </div>

                <div class="series-foot">
                  <span class="next-label">下期衔接</span>
                  <span class="next-arrow">→</span>
                  <span class="next-name">{{ nextName(s) }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- 编辑体系 -->
    <n-modal
      v-model:show="editVisible"
      preset="card"
      class="form-modal"
      :title="`编辑体系：${editing?.name || ''}`"
      :bordered="false"
    >
      <div class="form-row">
        <label>学段</label>
        <n-select
          v-model:value="editing.stage"
          :options="stageOptionsFull"
        />
      </div>
      <div class="form-row">
        <label>年龄段</label>
        <n-input v-model:value="editing.age" placeholder="如 3-4岁 / 一二" />
      </div>
      <div class="form-row">
        <label>体系名称</label>
        <n-input v-model:value="editing.name" />
      </div>
      <div class="form-row">
        <label>下一衔接体系（留空=自动按同组相邻）</label>
        <n-select
          v-model:value="editing.nextId"
          clearable
          :options="nextOptions"
          placeholder="（自动推算）"
        />
      </div>
      <template #footer>
        <div class="form-actions">
          <n-button @click="editVisible = false">取消</n-button>
          <n-button type="primary" @click="saveEdit">保存</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 新增体系 -->
    <n-modal
      v-model:show="addVisible"
      preset="card"
      class="form-modal"
      title="新增体系"
      :bordered="false"
    >
      <div class="form-row">
        <label>学段</label>
        <n-select v-model:value="newSys.stage" :options="stageOptionsFull" />
      </div>
      <div class="form-row">
        <label>年龄段</label>
        <n-input v-model:value="newSys.age" placeholder="如 3-4岁 / 一二" />
      </div>
      <div class="form-row">
        <label>体系名称</label>
        <n-input v-model:value="newSys.name" />
      </div>
      <div class="form-row">
        <label>课次（每行一个）</label>
        <n-input
          v-model:value="newSys.lessonText"
          type="textarea"
          :rows="5"
          placeholder="每个课次名一行"
        />
      </div>
      <template #footer>
        <div class="form-actions">
          <n-button @click="addVisible = false">取消</n-button>
          <n-button type="primary" @click="createSystem">创建</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { NButton, NInput, NSelect, NModal, NEmpty } from 'naive-ui'
import { useStore } from '../stores/store'

const store = useStore()
const message = useMessage()

const stages = computed(() => {
  const list = store.systems.map((s) => s.stage)
  return [...new Set(list)].sort((a, b) => (a === '学前' ? -1 : 1))
})

const filter = reactive({ stage: '', age: '', kw: '' })
const editVisible = ref(false)
const addVisible = ref(false)
const editing = ref(null)
const newSys = reactive({ stage: '学前', age: '', name: '', lessonText: '' })

// 每个体系独立的"新增课次"输入框
const inputMap = reactive({})

const ages = computed(() => {
  let list = store.systems.map((s) => s.age)
  list = [...new Set(list)]
  return list.sort((a, b) => a.localeCompare(b, 'zh'))
})

const stageOptions = computed(() => [
  { label: '全部', value: '' },
  ...stages.value.map((s) => ({ label: s, value: s }))
])
const stageOptionsFull = computed(() =>
  stages.value.map((s) => ({ label: s, value: s }))
)
const ageOptions = computed(() => [
  { label: '全部', value: '' },
  ...ages.value.map((a) => ({ label: a, value: a }))
])

const filtered = computed(() => {
  return store.systems.filter((s) => {
    if (filter.stage && s.stage !== filter.stage) return false
    if (filter.age && s.age !== filter.age) return false
    if (filter.kw) {
      const kw = filter.kw.trim()
      const hitName = s.name.includes(kw)
      const hitLesson = s.lessons.some((l) => l.includes(kw))
      if (!hitName && !hitLesson) return false
    }
    return true
  })
})

// 按 学段 → 年龄段(分类) 纵向分组
const grouped = computed(() => {
  const bands = []
  const byKey = new Map()
  for (const s of filtered.value) {
    const band = s.category || s.age || '其他'
    const key = s.stage + '|' + band
    if (!byKey.has(key)) {
      byKey.set(key, { stage: s.stage, band, systems: [] })
      bands.push(byKey.get(key))
    }
    byKey.get(key).systems.push(s)
  }
  const res = []
  for (const b of bands) {
    let st = res.find((x) => x.stage === b.stage)
    if (!st) {
      st = { stage: b.stage, bands: [] }
      res.push(st)
    }
    st.bands.push(b)
  }
  return res
})

const nextOptions = computed(() =>
  store.systems.map((s) => ({
    label: `${s.name}（${s.stage}/${s.age}）`,
    value: s.id,
    disabled: s.id === editing.value?.id
  }))
)

function nextName(s) {
  const n = store.nextSystem(s.id)
  return n ? n.name : '—'
}

function delLesson(s, i) {
  store.removeLesson(s.id, i)
}
function addLessonTo(s) {
  const v = (inputMap[s.id] || '').trim()
  if (!v) return
  store.addLesson(s.id, v)
  inputMap[s.id] = ''
}

function openEdit(s) {
  editing.value = {
    id: s.id,
    stage: s.stage,
    age: s.age,
    name: s.name,
    nextId: s.nextId
  }
  editVisible.value = true
}
function saveEdit() {
  const e = editing.value
  const s = store.sysById(e.id)
  Object.assign(s, { stage: e.stage, age: e.age, name: e.name, nextId: e.nextId })
  store.persist()
  editVisible.value = false
  message.success('已保存')
}

function showAddSystem() {
  Object.assign(newSys, { stage: '学前', age: '', name: '', lessonText: '' })
  addVisible.value = true
}
function createSystem() {
  const name = newSys.name.trim()
  const age = newSys.age.trim()
  if (!name || !age) {
    message.warning('请填写体系名称与年龄段')
    return
  }
  const lessons = newSys.lessonText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  store.systems.push({
    id: 'id-' + Date.now().toString(36),
    stage: newSys.stage,
    age,
    category: newSys.stage === '学前' ? age + '岁组' : age,
    name,
    lessons,
    nextId: null
  })
  store.persist()
  addVisible.value = false
  message.success('已创建')
}
</script>

<style scoped>
.field-ctl {
  width: 120px;
}
.field-ctl.kw {
  width: 180px;
}
.count-badge {
  font-size: 12px;
  color: var(--ink-2);
  background: #f2f6f3;
  border: 1px solid var(--line);
  padding: 2px 9px;
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
}

/* ---------- 纵向分组卡片流 ---------- */
.catalog {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.stage-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.stage-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.stage-tag {
  font-size: 15px;
  font-weight: 750;
  letter-spacing: 0.04em;
  color: #1d3a2d;
}
.stage-count {
  font-size: 12px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.stage-block + .stage-block {
  padding-top: 24px;
  border-top: 1px solid var(--line);
}

.band {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.band-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.band-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-2);
  letter-spacing: 0.02em;
}
.band-count {
  font-size: 11px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.band-head::before {
  content: '';
  width: 14px;
  height: 3px;
  border-radius: 2px;
  background: var(--accent);
}

.series-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.series {
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  transition: border-color 0.16s, box-shadow 0.16s;
}
.series:hover {
  border-color: var(--accent-2);
  box-shadow: 0 6px 20px -16px rgba(30, 80, 60, 0.35);
}

.series-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--line);
  background: #fbfcfa;
}
.head-left {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.sys-name {
  font-size: 15px;
  color: var(--ink);
  font-weight: 650;
  letter-spacing: 0.01em;
}
.count {
  font-size: 11.5px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.series-lessons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
}
.lesson-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 11px;
  border: 1px solid var(--line);
  background: #f6f8f5;
  border-radius: 8px;
  font-size: 12.5px;
  color: var(--ink-2);
  transition: border-color 0.12s;
}
.lesson-chip:hover {
  border-color: rgba(31, 122, 92, 0.34);
}
.lesson-chip .no {
  font-style: normal;
  font-size: 10.5px;
  color: var(--accent);
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
}
.lesson-chip .name {
  line-height: 1.35;
}
.lesson-chip .del {
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 10px;
  padding: 0 2px;
  opacity: 0;
  transition: opacity 0.12s, color 0.12s;
}
.lesson-chip:hover .del {
  opacity: 1;
}
.lesson-chip .del:hover {
  color: var(--danger);
}

.add-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.add-chip .n-input {
  width: 170px;
}

.series-foot {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px 10px;
  border-top: 1px solid var(--line);
  background: #f2f5f2;
}
.next-label {
  font-size: 10.5px;
  color: var(--muted);
  letter-spacing: 0.06em;
}
.next-arrow {
  color: var(--accent);
  font-size: 13px;
}
.next-name {
  font-size: 12px;
  color: var(--accent);
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.form-modal {
  width: min(480px, 92vw);
}

@media (max-width: 768px) {
  .field-ctl,
  .field-ctl.kw {
    width: 100%;
  }
  .series-head {
    flex-wrap: wrap;
  }
  .add-chip .n-input {
    width: 100%;
  }
}
</style>