import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readState, writeState, json, readBody } from './server/state.js'

// 开发模式下提供 /api/state，把数据写入项目内 data/state.json
function filePersistence() {
  return {
    name: 'file-persistence',
    configureServer(server) {
      server.middlewares.use('/api/state', async (req, res, next) => {
        if (req.method === 'GET') return json(res, 200, await readState())
        if (req.method === 'POST') {
          try {
            await writeState(JSON.parse(await readBody(req)))
            return json(res, 200, { ok: true })
          } catch (e) {
            return json(res, 400, { ok: false })
          }
        }
        if (req.method === 'PUT') return json(res, 405, { ok: false })
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [vue(), filePersistence()],
  server: {
    port: 5173
  }
})