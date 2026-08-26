import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/directory' },
  { path: '/directory', component: () => import('../views/Directory.vue'), meta: { title: '课程体系目录' } },
  { path: '/classes', component: () => import('../views/Classes.vue'), meta: { title: '班级与进度' } },
  { path: '/generate', component: () => import('../views/Generate.vue'), meta: { title: '月度进度工作台' } },
  { path: '/export', component: () => import('../views/Export.vue'), meta: { title: '预览与导出' } }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})