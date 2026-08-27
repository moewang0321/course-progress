// EdgeOne Makers Cloud Function（Node.js v20 运行时）：处理 GET/POST /api/state
// 路由：cloud-functions/api/state.js -> example.com/api/state
//
// 说明：Cloud Functions 运行在完整 Node.js 上，可直接用官方 mongodb 驱动
// 通过 TCP 直连 MongoDB。因此这里不再像 Edge Function 那样受限于 V8 Web
// 运行时，也不需要依赖已弃用的 Atlas Data API。
// 数据结构与既有实现保持一致：整份 state 快照存为集合中 _id 为 "state"
// 的文档的 value 字段，现有云端数据可直接读取，无需迁移。

import { MongoClient } from "mongodb";

let _client = null;
let _collection = null;

async function getCollection(cfg) {
  if (_collection) return _collection;
  const client = new MongoClient(cfg.uri, {
    serverSelectionTimeoutMS: 10000,
  });
  await client.connect();
  _client = client;
  _collection = client.db(cfg.db).collection(cfg.collection);
  return _collection;
}

function toCfg(env) {
  return {
    uri: env.MONGODB_URI,
    db: env.MONGODB_DB || "course_progress",
    collection: "state",
    docId: env.MONGODB_DOC_ID || "state",
  };
}

function jsonBody(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

// GET /api/state：读取并返回整个快照（无数据时返回 {}）
export async function onRequestGet({ env }) {
  try {
    const cfg = toCfg(env);
    const col = await getCollection(cfg);
    const doc = await col.findOne({ _id: cfg.docId });
    return jsonBody(200, doc && doc.value ? doc.value : {});
  } catch (e) {
    console.error("[state] read failed:", e);
    return jsonBody(500, { ok: false, error: String((e && e.message) || e) });
  }
}

// POST /api/state：把请求体整份快照 upsert 存入 value 字段
export async function onRequestPost({ request, env }) {
  let body = null;
  try {
    body = await request.json();
  } catch {
    return jsonBody(400, { ok: false, error: "invalid json" });
  }
  try {
    const cfg = toCfg(env);
    const col = await getCollection(cfg);
    await col.updateOne({ _id: cfg.docId }, { $set: { value: body } }, { upsert: true });
    return jsonBody(200, { ok: true });
  } catch (e) {
    console.error("[state] write failed:", e);
    return jsonBody(500, { ok: false, error: String((e && e.message) || e) });
  }
}