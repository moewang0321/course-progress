import { readState, writeState, json, readBody } from "../server/state.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") {
    const data = await readState();
    return json(res, 200, data);
  }
  if (req.method === "POST") {
    try {
      await writeState(JSON.parse(await readBody(req)));
      return json(res, 200, { ok: true });
    } catch (e) {
      return json(res, 400, { ok: false, error: String(e) });
    }
  }
  res.setHeader("Allow", "GET, POST");
  return json(res, 405, { ok: false });
}