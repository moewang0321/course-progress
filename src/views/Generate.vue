<template>
  <div class="page">
    <div class="page-head">
      <h2>进度生成</h2>
      <span class="sub">选择教师与月份，自动推荐各班逐周课次，可逐格调整后导出</span>
    </div>

    <div class="panel">
      <div class="toolbar">
        <span class="field">
          <label>教师</label>
          <n-select
            :value="teacherId"
            :options="teacherOptions"
            class="field-ctl"
            @update:value="(v) => (teacherId = v)"
          />
        </span>
        <span class="field">
          <label>年</label>
          <n-select
            :value="year"
            :options="yearOptions"
            class="field-ctl-sm"
            @update:value="(v) => (year = v)"
          />
        </span>
        <span class="field">
          <label>月</label>
          <n-select
            :value="month"
            :options="monthOptions"
            class="field-ctl-sm"
            @update:value="(v) => (month = v)"
          />
        </span>
        <n-button type="primary" @click="generate">生成进度表</n-button>
        <span class="cap">{{ status }}</span>
        <span v-if="current" class="status-inline">已载入 {{ current }} 的草稿</span>
        <span class="spacer"></span>
        <n-button @click="saveDraft">保存草稿</n-button>
      </div>
    </div>

    <div class="panel" v-if="weeks.length">
      <div class="panel-title">五周日期范围 <span class="cap">（每周二~周日，周一休息）</span></div>
      <div class="wr">
        <div v-for="(w, i) in weeks" :key="w.id" class="wr-item">
          <div class="wr-label">第{{ i + 1 }}周</div>
          <div class="wr-fields">
            <n-input v-model:value="w.startMd" size="small" @blur="normalizeWeek(i)" />
            <span class="wr-dash">-</span>
            <n-input v-model:value="w.endMd" size="small" />
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">进度表</div>
      <div class="panel-hint">课次默认为系统推荐，跨体系按衔接自动延续；点击课次可改为任意体系的课次、自定义或休课。</div>

      <div class="table-wrap">
        <table class="grid gen">
          <thead>
            <tr>
              <th>课程名称</th>
              <th>年龄</th>
              <th>时间</th>
              <th>教师</th>
              <th>教室</th>
              <th>人数</th>
              <th v-for="(w, i) in weeks" :key="w.id">第{{ i + 1 }}周<br /><span class="th-date">{{ w.startMd }}~{{ w.endMd }}</span></th>
              <th>下期课程体系</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.classId">
              <td><b>{{ row.cls.courseLabel }}</b></td>
              <td>{{ row.cls.age }}</td>
              <td>{{ row.cls.time }}</td>
              <td>{{ teacherShort(row.cls.teacherId) }}</td>
              <td>{{ row.cls.room }}</td>
              <td>{{ row.cls.count }}</td>
              <td class="lesson" v-for="(cell, wi) in row.cells" :key="cell.id">
                <div class="cell-date">{{ cell.label }}<span v-if="!cell.label" class="date-none">无课</span></div>
                <CellEditor
                  :groups="allLessonGroups"
                  :model-value="cell.lesson"
                  @update:model-value="(v) => setLesson(row, wi, v)"
                  @custom="(v) => writeBack(row, v)"
                />
              </td>
              <td>
                <span class="tag accent">{{ row.nextSystem ? row.nextSystem.name : '—' }}</span>
                <span v-if="row.done" class="tag danger">本月结业</span>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="12" class="empty">请先选择教师并点击生成</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel action-bar">
      <n-button @click="goPreview">在线预览</n-button>
      <n-button type="primary" @click="goExport">导出 Excel(.xlsx)</n-button>
      <span class="cap">文件名：{{ filename }}</span>
      <div class="flex gap8 wrap" style="margin-top: 10px">
        <n-checkbox v-model:checked="writeBackPtr">导出后按实际排课回写进度</n-checkbox>
        <n-checkbox v-model:checked="keepCustom">自定义课次回写体系序列</n-checkbox>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { NButton, NInput, NSelect, NCheckbox } from 'naive-ui'
import { useStore } from '../stores/store'
import CellEditor from '../components/CellEditor.vue'
import { monthWeeks, fmtMD } from '../utils/date'
import { buildRow } from '../utils/generate'
import { saveGen } from '../utils/session'
import { useRouter } from 'vue-router'

const store = useStore()
const router = useRouter()
const message = useMessage()

const teacherId = ref(store.teachers[0]?.id || '')
const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const status = ref('未生成')
const current = ref('')
const weeks = ref([])
const rows = ref([])
const writeBackPtr = ref(true)
const keepCustom = ref(true)

const years = computed(() => {
  const y = now.getFullYear()
  return [y - 1, y, y + 1, y + 2, y + 3]
})
const teacherOptions = computed(() =>
  store.teachers.map((t) => ({ label: store.teacherLabel(t.id), value: t.id }))
)
const yearOptions = computed(() => years.value.map((y) => ({ label: `${y}年`, value: y })))
const monthOptions = computed(() =>
  Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}月`, value: i + 1 }))
)

// 所有体系课次（支持跨体系选课），按体系分组展示
const allLessonGroups = computed(() =>
  store.systems
    .filter((s) => Array.isArray(s.lessons))
    .map((s) => ({
      sysId: s.id,
      label: `${s.stage}/${s.age} · ${s.name}`,
      options: s.lessons.slice()
    }))
)

const teacherLabel = computed(() => {
  const t = store.teacherById(teacherId.value)
  return t ? (t.nick || t.name) : ''
})

const filename = computed(() => {
  return `${teacherLabel.value}${year.value}年${month.value}月进度.xlsx`
})

function teacherShort(id) {
  const t = store.teacherById(id)
  return t ? (t.nick || t.name) : '—'
}

function calcWeeks() {
  const w = monthWeeks(year.value, month.value)
  weeks.value = w.map((x) => ({
    id: x.id,
    startMd: x.startMd,
    endMd: x.endMd,
    days: x.days
  }))
}

function normalizeWeek(i) {
  const w = weeks.value[i]
  if (w) {
    w.startMd = w.startMd || ''
    w.endMd = w.endMd || ''
  }
}

function generate() {
  calcWeeks()
  rows.value = []
  current.value = ''
  const cls = store.classesByTeacher(teacherId.value)
  for (const c of cls) {
    const sys = store.sysById(c.sysId)
    if (!sys) continue
    const row = buildRow(c, sys, weeks.value, store.sysById)
    rows.value.push(row)
  }
  status.value = `已生成 ${rows.value.length} 个班级`
  // 尝试载入已保存草稿
  const draftKey = `${teacherId.value}-${year.value}-${month.value}`
  const draft = store.drafts[draftKey]
  if (draft && draft.rows) {
    applyDraft(draft)
    current.value = draftKey
  }
}

function applyDraft(draft) {
  for (const drow of draft.rows) {
    const row = rows.value.find((r) => r.classId === drow.classId)
    if (!row) continue
    drow.cells.forEach((dc, wi) => {
      if (row.cells[wi]) row.cells[wi].lesson = dc.lesson
    })
  }
}

function setLesson(row, wi, v) {
  if (row.cells[wi]) row.cells[wi].lesson = v
  status.value = `已生成 ${rows.value.length} 个班级（已修改）`
}

function writeBack(row, v) {
  // 自定义课次回写体系序列（条件开关在导出时处理，此处同步加入以便推荐连续性）
  if (!v || row.system.lessons.includes(v)) return
  store.addLesson(row.system.id, v)
}

function saveDraft() {
  if (!rows.value.length) {
    message.warning('请先生成进度表')
    return
  }
  const draftKey = `${teacherId.value}-${year.value}-${month.value}`
  store.drafts[draftKey] = {
    teacherId: teacherId.value,
    year: year.value,
    month: month.value,
    weeks: weeks.value.map((w) => ({ startMd: w.startMd, endMd: w.endMd })),
    rows: rows.value.map((row) => ({
      classId: row.classId,
      cells: row.cells.map((c) => ({ lesson: c.lesson }))
    }))
  }
  store.persist()
  current.value = draftKey
  message.success('草稿已保存')
}

function pushToSession() {
  // 计算每格实际日期（按月上课时间在当周的实际日期 + 手动编辑的周范围）
  const datesPerWeek = rows.value.map((row) =>
    row.cells.map((cell) => cell.date ? fmtMD(cell.date) : '')
  )
  void datesPerWeek
  const payload = {
    teacherId: teacherId.value,
    teacherLabel: teacherLabel.value,
    year: year.value,
    month: month.value,
    weeks: weeks.value.map((w) => ({ label: `${w.startMd}~${w.endMd}`, startMd: w.startMd, endMd: w.endMd })),
    rows: rows.value.map((row) => ({
      classId: row.classId,
      courseLabel: row.cls.courseLabel,
      age: row.cls.age,
      time: row.cls.time,
      teacher: teacherShort(row.cls.teacherId),
      room: row.cls.room,
      count: row.cls.count,
      cells: row.cells.map((c) => ({
        date: c.label,
        lesson: c.lesson
      })),
      nextSystem: row.nextSystem ? row.nextSystem.name : '—'
    })),
    writeBackPtr: writeBackPtr.value,
    keepCustom: keepCustom.value
  }
  saveGen(payload)
}

function goPreview() {
  if (!rows.value.length) {
    message.warning('请先生成进度表')
    return
  }
  pushToSession()
  router.push('/export')
}

function goExport() {
  if (!rows.value.length) {
    message.warning('请先生成进度表')
    return
  }
  pushToSession()
  router.push('/export')
}

watch(teacherId, () => {
  rows.value = []
  status.value = '未生成'
  current.value = ''
})
</script>

<style scoped>
.field-ctl {
  width: 160px;
}
.field-ctl-sm {
  width: 96px;
}
.cap {
  font-size: 12px;
  color: var(--muted);
}
.th-date {
  font-weight: 400;
  color: var(--muted);
}
.grid.gen td {
  vertical-align: top;
}
.lesson {
  min-width: 130px;
}
.cell-date {
  font-size: 10.5px;
  color: var(--accent);
  margin-bottom: 4px;
  font-weight: 600;
}
.date-none {
  color: var(--muted);
  font-weight: 400;
}
.wr {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}
.wr-item {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 8px 10px;
  font-size: 12px;
  background: #fbfaf6;
}
.wr-label {
  font-weight: 600;
  color: var(--ink-2);
  margin-bottom: 6px;
  font-size: 12px;
}
.wr-fields {
  display: flex;
  align-items: center;
  gap: 6px;
}
.wr-fields .n-input {
  flex: 1;
}
.wr-dash {
  color: var(--muted);
}
.action-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

@media (max-width: 768px) {
  .field-ctl,
  .field-ctl-sm {
    width: 100%;
  }
}
</style>