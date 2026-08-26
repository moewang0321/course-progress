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

/**
 * 构建一行进度表可编辑结构。
 * @param {object} cls 班级
 * @param {object} system 体系
 * @param {Array} weeks 课周数组
 * @param {function} getSys 通过体系 id 取体系（用于走衔接链）
 */
export function buildRow(cls, system, weeks, getSys) {
  const { lessons, done } = takeLessons(system, cls.ptr || 0, getSys, weeks.length)
  const nextSystem = system.nextId ? getSys(system.nextId) : null
  const cells = weeks.map((w, i) => {
    const date = pickDate(w, cls.time)
    return {
      id: `${cls.id}-w${i}`,
      week: i,
      date,
      label: date ? fmtMD(date) : '',
      lesson: lessons[i] || ''
    }
  })
  return {
    classId: cls.id,
    cls,
    system,
    cells,
    nextSystem,
    done
  }
}