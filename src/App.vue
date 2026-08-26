<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <span class="mark">进</span>
        <div class="brand-text">
          <div class="brand-name">课程进度</div>
          <div class="brand-sub">自动生成系统</div>
        </div>
      </div>
      <nav class="nav">
        <router-link to="/directory" class="nav-item">
          <span class="idx">01</span><span>课程体系目录</span>
        </router-link>
        <router-link to="/classes" class="nav-item">
          <span class="idx">02</span><span>班级与进度</span>
        </router-link>
        <router-link to="/generate" class="nav-item">
          <span class="idx">03</span><span>进度生成</span>
        </router-link>
        <router-link to="/export" class="nav-item">
          <span class="idx">04</span><span>预览与导出</span>
        </router-link>
      </nav>
    </aside>
    <main class="main">
      <router-view :key="$route.path" />
    </main>
  </div>
</template>

<script setup></script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 216px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  position: sticky;
  top: 0;
  height: 100vh;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 4px 6px 18px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 14px;
}

.mark {
  width: 34px;
  height: 34px;
  border-radius: var(--radius);
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
}

.brand-name {
  font-weight: 650;
  font-size: 15px;
  color: var(--ink);
  line-height: 1.25;
}

.brand-sub {
  font-size: 11.5px;
  color: var(--muted);
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: var(--radius);
  color: var(--ink-2);
  font-size: 13.5px;
  transition: all 0.12s;
}

.nav-item .idx {
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
}

.nav-item:hover {
  background: #f2f4f5;
  color: var(--ink);
}

.nav-item.router-link-active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.nav-item.router-link-active .idx {
  color: var(--accent);
}

.sidebar-foot {
  margin-top: auto;
  font-size: 11.5px;
  color: var(--muted);
  padding: 6px;
  border-top: 1px solid var(--line);
  padding-top: 14px;
}

.main {
  flex: 1;
  min-width: 0;
}
</style>