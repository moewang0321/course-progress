import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 本地文件兜底用的路径：<项目根>/data/state.json
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "state.json");

// 部署时设置 MONGODB_URI 即切换为云数据库；不设置则用本地 JSON 文件
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "course_progress";

let _client = null;
let _collection = null;

// 懒加载：仅在真正需要时才 import mongodb 并连接
// 这样没装 mongodb 包、也没设 MONGODB_URI 时，文件模式照常工作
async function getCollection() {
  if (_collection) return _collection;
  const { MongoClient } = await import("mongodb");
  _client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  await _client.connect();
  const db = _client.db(DB_NAME);
  _collection = db.collection("state");
  return _collection;
}

// 读：有 MONGODB_URI 走云端，否则读本地文件
export async function readState() {
  if (MONGODB_URI) {
    try {
      const col = await getCollection();
      const doc = await col.findOne({ _id: "state" });
      return doc && doc.value ? doc.value : {};
    } catch (e) {
      console.error("[state] 读取云端失败，返回空状态:", e.message);
      return {};
    }
  }
  if (!existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

// 写：有 MONGODB_URI 走云端（upsert 单文档），否则写本地文件
export async function writeState(state) {
  if (MONGODB_URI) {
    const col = await getCollection();
    await col.updateOne(
      { _id: "state" },
      { $set: { value: state } },
      { upsert: true },
    );
    return;
  }
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
}

// 读取请求体，返回字符串
export async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

// 发送 JSON 响应
export function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
