<template>
  <div class="page">
    <div class="page-head">
      <h2>班级与进度</h2>
      <span class="sub">班级台账与上课进度，是月度进度生成的依据</span>
    </div>

    <div class="panel">
      <div class="toolbar">
        <span class="field">
          <label>教师</label>
          <n-select
            :value="teacherFilter"
            :options="teacherOptions"
            placeholder="全部教师"
            clearable
            class="field-ctl"
            @update:value="(v) => (teacherFilter = v)"
          />
        </span>
        <span class="count-badge">{{ visibleClasses.length }} 个班级</span>
        <span class="spacer"></span>
        <n-button @click="teacherMgr = true">管理教师</n-button>
        <n-button type="primary" @click="openAdd">新增班级</n-button>
      </div>

      <div class="table-wrap">
        <table class="grid">
          <thead>
            <tr>
              <th>课程名称</th>
              <th>年龄</th>
              <th>上课时间</th>
              <th>教师</th>
              <th>教室</th>
              <th>人数</th>
              <th>体系</th>
              <th style="min-width: 200px">进度指针</th>
              <th>下一课次</th>
              <th style="min-width: 190px; white-space: nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in visibleClasses" :key="c.id">
              <td><b>{{ c.courseLabel }}</b></td>
              <td>{{ c.age }}</td>
              <td>{{ c.time }}</td>
              <td>{{ teacherShort(c.teacherId) }}</td>
              <td>{{ c.room }}</td>
              <td>{{ c.count }}</td>
              <td><span class="tag">{{ sysName(c.sysId) }}</span></td>
              <td>
                <div class="ptr">
                  <div class="track">
                    <div class="fill" :style="{ width: pct(c) + '%' }"></div>
                  </div>
                  <span class="lbl">{{ c.ptr }}/{{ sysLessons(c.sysId).length }}</span>
                </div>
              </td>
              <td>
                <span class="tag accent">{{ nextLesson(c) }}</span>
              </td>
              <td>
                <div class="ops">
                  <n-button size="small" title="推进1课" @click="advance(c)">推进 1 课</n-button>
                  <n-button size="small" secondary @click="openEdit(c)">编辑</n-button>
                  <n-button size="small" tertiary type="error" @click="askDelClass(c)">删除</n-button>
                </div>
              </td>
            </tr>
            <tr v-if="!visibleClasses.length">
              <td colspan="10"><n-empty description="暂无班级，请新增或切换教师" class="empty" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 编辑/新增弹窗 -->
    <n-modal
      v-model:show="formVisible"
      preset="card"
      class="form-modal"
      :title="form ? (form.id ? '编辑班级' : '新增班级') : ''"
      :bordered="false"
    >
      <div v-if="form">
        <div v-if="!form.id" class="form-row sync-row">
          <label>同步参照班级 <span class="tip">（选择后一键复制其课程与进度）</span></label>
          <div class="sync">
            <n-select
              v-model:value="syncFrom"
              :options="syncOptions"
              placeholder="— 不同步，手动填写 —"
              class="sync-sel"
            />
            <n-button size="small" :disabled="!syncFrom" @click="applySync">应用该班</n-button>
          </div>
        </div>
        <div class="form-row">
          <label>绑定体系 <span class="tip">（选择后自动带出课程名称与年龄）</span></label>
          <n-select v-model:value="form.sysId" :options="systemOptions" @update:value="onChangeSystem" />
        </div>
        <div class="form-row">
          <label>课程名称</label>
          <n-input v-model:value="form.courseLabel" placeholder="如：机械构造一上" />
        </div>
        <div class="form-row">
          <label>年龄</label>
          <n-input v-model:value="form.age" placeholder="如：六岁" />
        </div>
        <div class="form-row">
          <label>上课时间（如 二17:00 / 周六10:00）</label>
          <n-input v-model:value="form.time" placeholder="如：二17:00" />
        </div>
        <div class="form-row">
          <label>教师</label>
          <n-select v-model:value="form.teacherId" :options="teacherOptions" />
        </div>
        <div class="form-row">
          <label>教室</label>
          <n-input v-model:value="form.room" placeholder="如：15号" />
        </div>
        <div class="form-row">
          <label>人数</label>
          <n-input-number v-model:value="form.count" :min="0" class="count-ctl" />
        </div>
        <div class="form-row">
          <label>当前进度（选择已上到的课程）</label>
          <n-select v-model:value="form.ptr" :options="ptrOptions" />
          <div class="hint">{{ nextHint }}</div>
        </div>
      </div>
      <template #footer>
        <div class="form-actions">
          <n-button @click="formVisible = false">取消</n-button>
          <n-button type="primary" @click="save">{{ form?.id ? '保存' : '创建' }}</n-button>
        </div>
      </template>
    </n-modal>

    <!-- 教师管理 -->
    <n-modal
      v-model:show="teacherMgr"
      preset="card"
      class="form-modal teacher-modal"
      title="教师管理"
      :bordered="false"
    >
      <div class="form-row add-teacher">
        <label>新增教师</label>
        <div class="add-teacher-row">
          <n-input v-model:value="tName" placeholder="姓名（必填）" />
          <n-input v-model:value="tNick" placeholder="昵称（可选）" />
          <n-button type="primary" @click="addTeacher">添加</n-button>
        </div>
      </div>
      <div class="teacher-list">
        <div v-for="t in store.teachers" :key="t.id" class="teacher-item">
          <div class="t-avatar">{{ (t.nick || t.name).slice(0, 1) }}</div>
          <div class="t-info">
            <div class="t-main">{{ store.teacherLabel(t.id) }}</div>
            <div class="t-sub">{{ classCount(t.id) }} 个班级</div>
          </div>
          <n-button size="small" tertiary type="error" @click="askRemoveTeacher(t)">删除</n-button>
        </div>
        <n-empty v-if="!store.teachers.length" description="暂无教师，请先添加" />
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useDialog, useMessage } from 'naive-ui'
import { NButton, NInput, NInputNumber, NSelect, NModal, NEmpty } from 'naive-ui'
import { useStore } from '../stores/store'

const store = useStore()
const dialog = useDialog()
const message = useMessage()

const teacherFilter = ref('')
const teacherMgr = ref(false)
const tName = ref('')
const tNick = ref('')

const teacherOptions = computed(() =>
  store.teachers.map((t) => ({ label: store.teacherLabel(t.id), value: t.id }))
)
const systemOptions = computed(() =>
  store.systems.map((s) => ({ label: `${s.name}（${s.stage}/${s.age}）`, value: s.id }))
)
const syncOptions = computed(() =>
  store.classes.map((c) => ({
    label: `${c.courseLabel}（${c.time} · 已到第${c.ptr}课）`,
    value: c.id
  }))
)

const visibleClasses = computed(() => {
  return teacherFilter.value
    ? store.classes.filter((c) => c.teacherId === teacherFilter.value)
    : store.classes
})

function classCount(id) {
  return store.classes.filter((c) => c.teacherId === id).length
}
function addTeacher() {
  const name = tName.value.trim()
  if (!name) {
    message.warning('请填写教师姓名')
    return
  }
  store.addTeacher(name, tNick.value.trim())
  if (!teacherFilter.value) teacherFilter.value = store.teachers[store.teachers.length - 1].id
  tName.value = ''
  tNick.value = ''
  message.success('已添加教师')
}
function askRemoveTeacher(t) {
  dialog.warning({
    title: '删除教师',
    content: `确定删除教师「${store.teacherLabel(t.id)}」？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      if (teacherFilter.value === t.id) teacherFilter.value = ''
      const ok = store.removeTeacher(t.id)
      if (!ok) message.error('该教师名下仍有班级，请先转移或删除其班级')
    }
  })
}

function sysName(id) {
  return store.sysById(id)?.name || '—'
}
function sysLessons(id) {
  return store.sysById(id)?.lessons || []
}
function teacherShort(id) {
  const t = store.teacherById(id)
  return t ? (t.nick || t.name) : '—'
}
function pct(c) {
  const total = sysLessons(c.sysId).length
  return total ? Math.round((c.ptr / total) * 100) : 0
}
function nextLesson(c) {
  const lessons = sysLessons(c.sysId)
  return lessons[c.ptr] || '已完成'
}
function advance(c) {
  store.advanceClass(c.id)
}
function askDelClass(c) {
  dialog.warning({
    title: '删除班级',
    content: `确定删除班级「${c.courseLabel}」？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => store.removeClass(c.id)
  })
}

const form = ref(null)
const formVisible = ref(false)
const syncFrom = ref('')

const formSystem = computed(() => (form.value && form.value.sysId ? store.sysById(form.value.sysId) : null))
const boundLessons = computed(() => formSystem.value?.lessons || [])
const firstLesson = computed(() => boundLessons.value[0] || '')
const ptrOptions = computed(() => {
  const opts = [{ label: firstLesson.value ? `尚未开始（下节课上 第1课 ${firstLesson.value}）` : '尚未开始', value: 0 }]
  boundLessons.value.forEach((l, i) => opts.push({ label: `已上到 第${i + 1}课 · ${l}`, value: i + 1 }))
  opts.push({ label: '已全部学完本体系', value: boundLessons.value.length })
  return opts
})
const nextHint = computed(() => {
  const lessons = boundLessons.value
  if (form.value == null) return ''
  const p = form.value.ptr
  if (!lessons.length) return ''
  if (p >= lessons.length) return '本体系已全部学完'
  return `下节课将上：第${p + 1}课 · ${lessons[p]}`
})

function onChangeSystem() {
  const s = formSystem.value
  if (!s) return
  form.value.courseLabel = s.name
  form.value.age = s.age
  form.value.ptr = 0
}

function applySync() {
  const src = store.classes.find((c) => c.id === syncFrom.value)
  if (!src) return
  form.value.sysId = src.sysId
  form.value.courseLabel = src.courseLabel
  form.value.age = src.age
  form.value.ptr = src.ptr
}

function openAdd() {
  syncFrom.value = null
  form.value = {
    id: null,
    sysId: store.systems[0]?.id || '',
    courseLabel: '',
    age: '',
    time: '',
    teacherId: store.teachers[0]?.id || '',
    room: '',
    count: 1,
    ptr: 0
  }
  formVisible.value = true
  onChangeSystem()
}
function openEdit(c) {
  form.value = { ...c }
  formVisible.value = true
}
function save() {
  const f = form.value
  if (!f) return
  if (!f.sysId) {
    message.warning('请选择体系')
    return
  }
  const data = {
    sysId: f.sysId,
    courseLabel: f.courseLabel || sysName(f.sysId),
    age: f.age,
    time: f.time,
    teacherId: f.teacherId,
    room: f.room,
    count: f.count,
    ptr: f.ptr
  }
  if (f.id) store.updateClass(f.id, data)
  else store.addClass(data)
  formVisible.value = false
  message.success(f.id ? '已保存' : '已创建')
}
</script>

<style scoped>
.field-ctl {
  width: 140px;
}
.count-badge {
  font-size: 12px;
  font-family: var(--mono);
  font-weight: 700;
  color: var(--ink-2);
  background: #fff;
  border: 2px solid var(--memphis-border);
  padding: 2px 9px;
  border-radius: 0;
  font-variant-numeric: tabular-nums;
  text-transform: uppercase;
}
.ops {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.ptr {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ptr .track {
  flex: 1;
  height: 8px;
  min-width: 90px;
  border: 1.5px solid var(--memphis-border);
  border-radius: 0;
  background: var(--memphis-surface-alt);
  overflow: hidden;
}
.ptr .fill {
  height: 100%;
  border-radius: 0;
  background: repeating-linear-gradient(
    45deg,
    var(--memphis-primary),
    var(--memphis-primary) 6px,
    var(--memphis-secondary) 6px,
    var(--memphis-secondary) 12px
  );
}
.ptr .lbl {
  font-size: 11.5px;
  color: var(--ink-2);
  white-space: nowrap;
  font-family: var(--mono);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.add-teacher-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.add-teacher-row .n-input {
  flex: 1;
}
.add-teacher-row .n-button {
  flex-shrink: 0;
}
.teacher-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 42vh;
  overflow: auto;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.teacher-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 2px solid var(--memphis-border);
  border-radius: 0;
  background: #fff;
}
.t-avatar {
  width: 32px;
  height: 32px;
  border-radius: 0;
  border: 2px solid var(--memphis-border);
  background: var(--memphis-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
}
.t-info {
  flex: 1;
  min-width: 0;
}
.t-main {
  font-weight: 600;
  color: var(--ink);
  font-size: 13.5px;
}
.t-sub {
  font-size: 12px;
  color: var(--muted);
}
.tip {
  font-weight: 400;
  color: var(--muted);
  font-size: 12px;
}
.sync-row {
  background: var(--memphis-secondary);
  border: 2px dashed var(--memphis-border);
  border-radius: 0;
  padding: 10px;
}
.sync {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
}
.sync-sel {
  flex: 1;
}
.hint {
  margin-top: 5px;
  font-size: 12px;
  color: var(--accent);
}
.count-ctl {
  width: 160px;
}
.form-modal {
  width: min(480px, 92vw);
}
.add-teacher-row {
  flex-direction: column;
  align-items: stretch;
}
.ops {
  flex-wrap: wrap;
}
@media (min-width: 560px) {
  .add-teacher-row {
    flex-direction: row;
    align-items: center;
  }
  .add-teacher-row .n-input {
    flex: 1;
  }
}
@media (max-width: 768px) {
  .field-ctl {
    width: 100%;
  }
}
</style>