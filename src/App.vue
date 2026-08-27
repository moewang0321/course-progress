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
    primaryColor: '#FF6B35',
    primaryColorHover: '#E55A2B',
    primaryColorPressed: '#004E89',
    primaryColorSuppl: '#FF6B35',
    infoColor: '#FF6B35',
    infoColorHover: '#E55A2B',
    infoColorPressed: '#004E89',
    successColor: '#1B9AAA',
    warningColor: '#FFD23F',
    errorColor: '#E55A2B',
    borderColor: '#1B1B1B',
    borderRadius: '0px',
    borderRadiusSmall: '0px',
    fontSize: '13px',
    fontWeight: '600',
    textColorBase: '#1B1B1B',
    textColor1: '#1B1B1B',
    textColor2: '#4A4A4A',
    textColor3: '#9A9A9A',
    fontFamily: "'Poppins', 'Noto Sans SC', sans-serif"
  },
  Button: {
    borderRadiusMedium: '0px',
    borderRadiusLarge: '0px',
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  Card: {
    borderRadius: '0px',
    borderColor: '#1B1B1B'
  },
  Modal: {
    borderRadius: '0px'
  },
  Input: {
    borderRadius: '0px'
  },
  Select: {
    borderRadius: '0px'
  },
  Dialog: {
    borderRadius: '0px'
  },
  Tag: {
    borderRadius: '0px'
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
  background: var(--memphis-text);
  border-right: 2px solid var(--memphis-accent);
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
  border-bottom: 2px solid rgba(255, 255, 255, 0.22);
  margin-bottom: 16px;
}

.mark {
  width: 38px;
  height: 38px;
  border-radius: 0;
  border: 2px solid var(--memphis-border);
  background: var(--memphis-secondary);
  color: var(--memphis-text);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-name {
  font-weight: 800;
  font-size: 16px;
  color: var(--memphis-secondary);
  line-height: 1.25;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.brand-sub {
  font-size: 10px;
  letter-spacing: 0.18em;
  color: var(--memphis-primary);
  font-family: var(--mono);
  font-weight: 700;
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
  border-radius: 0;
  border-left: 4px solid transparent;
  color: #AAA;
  font-size: 13.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.14s;
  position: relative;
}

.nav-item .idx {
  font-size: 10px;
  color: #777;
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
  font-family: var(--mono);
}

.nav-item:hover {
  background: #2A2A2A;
  color: var(--memphis-secondary);
}

.nav-item.router-link-active {
  background: var(--memphis-secondary);
  color: var(--memphis-text);
  border-left-color: var(--memphis-primary);
  font-weight: 700;
}

.nav-item.router-link-active .idx {
  color: var(--memphis-primary);
  font-weight: 700;
}

.sidebar-foot {
  margin-top: auto;
  font-size: 11px;
  color: #666;
  padding: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.22);
  padding-top: 14px;
  letter-spacing: 0.02em;
  font-family: var(--mono);
  text-transform: uppercase;
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
    background: var(--memphis-text);
    border-bottom: 2px solid var(--memphis-accent);
  }
  .menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 2px solid var(--memphis-border);
    border-radius: 0;
    background: var(--memphis-secondary);
    color: var(--memphis-text);
    cursor: pointer;
  }
  .menu-btn:hover {
    color: var(--memphis-text);
    border-color: var(--memphis-border);
    background: var(--memphis-primary);
  }
  .topbar-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--memphis-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(27, 27, 27, 0.4);
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
    background: var(--memphis-text);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .sidebar-foot {
    display: block;
  }
}
</style>