import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useStore } from './stores/store'
import './assets/style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.mount('#app')

// 启动时从项目内 data/state.json 加载已保存数据
useStore(pinia).restoreRemote()