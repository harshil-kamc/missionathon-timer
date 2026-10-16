import { handleApi } from '../apiHandler.mjs'

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`)
    await handleApi(req, res, url.pathname)
  } catch (err) {
    console.error('Vercel API error:', err)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: err?.message || 'Internal Server Error' }))
    }
  }
}
