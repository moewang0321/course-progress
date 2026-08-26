import { defineStore } from 'pinia'
import rawCatalog from '../data/catalog.json'

const LS_CATALOG = 'cp_catalog_v1'
const LS_CLASSES = 'cp_classes_v1'
const LS_TEACHERS = 'cp_teachers_v1'
const LS_DRAFTS = 'cp_drafts_v1'
const LS_META = 'cp_meta_v1'

function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

function clone(o) {
  return JSON.parse(JSON.stringify(o))
}

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch (e) {
    return fallback
  }
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

// 系统名 + 学段 + 分组 唯一标识，用于跨会话对账
function sysKey(s) {
  return `${s.stage}::${s.category}::${s.name}`
}

export const useStore = defineStore('main', {
  state: () => {
    const systems = buildCatalog()
    return {
      systems,
      teachers: load(LS_TEACHERS, [{ id: 't-micro', name: '庞微', nick: '微微' }]),
      classes: load(LS_CLASSES, [
        {
          id: 'c1',
          sysId: systems.find((s) => sysKey(s) === '学龄::六岁::机械构造一上')?.id || null,
          courseLabel: '机械构造一上',
          age: '六岁',
          time: '二17:00',
          teacherId: 't-micro',
          room: '15号',
          count: 5,
          ptr: 6
        },
        {
          id: 'c2',
          sysId: systems.find((s) => sysKey(s) === '学前::4-5岁::百变梦工厂')?.id || null,
          courseLabel: '百变梦工厂',
          age: '四岁',
          time: '三10:00',
          teacherId: 't-micro',
          room: '13号',
          count: 1,
          ptr: 9
        },
        {
          id: 'c3',
          sysId: systems.find((s) => sysKey(s) === '学龄::六岁::初级机器人上')?.id || null,
          courseLabel: '初级机器人上',
          age: '六岁',
          time: '三17:00',
          teacherId: 't-micro',
          room: '15号',
          count: 5,
          ptr: 1
        },
        {
          id: 'c4',
          sysId: systems.find((s) => sysKey(s) === '学前::4-5岁::梦想建筑师下')?.id || null,
          courseLabel: '梦想建筑师下',
          age: '四岁九',
          time: '四17:00',
          teacherId: 't-micro',
          room: '4号',
          count: 5,
          ptr: 2
        }
      ]),
      drafts: load(LS_DRAFTS, {}),
      meta: load(LS_META, {})
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
      localStorage.setItem(LS_TEACHERS, JSON.stringify(this.teachers))
      localStorage.setItem(LS_CLASSES, JSON.stringify(this.classes))
      localStorage.setItem(LS_DRAFTS, JSON.stringify(this.drafts))
      localStorage.setItem(LS_META, JSON.stringify(this.meta))
      // 目录：只持久化用户改动（新增课次、衔接覆盖）
      localStorage.setItem(LS_CATALOG, JSON.stringify(this.systems))
      // 项目内持久化（重启后加载），失败不影响本地
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
      if (snapshot && Array.isArray(snapshot.systems)) this.systems = snapshot.systems
      if (snapshot && Array.isArray(snapshot.teachers)) this.teachers = snapshot.teachers
      if (snapshot && Array.isArray(snapshot.classes)) this.classes = snapshot.classes
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