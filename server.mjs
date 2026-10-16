import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleApi, loadSettings } from './apiHandler.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))
const distDirectory = path.join(root, 'dist')
const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '0.0.0.0'

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

function sendJson(response, status, data, headers = {}) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  })
  response.end(JSON.stringify(data))
}

function setSecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
}

const server = createServer(async (request, response) => {
  setSecurityHeaders(response)
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url.pathname)
      return
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendJson(response, 405, { error: 'Method not allowed.' })
      return
    }
    let requestedPath = decodeURIComponent(url.pathname)
    if (requestedPath === '/') {
      requestedPath = '/index.html'
    }
    const resolvedPath = path.resolve(distDirectory, `.${requestedPath}`)
    if (!resolvedPath.startsWith(`${distDirectory}${path.sep}`)) {
      sendJson(response, 400, { error: 'Invalid path.' })
      return
    }
    if (['GET', 'HEAD'].includes(request.method) && /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(requestedPath)) {
      const settings = await loadSettings()
      const imagePath = settings.missionImage.startsWith('/')
        ? decodeURIComponent(new URL(settings.missionImage, 'http://localhost').pathname.replace(/%(?![0-9a-f]{2})/gi, '%25'))
        : ''
      if (
        imagePath
        && requestedPath === imagePath
        && Date.now() < new Date(`${settings.targetTime}+05:30`).getTime()
      ) {
        sendJson(response, 404, { error: 'Not found.' })
        return
      }
    }
    let filePath = resolvedPath
    try {
      const contents = await readFile(filePath)
      response.writeHead(200, {
        'Cache-Control': filePath.endsWith('.html') ? 'no-cache' : 'public, max-age=3600',
        'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      })
      response.end(request.method === 'HEAD' ? undefined : contents)
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
      filePath = path.join(distDirectory, 'index.html')
      const contents = await readFile(filePath)
      response.writeHead(200, { 'Cache-Control': 'no-cache', 'Content-Type': mimeTypes['.html'] })
      response.end(request.method === 'HEAD' ? undefined : contents)
    }
  } catch (error) {
    if (!response.headersSent) {
      sendJson(response, error.status || 500, {
        error: error.status ? error.message : 'The server could not complete the request.',
      })
    } else {
      response.destroy()
    }
    if (!error.status) {
      console.error('Request failed:', error)
    }
  }
})

server.listen(port, host, () => {
  console.log(`Missionathon server listening on port ${port}`)
})
