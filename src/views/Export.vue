<template>
  <div class="page">
    <div class="page-head">
      <h2>预览与导出</h2>
      <span class="sub">按工作台数据生成 Excel，可直接替换原手工表下发</span>
    </div>

    <div class="panel action-bar">
      <div v-if="g.loaded" class="flex gap8 wrap">
        <span class="tag accent">{{ title }}</span>
        <span class="cap">共 {{ g.rows.length }} 行数据 · {{ g.weeks.length }} 个课周</span>
        <span class="spacer"></span>
        <button class="btn primary" @click="doExport">导出 Excel(.xlsx)</button>
        <span class="cap filename">{{ filename }}</span>
      </div>
      <div v-else class="empty">
        尚未生成进度表，请先到「进度生成」选择教师与月份并点击生成。
        <div class="mt16">
          <button class="btn primary" @click="$router.push('/generate')">去生成</button>
        </div>
      </div>
    </div>

    <div class="panel" v-if="g.loaded">
      <div class="panel-title">在线预览 <span class="cap">（所见即所得；人数>=6 的单元格有红底提醒）</span></div>
      <div class="excel">
        <table>
          <colgroup>
            <col v-for="(w, i) in previewCols" :key="i" :style="{ width: w + 'px' }" />
          </colgroup>
          <tr class="title-row">
            <td :colspan="g.weeks.length + 7">{{ title }}</td>
          </tr>
          <tr class="head-row">
            <th>课程名称</th>
            <th>年龄</th>
            <th>上课时间</th>
            <th>教师</th>
            <th>教室</th>
            <th>人数</th>
            <th v-for="(w, i) in g.weeks" :key="w.startMd">第{{ i + 1 }}周 {{ w.startMd }}-{{ w.endMd }}</th>
            <th>下期课程体系</th>
          </tr>
          <tr v-for="row in g.rows" :key="row.classId">
            <td class="course"><b>{{ row.courseLabel }}</b></td>
            <td>{{ row.age }}</td>
            <td>{{ row.time }}</td>
            <td>{{ row.teacher }}</td>
            <td>{{ row.room }}</td>
            <td :class="{ 'over': row.count >= 6 }">{{ row.count }}</td>
            <td class="lesson" v-for="(cell, wi) in row.cells" :key="wi">
              {{ cell.lesson ? cell.date + cell.lesson : cell.date ? '休' : '无课' }}
            </td>
            <td class="next">{{ row.nextSystem }}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { currentGen as g, restoreGen } from '../utils/session'

onMounted(() => {
  restoreGen()
})

const title = computed(() => {
  return g.teacherLabel && g.year ? `${g.teacherLabel}${g.year}年${g.month}月进度` : ''
})

const filename = computed(() => {
  return `${g.teacherLabel || '进度'}${g.year || ''}年${g.month || ''}月进度.xlsx`
})

const previewCols = computed(() => {
  const count = 6 + (g.weeks?.length || 0) + 1
  const arr = []
  for (let i = 0; i < count; i++) {
    if (i === 0) arr.push(110)
    else if (i >= 1 && i <= 4) arr.push(52)
    else if (i === 5) arr.push(48)
    else arr.push(110)
  }
  return arr
})

function colLetter(n) {
  let s = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

const RED_BG = 'FFFF0000'

async function doExport() {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = '课程进度自动生成系统'
  const ws = wb.addWorksheet('进度', { views: [{ state: 'frozen', ySplit: 2 }] })

  const weekCount = (g.weeks || []).length
  const colCount = 6 + weekCount + 1
  const weekStartCol = 7
  const countCol = 6

  // 列宽
  const widths = [16.3, 10.2, 10.2, 8.4, 8.4, 7]
  for (let i = 0; i < weekCount; i++) widths.push(20.2)
  widths.push(14.3)
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  // 第 1 行：合并标题
  ws.mergeCells(1, 1, 1, colCount)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = title.value
  titleCell.font = { name: '等线', size: 14, bold: true }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 28

  // 第 2 行：表头
  const headers = [
    '课程名称',
    '年龄',
    '上课时间',
    '教师',
    '教室',
    '人数',
    ...g.weeks.map((w, i) => `第${i + 1}周${w.startMd}-${w.endMd}`),
    '下期课程体系'
  ]
  headers.forEach((h, i) => {
    const cell = ws.getCell(2, i + 1)
    cell.value = h
    // 表头：统一字号、加粗、无背景色、左对齐
    cell.font = { name: '等线', size: 12, bold: true }
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: i === 0 }
  })
  ws.getRow(2).height = 30

  // 数据行
  const rowCount = g.rows.length
  g.rows.forEach((row, ri) => {
    const excelRow = ri + 3
    const cellsArr = [row.courseLabel, row.age, row.time, row.teacher, row.room, row.count]
    row.cells.forEach((cell) => {
      cellsArr.push(cell.lesson ? `${cell.date}${cell.lesson}` : cell.date ? '休' : '无课')
    })
    cellsArr.push(row.nextSystem)

    cellsArr.forEach((val, ci) => {
      const cell = ws.getCell(excelRow, ci + 1)
      cell.value = val
      const col = ci + 1
      const isWeekCol = col >= weekStartCol && col < colCount
      // 数据单元格：内容左对齐
      const alignment = { horizontal: 'left', vertical: 'middle' }
      if (isWeekCol) {
        cell.font = { name: '宋体', size: 10 }
        cell.alignment = alignment
      } else {
        cell.font = { name: '等线', size: 10 }
        cell.alignment = alignment
      }
      // 人数>6 红底
      if (col === countCol && Number(row.count) >= 6) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_BG } }
        cell.font = { name: '等线', size: 10 }
      }
    })
    ws.getRow(excelRow).height = 20
  })

  // 边框
  for (let r = 1; r <= rowCount + 2; r++) {
    ws.getRow(r).eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB0B7C0' } },
        left: { style: 'thin', color: { argb: 'FFB0B7C0' } },
        bottom: { style: 'thin', color: { argb: 'FFB0B7C0' } },
        right: { style: 'thin', color: { argb: 'FFB0B7C0' } }
      }
    })
  }

  const blob = await wb.xlsx.writeBuffer()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  a.download = filename.value
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)

  if (g.writeBackPtr) {
    const { useStore } = await import('../stores/store')
    trackPointerWriteback(useStore())
  }
  alert('已导出：' + filename.value)
}

function trackPointerWriteback(st) {
  for (const row of g.rows) {
    const cls = st.classes.find((c) => c.id === row.classId)
    if (!cls) continue
    const sys = st.sysById(cls.sysId)
    if (!sys) continue
    let maxIdx = -1
    for (const cell of row.cells) {
      if (!cell.lesson) continue
      const idx = sys.lessons.indexOf(cell.lesson)
      if (idx > maxIdx) maxIdx = idx
    }
    if (maxIdx >= 0) {
      st.updateClass(cls.id, { ptr: Math.min(maxIdx + 1, sys.lessons.length) })
    }
  }
}
</script>

<style scoped>
.cap {
  font-size: 12px;
  color: #708099;
}

.filename {
  color: var(--accent);
  font-weight: 600;
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.excel {
  border: 1px solid #c9d6d3;
  border-radius: 8px;
  overflow: auto;
}

.excel table {
  border-collapse: collapse;
  width: 100%;
  min-width: 1080px;
  font-size: 12px;
}

.excel th,
.excel td {
  border: 1px solid #d9e4e1;
  padding: 7px 8px;
  text-align: left;
  white-space: nowrap;
}

.excel .title-row td {
  font-weight: 700;
  font-size: 14px;
  text-align: center;
  padding: 12px;
}

.excel .head-row th {
  font-weight: 700;
  font-size: 12px;
}

.excel .lesson {
  font-family: 'PingFang SC', '宋体', serif;
}

.excel .next {
  color: var(--accent);
  font-weight: 600;
}

.excel td.over {
  background: #ff0000;
}
</style>