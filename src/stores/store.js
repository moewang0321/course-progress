import { defineStore } from 'pinia'
import rawCatalog from '../data/catalog.json'

function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

// 数据归一化：兜底线上历史/脏数据，保证字段结构稳定，避免生成与组件崩坏
function toLessonArray(v) {
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string' && x.trim())
  if (v && typeof v === 'object') return Object.values(v).filter((x) => typeof x === 'string' && x.trim())
  return []
}
function normalizeSystems(sys) {
  return sys.map((s) => ({
    id: s.id,
    stage: s.stage || '',
    category: s.category || s.age || '',
    age: s.age || '',
    name: s.name || '',
    lessons: toLessonArray(s.lessons),
    nextId: s.nextId != null ? s.nextId : null
  }))
}
function normalizeClasses(cls) {
  return cls.map((c) => ({
    id: c.id,
    sysId: c.sysId,
    courseLabel: c.courseLabel || '',
    age: c.age || '',
    time: c.time || '',
    teacherId: c.teacherId,
    room: c.room || '',
    count: Number(c.count) || 1,
    ptr: Number(c.ptr) || 0
  }))
}

// 明确由机构提供的"体系年龄"（其余体系回退显示其分组的标签）
const PROSE_AGE = {
  快乐家园: '三岁',
  管道工程: '三岁三',
  自然奥秘: '三岁六',
  运动与探索: '三岁九',
  百变梦工厂: '四岁',
  城市之旅: '四岁三',
  梦想建筑师上: '四岁六',
  梦想建筑师下: '四岁九',
  机械达人上: '五岁',
  机械达人下: '五岁三',
  思维与研究上: '五岁六',
  思维与研究下: '五岁九',
  疯狂设计师上: '六岁',
  疯狂设计师下: '六岁',
  世界之旅: '六岁',
  探索世界: '六岁'
}

// 将嵌套 JSON 拍平为系统列表
function buildCatalog() {
  const systems = []
  for (const stage of rawCatalog['课程体系']) {
    const stageLabel = stage['阶段']
    const categories = stage['分类列表'] || []
    for (const cat of categories) {
      const category = cat['分类']
      const lists = cat['体系列表'] || []
      for (const s of lists) {
        systems.push({
          id: uid(),
          stage: stageLabel,
          category,
          age: s['年龄'] || PROSE_AGE[s['名称']] || category, // 展示用年龄
          name: s['名称'],
          lessons: (s['课程'] || []).slice(),
          nextId: null
        })
      }
    }
  }
  // 自动衔接：按目录顺序串联 —— 组内相连接；分组末位衔接下一个分组（跨组）
  const stageCats = new Map() // stage -> [{name, systems:[...]}]（按目录出现顺序）
  for (const sys of systems) {
    if (!stageCats.has(sys.stage)) stageCats.set(sys.stage, [])
    const cats = stageCats.get(sys.stage)
    let cat = cats.find((c) => c.name === sys.category)
    if (!cat) {
      cat = { name: sys.category, systems: [] }
      cats.push(cat)
    }
    cat.systems.push(sys)
  }
  for (const cats of stageCats.values()) {
    for (let i = 0; i < cats.length; i++) {
      const list = cats[i].systems
      for (let j = 0; j < list.length; j++) {
        const cur = list[j]
        if (j < list.length - 1) cur.nextId = list[j + 1].id
        else if (i < cats.length - 1) cur.nextId = cats[i + 1].systems[0].id
        else cur.nextId = null // 阶段末位，不跨阶段
      }
    }
  }
  return systems
}

export const useStore = defineStore('main', {
  state: () => {
    const systems = buildCatalog()
    return {
      systems,
      teachers: [],
      classes: [],
      drafts: {},
      meta: {}
    }
  },

  getters: {
    sysById: (s) => (id) => s.systems.find((x) => x.id === id),
    teacherById: (s) => (id) => s.teachers.find((t) => t.id === id),
    teacherLabel: (s) => (id) => {
      const t = s.teachers.find((x) => x.id === id)
      return t ? (t.nick ? `${t.nick}（${t.name}）` : t.name) : ''
    },

    systemsByGroup: (s) => (stage, age) => s.systems.filter((x) => x.stage === stage && x.age === age),

    nextSystem: (s) => (sysId) => {
      const cur = s.systems.find((x) => x.id === sysId)
      if (!cur) return null
      if (cur.nextId) return s.systems.find((x) => x.id === cur.nextId) || null
      return null
    },

    classesByTeacher: (s) => (teacherId) => s.classes.filter((c) => c.teacherId === teacherId)
  },

  actions: {
    persist() {
      // 数据统一经 /api/state 存入 MongoDB（云端）。失败不影响当前会话。
      try {
        fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.snapshot())
        }).catch(() => {})
      } catch (e) {}
    },

    snapshot() {
      return {
        systems: this.systems,
        teachers: this.teachers,
        classes: this.classes,
        drafts: this.drafts,
        meta: this.meta
      }
    },

    hydrate(snapshot) {
      if (snapshot && Array.isArray(snapshot.systems)) this.systems = normalizeSystems(snapshot.systems)
      if (snapshot && Array.isArray(snapshot.teachers)) this.teachers = snapshot.teachers
      if (snapshot && Array.isArray(snapshot.classes)) this.classes = normalizeClasses(snapshot.classes)
      if (snapshot && snapshot.drafts) this.drafts = snapshot.drafts
      if (snapshot && snapshot.meta) this.meta = snapshot.meta
    },

    async restoreRemote() {
      try {
        const res = await fetch('/api/state')
        if (res.ok) {
          const s = await res.json()
          if (s && Array.isArray(s.systems)) this.hydrate(s)
        }
      } catch (e) {}
    },

    // ---- 目录管理 ----
    addLesson(sysId, name) {
      const s = this.sysById(sysId)
      if (!s || !name) return
      if (s.lessons.includes(name)) return
      s.lessons.push(name)
      this.persist()
    },
    removeLesson(sysId, idx) {
      const s = this.sysById(sysId)
      if (!s) return
      if (s.lessons.length <= 1) return
      s.lessons.splice(idx, 1)
      this.persist()
    },
    setNext(sysId, nextId) {
      const s = this.sysById(sysId)
      if (!s) return
      s.nextId = nextId || null
      this.persist()
    },

    // ---- 教师 ----
    addTeacher(name, nick) {
      this.teachers.push({ id: uid(), name, nick })
      this.persist()
    },
    removeTeacher(id) {
      const has = this.classes.some((c) => c.teacherId === id)
      if (has) return false
      this.teachers = this.teachers.filter((t) => t.id !== id)
      this.persist()
      return true
    },

    // ---- 班级 ----
    addClass(cls) {
      this.classes.push({
        id: uid(),
        sysId: cls.sysId,
        courseLabel: cls.courseLabel || '',
        age: cls.age || '',
        time: cls.time || '',
        teacherId: cls.teacherId,
        room: cls.room || '',
        count: Number(cls.count) || 1,
        ptr: cls.ptr || 0
      })
      this.persist()
    },
    updateClass(id, patch) {
      const c = this.classes.find((x) => x.id === id)
      if (!c) return
      Object.assign(c, patch)
      this.persist()
    },
    removeClass(id) {
      this.classes = this.classes.filter((c) => c.id !== id)
      this.persist()
    },
    advanceClass(id, step = 1) {
      const c = this.classes.find((x) => x.id === id)
      if (!c) return
      const s = this.sysById(c.sysId)
      const total = s ? s.lessons.length : 0
      c.ptr = Math.min(c.ptr + step, total)
      this.persist()
    }
  }
})