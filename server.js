import { createServer } from 'http'
import { createReadStream, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { readState, writeState, json, readBody } from './server/state.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')
const PORT = process.env.PORT || 8787

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')

  if (url.pathname === '/api/state') {
    if (req.method === 'GET') {
      return json(res, 200, await readState())
    }
    if (req.method === 'POST') {
      try {
        await writeState(JSON.parse(await readBody(req)))
        return json(res, 200, { ok: true })
      } catch (e) {
        return json(res, 400, { ok: false, error: String(e) })
      }
    }
    return json(res, 405, { ok: false })
  }

  // 静态文件（SPA）
  let p = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)
  let file = path.join(DIST, p)
  if (!file.startsWith(DIST)) return json(res, 403, { ok: false })
  if (p !== '/index.html' && !existsSync(file)) file = path.join(DIST, 'index.html')
  if (!existsSync(file)) return json(res, 404, { ok: false })

  const ext = path.extname(file).toLowerCase()
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
  createReadStream(file).pipe(res)
})

server.listen(PORT, () => {
  console.log(`course-progress 服务已启动：`)
  console.log(`  http://localhost:${PORT}`)
  console.log(`  数据保存在：data/state.json（重启后自动加载）`)
})