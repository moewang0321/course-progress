import { readFileSync } from "node:fs";
import { writeState, readState } from "../server/state.js";

// 与 src/stores/store.js 保持一致（勿单独改动，改时同步 store.js）
function uid() {
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

const PROSE_AGE = {
  快乐家园: "三岁",
  管道工程: "三岁三",
  自然奥秘: "三岁六",
  运动与探索: "三岁九",
  百变梦工厂: "四岁",
  城市之旅: "四岁三",
  梦想建筑师上: "四岁六",
  梦想建筑师下: "四岁九",
  机械达人上: "五岁",
  机械达人下: "五岁三",
  思维与研究上: "五岁六",
  思维与研究下: "五岁九",
  疯狂设计师上: "六岁",
  疯狂设计师下: "六岁",
  世界之旅: "六岁",
  探索世界: "六岁",
};

function buildCatalog(raw) {
  const systems = [];
  for (const stage of raw["课程体系"]) {
    const stageLabel = stage["阶段"];
    const categories = stage["分类列表"] || [];
    for (const cat of categories) {
      const category = cat["分类"];
      const lists = cat["体系列表"] || [];
      for (const s of lists) {
        systems.push({
          id: uid(),
          stage: stageLabel,
          category,
          age: s["年龄"] || PROSE_AGE[s["名称"]] || category,
          name: s["名称"],
          lessons: (s["课程"] || []).slice(),
          nextId: null,
        });
      }
    }
  }
  const stageCats = new Map();
  for (const sys of systems) {
    if (!stageCats.has(sys.stage)) stageCats.set(sys.stage, []);
    const cats = stageCats.get(sys.stage);
    let cat = cats.find((c) => c.name === sys.category);
    if (!cat) {
      cat = { name: sys.category, systems: [] };
      cats.push(cat);
    }
    cat.systems.push(sys);
  }
  for (const cats of stageCats.values()) {
    for (let i = 0; i < cats.length; i++) {
      const list = cats[i].systems;
      for (let j = 0; j < list.length; j++) {
        const cur = list[j];
        if (j < list.length - 1) cur.nextId = list[j + 1].id;
        else if (i < cats.length - 1) cur.nextId = cats[i + 1].systems[0].id;
        else cur.nextId = null;
      }
    }
  }
  return systems;
}

const rawCatalog = JSON.parse(
  readFileSync(new URL("../src/data/catalog.json", import.meta.url), "utf8")
);

const existing = await readState();
if (existing && Array.isArray(existing.systems) && existing.systems.length > 0) {
  console.error("已有数据，为避免覆盖，未写入。当前 systems 数:", existing.systems.length);
  process.exit(0);
}

const snapshot = {
  systems: buildCatalog(rawCatalog),
  teachers: [],
  classes: [],
  drafts: {},
  meta: {},
};
await writeState(snapshot);
console.log("已初始化默认目录到 MongoDB，systems 数:", snapshot.systems.length);
process.exit(0);