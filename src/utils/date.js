export function fmtMD(date) {
  return `${date.getMonth() + 1}.${date.getDate()}`
}

// 某月第一天
function firstDay(year, month) {
  return new Date(year, month - 1, 1)
}

// 某月最后一天
function lastDay(year, month) {
  return new Date(year, month, 0)
}

// 返回包含某天的"周二~周日"课周的起始周二。
// 若当天为周一（休息日），则归属下一个课周（即其后的周二）。
function tuesdayOfTeachingWeek(date) {
  const dow = date.getDay()
  if (dow === 1) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  }
  const daysSinceTue = (dow - 2 + 7) % 7
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceTue)
}

/**
 * 计算某月的课周（周二~周日为一周，周一休息）。
 * 第一周 = 包含当月 1 号的课周（若 1 号落在上一周，则从上一周起算）；
 * 后续顺延，直到某一周的起始周二已越过当月最后一天为止（全在下月的周不加入）。
 * @param {number} year
 * @param {number} month 1-12
 * @returns {Array<{id:string,label:string,start:Date,end:Date,startMd:string,endMd:string,days:Date[]}>}
 */
export function monthWeeks(year, month) {
  const first = firstDay(year, month)
  const last = lastDay(year, month)
  const weeks = []
  let cursor = tuesdayOfTeachingWeek(first)

  while (cursor <= last) {
    const weekStart = new Date(cursor)
    const weekEnd = new Date(cursor)
    weekEnd.setDate(weekEnd.getDate() + 5) // 周二+5 = 周日

    const days = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(cursor)
      d.setDate(d.getDate() + i)
      days.push(d)
    }

    weeks.push({
      id: `w${weeks.length + 1}`,
      label: `第${weeks.length + 1}周`,
      start: new Date(weekStart),
      end: new Date(weekEnd),
      startMd: fmtMD(weekStart),
      endMd: fmtMD(weekEnd),
      days
    })
    cursor.setDate(cursor.getDate() + 7)
    // 防死循环兜底
    if (weeks.length > 7) break
  }
  return weeks
}