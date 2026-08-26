<template>
  <n-config-provider
    :theme="theme"
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme-overrides="themeOverrides"
    :inline-theme-disabled="false"
  >
    <n-message-provider>
      <n-dialog-provider>
        <div class="layout">
          <div class="topbar">
            <button class="menu-btn" aria-label="菜单" @click="mobileOpen = !mobileOpen">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h12"/></svg>
            </button>
            <span class="topbar-title">课程进度 · 自动生成系统</span>
          </div>
          <div class="overlay" v-if="mobileOpen" @click="mobileOpen = false"></div>
          <aside class="sidebar" :class="{ open: mobileOpen }">
            <div class="brand">
              <span class="mark">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
              </span>
              <div class="brand-text">
                <div class="brand-name">课程进度</div>
                <div class="brand-sub">AUTO GENERATION</div>
              </div>
            </div>
            <nav class="nav">
              <router-link to="/directory" class="nav-item" @click="mobileOpen = false">
                <span class="idx">01</span><span>课程体系目录</span>
              </router-link>
              <router-link to="/classes" class="nav-item" @click="mobileOpen = false">
                <span class="idx">02</span><span>班级与进度</span>
              </router-link>
              <router-link to="/generate" class="nav-item" @click="mobileOpen = false">
                <span class="idx">03</span><span>进度生成</span>
              </router-link>
              <router-link to="/export" class="nav-item" @click="mobileOpen = false">
                <span class="idx">04</span><span>预览与导出</span>
              </router-link>
            </nav>
            <div class="sidebar-foot">知识底座 · 进度引擎</div>
          </aside>
          <main class="main">
            <router-view :key="$route.path" />
          </main>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { ref } from 'vue'
import { NConfigProvider, NMessageProvider, NDialogProvider, zhCN, dateZhCN } from 'naive-ui'

const mobileOpen = ref(false)

const theme = null
const themeOverrides = {
  common: {
    primaryColor: '#1f7a5c',
    primaryColorHover: '#2f9a74',
    primaryColorPressed: '#1a664e',
    primaryColorSuppl: '#1f7a5c',
    infoColor: '#1f7a5c',
    infoColorHover: '#2f9a74',
    infoColorPressed: '#1a664e',
    successColor: '#2f9a5a',
    warningColor: '#b8791f',
    errorColor: '#cf3e3e',
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, 'Helvetica Neue', Arial, sans-serif"
  }
}
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.82);
  border-right: 1px solid var(--line);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  padding: 22px 14px 18px;
  position: sticky;
  top: 0;
  height: 100vh;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 6px 18px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 16px;
}

.mark {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-name {
  font-weight: 750;
  font-size: 16px;
  color: #1d2b25;
  line-height: 1.25;
}

.brand-sub {
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--muted);
  font-family: var(--mono);
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 11px;
  border-radius: var(--radius-sm);
  color: var(--ink-2);
  font-size: 13.5px;
  transition: all 0.14s;
  position: relative;
}

.nav-item .idx {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
  font-family: var(--mono);
}

.nav-item:hover {
  background: #f2f6f3;
  color: var(--ink);
}

.nav-item.router-link-active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.nav-item.router-link-active .idx {
  color: var(--accent);
  font-weight: 600;
}

.nav-item.router-link-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  bottom: 9px;
  width: 3px;
  border-radius: 2px;
  background: var(--accent);
}

.sidebar-foot {
  margin-top: auto;
  font-size: 11px;
  color: var(--muted);
  padding: 6px;
  border-top: 1px solid var(--line);
  padding-top: 14px;
  letter-spacing: 0.02em;
}

.main {
  flex: 1;
  min-width: 0;
}

/* ---------- 移动端：顶栏 + 抽屉侧栏 ---------- */
.topbar {
  display: none;
}
.overlay {
  display: none;
}

@media (max-width: 768px) {
  .layout {
    display: block;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 10px;
    position: sticky;
    top: 0;
    z-index: 60;
    height: 52px;
    padding: 0 14px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--line);
  }
  .menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    color: var(--ink-2);
    cursor: pointer;
  }
  .menu-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .topbar-title {
    font-size: 15px;
    font-weight: 650;
    color: var(--ink);
  }
  .overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(30, 42, 34, 0.4);
    z-index: 70;
  }
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 78%;
    max-width: 280px;
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
    z-index: 80;
    background: #fff;
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .sidebar-foot {
    display: block;
  }
}
</style>