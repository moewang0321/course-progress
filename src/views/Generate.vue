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
        <n-button type="primary" @click="openGenerate">生成进度表</n-button>
        <n-button @click="saveDraft">保存草稿</n-button>
        <span class="cap">{{ status }}</span>
        <span v-if="current" class="status-inline">已载入 {{ current }} 的草稿</span>
        <span class="spacer"></span>
        <n-button @click="goPreview">在线预览</n-button>
        <n-button type="primary" @click="goExport">导出 Excel(.xlsx)</n-button>
        <span class="cap">{{ filename }}</span>
      </div>
      <div class="toolbar-sub">
        <n-checkbox v-model:checked="writeBackPtr">导出后按实际排课回写进度</n-checkbox>
        <n-checkbox v-model:checked="keepCustom">自定义课次回写体系序列</n-checkbox>
      </div>
    </div>

    <div class="panel" v-if="weeks.length">
      <div class="panel-title">进度表</div>
      <div class="panel-hint">课次默认为系统推荐，跨体系按衔接自动延续；点击课次可改为任意体系的课次、自定义或休课。</div>

      <div class="table-wrap">
        <table class="grid gen">
          <thead>
            <tr>
              <th class="drag-th">排序</th>
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
            <tr
              v-for="row in rows"
              :key="row.classId"
              :class="{ 'drag-over': dragOver === row.classId }"
            >
              <td class="drag-cell">
                <span
                  class="drag-handle"
                  draggable="true"
                  :title="'按住拖动调整排序'"
                  @dragstart="onDragStart($event, row.classId)"
                  @dragend="onDragEnd"
                  @dragover.prevent
                  @dragenter.prevent="dragOver = row.classId"
                  @drop.prevent="onDrop($event, row.classId)"
                  >⠿</span
                >
              </td>
              <td><b>{{ row.cls.courseLabel }}</b></td>
              <td>{{ row.cls.age }}</td>
              <td>{{ row.cls.time }}</td>
              <td>{{ teacherShort(row.cls.teacherId) }}</td>
              <td>{{ row.cls.room }}</td>
              <td>{{ row.cls.count }}</td>
              <td class="lesson" v-for="(cell, wi) in row.cells" :key="cell.id">
                <div class="cell-date">{{ cell.label }}<span v-if="!cell.label" class="date-none">无课</span></div>
                <template v-if="cell.rest">
                  <span class="tag rest-tag">休课</span>
                </template>
                <CellEditor
                  v-else
                  :groups="allLessonGroups"
                  :model-value="cell.lesson"
                  @update:model-value="(v) => setLesson(row, wi, v)"
                  @custom="(v) => writeBack(row, v)"
                />
              </td>
              <td>
                <span class="tag accent">{{ row.nextSystem ? row.nextSystem.name : '—' }}</span>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="13" class="empty">请先选择教师并点击生成</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 休息日确认弹窗：生成前询问本月是否有休息/停课日期 -->
    <n-modal
      v-model:show="restVisible"
      preset="card"
      class="form-modal rest-modal"
      title="休息日确认"
      :bordered="false"
    >
      <div class="rest-box">
        <p class="rest-desc">
          本月（{{ year }} 年 {{ month }} 月）是否有休息 / 停课日期？若有请选择；
          所选日期当天上课的班级，本周休课，本月课程自动向后推延一周。
        </p>
        <n-date-picker
          v-model:value="restDates"
          type="date"
          multiple
          :clearable="true"
          class="rest-picker"
          placeholder="选择休息日期（可多选）"
        />
        <div class="hint-tip">不选择任何日期直接生成，即视为本月无休息日。</div>
      </div>
      <template #footer>
        <div class="form-actions">
          <n-button @click="restVisible = false">取消</n-button>
          <n-button type="primary" @click="doGenerate">生成进度表</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { NButton, NSelect, NCheckbox, NModal, NDatePicker } from 'naive-ui'
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
const restVisible = ref(false)
const restDates = ref([])

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

function openGenerate() {
  restDates.value = []
  restVisible.value = true
}

function doGenerate() {
  restVisible.value = false
  const holidays = restDates.value.map((t) => new Date(t))
  calcWeeks()
  rows.value = []
  current.value = ''
  const cls = store.classesByTeacher(teacherId.value)
  for (const c of cls) {
    const sys = store.sysById(c.sysId)
    if (!sys) continue
    const row = buildRow(c, sys, weeks.value, store.sysById, { holidays })
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

const dragId = ref('')
const dragOver = ref('')
function onDragStart(e, id) {
  dragId.value = id
  e.dataTransfer.effectAllowed = 'move'
  if (e.dataTransfer.setData) e.dataTransfer.setData('text/plain', id)
}
function onDragEnd() {
  dragId.value = ''
  dragOver.value = ''
}
function onDrop(e, targetId) {
  const id = dragId.value || (e.dataTransfer && e.dataTransfer.getData('text/plain'))
  dragId.value = ''
  dragOver.value = ''
  if (!id || id === targetId) return
  store.moveClass(id, targetId)
  const from = rows.value.findIndex((r) => r.classId === id)
  const to = rows.value.findIndex((r) => r.classId === targetId)
  if (from >= 0 && to >= 0) {
    const [item] = rows.value.splice(from, 1)
    rows.value.splice(to, 0, item)
  }
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
.grid.gen th,
.grid.gen td {
  white-space: nowrap;
}
.lesson .n-select {
  min-width: 150px;
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
.grid.gen tbody tr:hover td .cell-date,
.grid.gen tbody tr:hover td .date-none {
  color: #fff;
}
.drag-th {
  width: 44px;
  text-align: center;
}
.drag-cell {
  text-align: center;
}
.drag-handle {
  cursor: grab;
  color: var(--muted);
  font-size: 14px;
  user-select: none;
  padding: 2px 6px;
}
.drag-handle:active {
  cursor: grabbing;
}
tr.drag-over .drag-handle {
  color: var(--memphis-primary);
}
tr.drag-over td {
  background: var(--memphis-secondary);
  box-shadow: inset 0 2px 0 var(--memphis-primary), inset 0 -2px 0 var(--memphis-primary);
}
.rest-modal {
  width: min(440px, 92vw);
}
.rest-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rest-desc {
  margin: 0;
  line-height: 1.6;
  color: var(--ink-2);
}
.rest-picker {
  width: 100%;
}
.hint-tip {
  font-size: 12px;
  color: var(--muted);
}
.rest-tag {
  border-color: var(--memphis-secondary);
  color: var(--ink-2);
}
.action-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.toolbar-sub {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 10px;
  border-top: 1px solid var(--memphis-border);
  padding-top: 10px;
}

@media (max-width: 768px) {
  .field-ctl,
  .field-ctl-sm {
    width: 100%;
  }
}
</style>