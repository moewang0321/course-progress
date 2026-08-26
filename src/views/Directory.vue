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
          <select v-model="filter.stage">
            <option value="">全部</option>
            <option v-for="s in stages" :key="s" :value="s">{{ s }}</option>
          </select>
        </span>
        <span class="field">
          <label>年龄</label>
          <select v-model="filter.age">
            <option value="">全部</option>
            <option v-for="a in ages" :key="a" :value="a">{{ a }}</option>
          </select>
        </span>
        <span class="field">
          <label>关键字</label>
          <input type="text" v-model="filter.kw" placeholder="体系名 / 课次" />
        </span>
        <span class="cap">{{ filtered.length }} 个体系</span>
        <span class="spacer"></span>
        <button class="btn sm" @click="showAddSystem">新增体系</button>
      </div>

      <div class="table-wrap">
        <table class="grid">
          <thead>
            <tr>
              <th>学段</th>
              <th>年龄</th>
              <th>体系</th>
              <th>课次数</th>
              <th>下一衔接</th>
              <th style="width: 210px">操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="s in filtered" :key="s.id">
              <tr :class="{ 'is-open': expanded === s.id }" @click="toggle(s)">
                <td><span class="tag">{{ s.stage }}</span></td>
                <td>{{ s.age }}</td>
                <td class="sys-name">
                  <span class="caret">{{ expanded === s.id ? '▾' : '▸' }}</span><b>{{ s.name }}</b>
                </td>
                <td>{{ s.lessons.length }} 课</td>
                <td>
                  <span class="tag accent">{{ nextName(s) }}</span>
                </td>
                <td class="ops" @click.stop>
                  <button class="btn sm" @click="toggle(s)">{{ expanded === s.id ? '收起' : '查看课次' }}</button>
                  <button class="btn sm ghost" @click="openEdit(s)">编辑</button>
                </td>
              </tr>
              <tr v-if="expanded === s.id" class="expand-row">
                <td colspan="6">
                  <div class="expand-head">
                    <span class="expand-title">{{ s.name }} · 课次清单</span>
                    <span class="spacer"></span>
                    <button class="btn sm ghost" @click="toggle(s)">收起</button>
                  </div>
                  <div class="lesson-grid">
                    <div
                      v-for="(l, i) in s.lessons"
                      :key="i"
                      class="lesson-cell"
                    >
                      <div class="lc-no">第{{ i + 1 }}课</div>
                      <div class="lc-name">{{ l }}</div>
                      <button class="lc-del" title="删除课次" @click="delLesson(s, i)">✕</button>
                    </div>
                  </div>
                  <div class="mt16 flex gap8 wrap">
                    <input type="text" v-model="newLesson" placeholder="新增课次，如：滑翔机" @keyup.enter="addLessonTo(s)" />
                    <button class="btn sm" @click="addLessonTo(s)">添加课次</button>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-if="!filtered.length">
              <td colspan="6" class="empty">未找到匹配的体系</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 编辑体系 -->
    <div class="modal-mask" v-if="editing" @click.self="editing = null">
      <div class="modal">
        <div class="modal-title">编辑体系：{{ editing.name }}</div>
        <div class="form-row">
          <label>学段</label>
          <select v-model="editing.stage">
            <option v-for="s in stages" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="form-row">
          <label>年龄段</label>
          <input type="text" v-model="editing.age" placeholder="如 3-4岁 / 一二" />
        </div>
        <div class="form-row">
          <label>体系名称</label>
          <input type="text" v-model="editing.name" />
        </div>
        <div class="form-row">
          <label>下一衔接体系（留空=自动按同组相邻）</label>
          <select v-model="editing.nextId">
            <option :value="null">（自动推算）</option>
            <option v-for="s in systems" :key="s.id" :value="s.id" :disabled="s.id === editing.id">
              {{ s.name }}（{{ s.stage }}/{{ s.age }}）
            </option>
          </select>
        </div>
        <div class="form-actions">
          <button class="btn" @click="editing = null">取消</button>
          <button class="btn primary" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>

    <!-- 新增体系 -->
    <div class="modal-mask" v-if="adding" @click.self="adding = null">
      <div class="modal">
        <div class="modal-title">新增体系</div>
        <div class="form-row">
          <label>学段</label>
          <select v-model="newSys.stage">
            <option v-for="s in stages" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="form-row">
          <label>年龄段</label>
          <input type="text" v-model="newSys.age" placeholder="如 3-4岁 / 一二" />
        </div>
        <div class="form-row">
          <label>体系名称</label>
          <input type="text" v-model="newSys.name" />
        </div>
        <div class="form-row">
          <label>课次（每行一个）</label>
          <textarea v-model="newSys.lessonText" rows="5" placeholder="每个课次名一行"></textarea>
        </div>
        <div class="form-actions">
          <button class="btn" @click="adding = null">取消</button>
          <button class="btn primary" @click="createSystem">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useStore } from '../stores/store'

const store = useStore()

const stages = computed(() => {
  const list = store.systems.map((s) => s.stage)
  return [...new Set(list)].sort((a, b) => (a === '学前' ? -1 : 1))
})

const filter = reactive({ stage: '', age: '', kw: '' })
const expanded = ref(null)
const newLesson = ref('')
const editing = ref(null)
const adding = ref(false)
const newSys = reactive({ stage: '学前', age: '', name: '', lessonText: '' })

const ages = computed(() => {
  let list = store.systems.map((s) => s.age)
  list = [...new Set(list)]
  return list.sort((a, b) => a.localeCompare(b, 'zh'))
})

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

function nextName(s) {
  const n = store.nextSystem(s.id)
  return n ? n.name : '—'
}

function toggle(s) {
  expanded.value = expanded.value === s.id ? null : s.id
}

function delLesson(s, i) {
  store.removeLesson(s.id, i)
}
function addLessonTo(s) {
  const v = newLesson.value.trim()
  if (!v) return
  store.addLesson(s.id, v)
  newLesson.value = ''
}

function openEdit(s) {
  editing.value = {
    id: s.id,
    stage: s.stage,
    age: s.age,
    name: s.name,
    nextId: s.nextId
  }
}
function saveEdit() {
  const e = editing.value
  const s = store.sysById(e.id)
  Object.assign(s, { stage: e.stage, age: e.age, name: e.name, nextId: e.nextId })
  store.persist()
  editing.value = null
}

function showAddSystem() {
  Object.assign(newSys, { stage: '学前', age: '', name: '', lessonText: '' })
  adding.value = true
}
function createSystem() {
  const name = newSys.name.trim()
  const age = newSys.age.trim()
  if (!name || !age) {
    alert('请填写体系名称与年龄段')
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
    name,
    lessons,
    nextId: null
  })
  store.persist()
  adding.value = false
}
</script>

<style scoped>
.grid tbody tr {
  cursor: pointer;
}
.grid tbody tr.is-open {
  background: var(--accent-soft);
}
.sys-name .caret {
  display: inline-block;
  width: 12px;
  color: var(--muted);
  margin-right: 2px;
}
.ops button + button {
  margin-left: 6px;
}
.expand-row > td {
  background: #f8faf9;
  padding: 16px 18px 18px;
}
.expand-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--line);
  padding-bottom: 10px;
}
.expand-title {
  font-weight: 600;
  color: var(--ink);
}
.lesson-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}
.lesson-cell {
  border: 1px solid var(--line-2);
  border-radius: var(--radius);
  padding: 8px 6px;
  text-align: center;
  font-size: 12px;
  position: relative;
  min-height: 46px;
  background: #fff;
}
.lc-no {
  font-size: 10px;
  color: var(--muted);
}
.lc-name {
  margin-top: 2px;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.35;
}
.lc-del {
  position: absolute;
  top: 3px;
  right: 4px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 10px;
  padding: 2px;
}
.lc-del:hover {
  color: var(--danger);
}
</style>