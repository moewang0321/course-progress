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
          <select v-model="teacherFilter">
            <option value="">全部教师</option>
            <option v-for="t in store.teachers" :key="t.id" :value="t.id">
              {{ store.teacherLabel(t.id) }}
            </option>
          </select>
        </span>
        <span class="cap">{{ visibleClasses.length }} 个班级</span>
        <span class="spacer"></span>
        <button class="btn primary sm" @click="openAdd">新增班级</button>
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
              <th style="width: 160px">操作</th>
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
                <button class="btn sm" title="推进1课" @click="advance(c)">推进 1 课</button>
                <button class="btn sm ghost" @click="openEdit(c)">编辑</button>
                <button class="btn sm danger" @click="del(c)">删除</button>
              </td>
            </tr>
            <tr v-if="!visibleClasses.length">
              <td colspan="10" class="empty">暂无班级，请新增或切换教师</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 编辑/新增弹窗 -->
    <div class="modal-mask" v-if="form" @click.self="form = null">
      <div class="modal">
        <div class="modal-title">{{ form.id ? '编辑班级' : '新增班级' }}</div>
        <div v-if="!form.id" class="form-row sync-row">
          <label>同步参照班级 <span class="tip">（选择后一键复制其课程与进度）</span></label>
          <div class="sync">
            <select v-model="syncFrom">
              <option value="">— 不同步，手动填写 —</option>
              <option v-for="c in store.classes" :key="c.id" :value="c.id">
                {{ c.courseLabel }}（{{ c.time }} · 已到第{{ c.ptr }}课）
              </option>
            </select>
            <button class="btn sm" :disabled="!syncFrom" @click="applySync">应用该班课程与进度</button>
          </div>
        </div>
        <div class="form-row">
          <label>绑定体系 <span class="tip">（选择后自动带出课程名称与年龄）</span></label>
          <select v-model="form.sysId" @change="onChangeSystem">
            <option v-for="s in store.systems" :key="s.id" :value="s.id">
              {{ s.name }}（{{ s.stage }}/{{ s.age }}）
            </option>
          </select>
        </div>
        <div class="form-row">
          <label>课程名称</label>
          <input type="text" v-model="form.courseLabel" placeholder="如：机械构造一上" />
        </div>
        <div class="form-row">
          <label>年龄</label>
          <input type="text" v-model="form.age" placeholder="如：六岁" />
        </div>
        <div class="form-row">
          <label>上课时间（如 二17:00 / 周六10:00）</label>
          <input type="text" v-model="form.time" placeholder="如：二17:00" />
        </div>
        <div class="form-row">
          <label>教师</label>
          <select v-model="form.teacherId">
            <option v-for="t in store.teachers" :key="t.id" :value="t.id">
              {{ store.teacherLabel(t.id) }}
            </option>
          </select>
        </div>
        <div class="form-row">
          <label>教室</label>
          <input type="text" v-model="form.room" placeholder="如：15号" />
        </div>
        <div class="form-row">
          <label>人数</label>
          <input type="number" v-model.number="form.count" min="0" />
        </div>
        <div class="form-row">
          <label>当前进度（选择已上到的课程）</label>
          <select v-model.number="form.ptr">
            <option :value="0">尚未开始（下节课上 第1课 {{ firstLesson || '—' }}）</option>
            <option v-for="(l, i) in boundLessons" :key="i" :value="i + 1">
              已上到 第{{ i + 1 }}课 · {{ l }}
            </option>
            <option :value="boundLessons.length">已全部学完本体系</option>
          </select>
          <div class="hint">{{ nextHint }}</div>
        </div>
        <div class="form-actions">
          <button class="btn" @click="form = null">取消</button>
          <button class="btn primary" @click="save">{{ form.id ? '保存' : '创建' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStore } from '../stores/store'

const store = useStore()
const teacherFilter = ref('')

const visibleClasses = computed(() => {
  return teacherFilter.value
    ? store.classes.filter((c) => c.teacherId === teacherFilter.value)
    : store.classes
})

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

const form = ref(null)
const syncFrom = ref('')

const formSystem = computed(() => (form.value && form.value.sysId ? store.sysById(form.value.sysId) : null))
const boundLessons = computed(() => formSystem.value?.lessons || [])
const firstLesson = computed(() => boundLessons.value[0] || '')
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
  syncFrom.value = ''
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
  onChangeSystem()
}
function openEdit(c) {
  form.value = { ...c }
}
function save() {
  const f = form.value
  if (!f.sysId) {
    alert('请选择体系')
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
  form.value = null
}
function del(c) {
  if (confirm(`确定删除班级「${c.courseLabel}」？`)) store.removeClass(c.id)
}
</script>

<style scoped>
.tip {
  font-weight: 400;
  color: #708099;
  font-size: 12px;
}
.sync-row {
  background: var(--accent-soft, #eef5f4);
  border: 1px dashed var(--accent, #4a8f8a);
  border-radius: 6px;
  padding: 10px;
}
.sync {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
}
.sync select {
  flex: 1;
}
.hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--accent);
}
</style>