import { fmtMD } from './date'

// 根据班级上课时间在周内选具体日期（周内 days 索引 0=周二）
function pickDate(week, time) {
  if (!week || !week.days || !time) return null
  const m = time.match(/([一二三四五六日])/)
  if (!m) return null
  const dayMap = { '日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 }
  const dow = dayMap[m[1]]
  if (dow === 1) return null // 周一休息
  const day = week.days[(dow - 2 + 7) % 7]
  return day || null
}

/**
 * 自当前体系指针处向后取 count 个课次；体系内耗尽后自动延续到"下一衔接体系"。
 * 当前体系结业判断：count 个课次中已越出当前体系 → done。
 * @param {object} system 当前体系
 * @param {number} ptr 下次该上的课次序号（0 起）
 * @param {function} getSys 通过体系 id 取体系（用于走衔接链）
 * @param {number} count 需要填的周数
 * @returns {{lessons: string[], done: boolean}}
 */
export function takeLessons(system, ptr, getSys, count) {
  if (!system || !system.lessons || !system.lessons.length) return { lessons: [], done: false }

  // 沿下一衔接体系展开课次链（当前体系从 ptr 起，后续体系从头）
  const chain = []
  const seen = new Set()
  let s = system
  while (s && !seen.has(s.id)) {
    seen.add(s.id)
    chain.push(s)
    s = s.nextId ? getSys(s.nextId) : null
  }

  const flat = []
  for (let ci = 0; ci < chain.length; ci++) {
    const start = ci === 0 ? Math.min(ptr, chain[ci].lessons.length) : 0
    flat.push(...chain[ci].lessons.slice(start))
  }

  const currentLen = chain[0].lessons.length
  const lessons = flat.slice(0, count)
  const done = (ptr || 0) + count > currentLen

  return { lessons, done }
}

// 统一为 "年-月-日" 键，用于判定某天是否休息
function keyOf(d) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`
}

/**
 * 构建一行进度表可编辑结构。
 * @param {object} cls 班级
 * @param {object} system 体系
 * @param {Array} weeks 课周数组
 * @param {function} getSys 通过体系 id 取体系（用于走衔接链）
 * @param {object} opts
 * @param {Array<string|Date|number>} [opts.holidays] 本月休息/停课日期，选中该天的班级当周休课，课程向后顺延
 */
export function buildRow(cls, system, weeks, getSys, opts = {}) {
  const holidayKeys = new Set((opts.holidays || []).map((h) => keyOf(h)))

  // 先逐个判定每周是否休息（该班实际上课那天落在休息日 → 该周休课）
  const planned = weeks.map((w, i) => {
    const date = pickDate(w, cls.time)
    const off = date ? holidayKeys.has(keyOf(date)) : false
    return { i, date, label: date ? fmtMD(date) : '', off }
  })

  // 仅在"非休息周"安排课次，休息周会让后序课程整体顺延一周
  const onWeeks = planned.filter((p) => !p.off)
  const { lessons, done } = takeLessons(system, cls.ptr || 0, getSys, onWeeks.length)

  const nextSystem = system.nextId ? getSys(system.nextId) : null
  let lessonIdx = 0
  const cells = planned.map((p) => ({
    id: `${cls.id}-w${p.i}`,
    week: p.i,
    date: p.date,
    label: p.label,
    lesson: p.off ? '' : (lessons[lessonIdx++] || ''),
    rest: p.off
  }))
  return {
    classId: cls.id,
    cls,
    system,
    cells,
    nextSystem,
    done
  }
}