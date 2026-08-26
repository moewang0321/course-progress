import { reactive } from 'vue'

/**
 * 生成工作台与预览/导出页之间共享的"当前生成上下文"。
 * 跨页面用 localStorage 保留，避免刷新丢失。
 */
const KEY = 'cp_current_gen_v1'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null
  } catch {
    return null
  }
}

export const currentGen = reactive({
  teacherId: null,
  year: null,
  month: null,
  weeks: [], // [{label,startMd,endMd}]
  rows: [], // [{classId, courseLabel, age, time, teacherLabel, room, count, cells:[{label,lesson}], nextSystem, done}]
  teacherNick: '',
  loaded: false
})

export function saveGen(payload) {
  Object.assign(currentGen, payload, { loaded: true })
  localStorage.setItem(KEY, JSON.stringify(payload))
}

export function restoreGen() {
  const data = read()
  if (data && data.rows) {
    Object.assign(currentGen, data, { loaded: true })
  }
  return data
}