import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile()
  } else {
    await import('dotenv/config')
  }
} catch {
  // Ignore missing .env file
}

const root = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.join(root, 'data')
const statePath = path.join(dataDirectory, 'mission-event-state.json')
const uploadsDirectory = path.join(root, 'public', 'uploads')

const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'harshil@h.k').trim().toLowerCase()
const sessionDurationMs = 24 * 60 * 60 * 1000 // 24 hours

// Cryptographic password derivation with PBKDF2
const PWD_SALT = Buffer.from('missionathon-heist-salt-v1-2026', 'utf8')
function hashPassword(pwd) {
  return pbkdf2Sync(String(pwd || ''), PWD_SALT, 100000, 32, 'sha256')
}

// Precomputed secure hashes for valid admin passwords
const configuredAdminPasswordHash = hashPassword(process.env.ADMIN_PASSWORD || 'missionathon@tech')
const fallbackPasswordHash = hashPassword('missionathon@tech')

const sessions = new Map()
const sseClients = new Set()

const defaultTargetTime = Date.now() + (12 * 3600 + 30 * 60 + 45) * 1000
const defaultDateObj = new Date(defaultTargetTime)

const DEFAULT_STATE = {
  status: 'running', // 'not_started' | 'running' | 'paused' | 'completed'
  targetDate: defaultDateObj.toISOString().slice(0, 10),
  targetTime: defaultDateObj.toTimeString().slice(0, 8),
  timezone: 'UTC',
  durationSeconds: 12 * 3600 + 30 * 60 + 45, // 12h 30m 45s default
  remainingSeconds: 12 * 3600 + 30 * 60 + 45,
  startedAt: Date.now(),
  targetEndTime: defaultTargetTime,
  pausedAt: null,
  mission: {
    title: '',
    text: '',
    image: '/mission-image.jpg',
    revealType: 'image', // 'image' | 'text' | 'both'
  },
  auditLogs: [
    {
      id: 'log-boot',
      action: 'SYSTEM_BOOT',
      details: 'Missionathon authoritative mission controller initialized with secure PBKDF2 cryptography',
      timestamp: new Date().toISOString(),
      adminEmail: 'system',
    },
  ],
}

let currentState = { ...DEFAULT_STATE }
let isLoaded = false

// Helper to sanitize state and update countdown
function syncInternalTimer() {
  if (currentState.status === 'running') {
    const now = Date.now()
    if (now >= currentState.targetEndTime) {
      currentState.status = 'completed'
      currentState.remainingSeconds = 0
      addAuditLog('AUTO_REVEAL_COMPLETED', 'Authoritative server timer reached zero. Mission unlocked.', 'server')
      broadcastState()
    } else {
      currentState.remainingSeconds = Math.max(0, Math.ceil((currentState.targetEndTime - now) / 1000))
    }
  }
}

// Background ticker to trigger exact zero-second transition
const ticker = setInterval(() => {
  if (currentState.status === 'running') {
    const now = Date.now()
    if (now >= currentState.targetEndTime) {
      currentState.status = 'completed'
      currentState.remainingSeconds = 0
      addAuditLog('AUTO_REVEAL_COMPLETED', 'Server timer completed countdown.', 'server')
      saveStateToFile()
      broadcastState()
    }
  }
}, 500)
ticker.unref?.()

async function loadStateFromFile() {
  if (isLoaded) return currentState
  try {
    const data = await readFile(statePath, 'utf8')
    const parsed = JSON.parse(data)
    currentState = {
      ...DEFAULT_STATE,
      ...parsed,
      mission: { ...DEFAULT_STATE.mission, ...(parsed.mission || {}) },
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : DEFAULT_STATE.auditLogs,
    }
  } catch {
    currentState = { ...DEFAULT_STATE }
    await saveStateToFile()
  }
  isLoaded = true
  syncInternalTimer()
  return currentState
}

async function saveStateToFile() {
  try {
    await mkdir(dataDirectory, { recursive: true })
    const tmp = `${statePath}.${randomBytes(6).toString('hex')}.tmp`
    await writeFile(tmp, JSON.stringify(currentState, null, 2), 'utf8')
    await rename(tmp, statePath)
  } catch (err) {
    console.error('Failed to save mission state:', err)
  }
}

function addAuditLog(action, details, adminEmail) {
  const logItem = {
    id: `log-${Date.now()}-${randomBytes(3).toString('hex')}`,
    action,
    details,
    timestamp: new Date().toISOString(),
    adminEmail: adminEmail || 'unknown',
  }
  currentState.auditLogs = [logItem, ...(currentState.auditLogs || []).slice(0, 99)]
}

// Construct public payload: Hides confidential mission data until completed!
export function getPublicPayload() {
  syncInternalTimer()
  const isCompleted = currentState.status === 'completed'
  return {
    status: currentState.status,
    targetDate: currentState.targetDate,
    targetTime: currentState.targetTime,
    timezone: currentState.timezone,
    durationSeconds: currentState.durationSeconds,
    remainingSeconds: currentState.remainingSeconds,
    targetEndTime: currentState.targetEndTime,
    startedAt: currentState.startedAt,
    pausedAt: currentState.pausedAt,
    serverTime: Date.now(),
    isRevealed: isCompleted,
    // Sensitive payload only revealed when completed
    mission: isCompleted
      ? currentState.mission
      : {
          title: '',
          text: '',
          image: '',
          revealType: currentState.mission.revealType,
        },
  }
}

// Construct admin payload: Includes all internal data & audit logs
export function getAdminPayload() {
  syncInternalTimer()
  return {
    ...currentState,
    serverTime: Date.now(),
    viewerCount: sseClients.size,
  }
}

// Broadcast event to all SSE connections
function broadcastState() {
  const publicData = JSON.stringify(getPublicPayload())
  for (const res of sseClients) {
    try {
      res.write(`data: ${publicData}\n\n`)
    } catch {
      sseClients.delete(res)
    }
  }
}

function sendJson(response, status, data, headers = {}) {
  response.writeHead(status, {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Credentials': 'true',
    ...headers,
  })
  response.end(JSON.stringify(data))
}

function readJson(request, maxBytes = 2 * 1024 * 1024) { // 2MB for images/payloads
  return new Promise((resolve, reject) => {
    let rawBody = ''
    let tooLarge = false
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      if (Buffer.byteLength(rawBody) + Buffer.byteLength(chunk) > maxBytes) {
        tooLarge = true
      } else if (!tooLarge) {
        rawBody += chunk
      }
    })
    request.on('end', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('Request body is too large.'), { status: 413 }))
        return
      }
      try {
        resolve(JSON.parse(rawBody || '{}'))
      } catch {
        reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 }))
      }
    })
    request.on('error', reject)
  })
}

function getCookie(request, name) {
  const cookies = request.headers.cookie?.split(';') ?? []
  const prefix = `${name}=`
  const entry = cookies.find((cookie) => cookie.trim().startsWith(prefix))
  return entry ? entry.trim().slice(prefix.length) : ''
}

function getAdminSession(request) {
  const authHeader = request.headers['authorization'] || request.headers['x-admin-token']
  let token = ''
  if (authHeader) {
    token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim()
  }
  if (!token) {
    token = getCookie(request, 'missionathon_admin')
  }
  if (!token) return null

  const session = sessions.get(token)
  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token)
    return null
  }
  return session
}

function cookieOptions() {
  return `Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${sessionDurationMs / 1000}`
}

function checkCredentials(inputEmail, inputPassword) {
  const cleanEmail = String(inputEmail || '').trim().toLowerCase();
  const cleanPassword = String(inputPassword || '');
  
  // 1. Compute the input hash
  const inputHash = hashPassword(cleanPassword);
  let passwordMatches = false;
  
  try {
    // Safely check against BOTH configured and fallback hashes
    if (
      timingSafeEqual(inputHash, configuredAdminPasswordHash) || 
      timingSafeEqual(inputHash, fallbackPasswordHash)
    ) {
      passwordMatches = true;
    }
  } catch {
    passwordMatches = false;
  }
  
  // 2. Fix the Whitelist Logic: ONLY allow emails explicitly defined in this array
  const allowedEmails = [
    configuredAdminEmail, // Evaluates to process.env.ADMIN_EMAIL or 'harshil@h.k'
    'harshil@h.k',
    'ganjisahasra2@gmail.com',
  ];
  
  // Strict matching instead of checking for general '@' and '.' signs
  const emailMatches = allowedEmails.includes(cleanEmail);
  
  return emailMatches && passwordMatches;
}


export async function handleApi(request, response, pathname) {
  await loadStateFromFile()

  // Real-time Server-Sent Events (SSE) Stream
  if (request.method === 'GET' && pathname === '/api/events') {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })

    const initial = JSON.stringify(getPublicPayload())
    response.write(`data: ${initial}\n\n`)

    sseClients.add(response)

    request.on('close', () => {
      sseClients.delete(response)
    })
    return
  }

  // Public authoritative event state endpoint
  if (request.method === 'GET' && (pathname === '/api/event-state' || pathname === '/api/settings')) {
    sendJson(response, 200, getPublicPayload())
    return
  }

  // Session verification
  if (request.method === 'GET' && pathname === '/api/session') {
    const session = getAdminSession(request)
    sendJson(response, 200, { isAdmin: !!session, email: session?.email || '' })
    return
  }

  // Admin login
  if (request.method === 'POST' && pathname === '/api/login') {
    const credentials = await readJson(request)
    const valid = checkCredentials(credentials?.email, credentials?.password)

    if (!valid) {
      sendJson(response, 401, { error: 'Invalid email or password.' })
      return
    }

    const token = randomBytes(32).toString('hex')
    const sessionUser = {
      email: (credentials?.email || 'admin@missionathon.com').trim().toLowerCase(),
      expiresAt: Date.now() + sessionDurationMs,
    }
    sessions.set(token, sessionUser)
    addAuditLog('ADMIN_LOGIN_SUCCESS', `Admin logged in from ${request.socket?.remoteAddress || 'client'}`, sessionUser.email)
    await saveStateToFile()

    sendJson(
      response,
      200,
      { isAdmin: true, token, email: sessionUser.email },
      { 'Set-Cookie': `missionathon_admin=${token}; ${cookieOptions()}` }
    )
    return
  }

  // Admin logout
  if (request.method === 'POST' && pathname === '/api/logout') {
    const authHeader = request.headers['authorization'] || request.headers['x-admin-token']
    let token = authHeader ? (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim()) : ''
    if (!token) token = getCookie(request, 'missionathon_admin')
    if (token) sessions.delete(token)

    sendJson(response, 200, { isAdmin: false }, {
      'Set-Cookie': `missionathon_admin=; ${cookieOptions().replace(/Max-Age=\d+/, 'Max-Age=0')}`,
    })
    return
  }

  // -------------------------------------------------------------
  // PROTECTED ADMIN ENDPOINTS
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/admin/')) {
    const session = getAdminSession(request)
    if (!session) {
      sendJson(response, 401, { error: 'Administrator authentication required.' })
      return
    }

    // Get Full Admin Dashboard State
    if (request.method === 'GET' && (pathname === '/api/admin/event-state' || pathname === '/api/admin/settings')) {
      sendJson(response, 200, getAdminPayload())
      return
    }

    // Timer Controls: Start, Pause, Resume, Reset, Emergency Reveal
    if (request.method === 'POST' && pathname === '/api/admin/timer-control') {
      const body = await readJson(request)
      const { action, hours, minutes, seconds } = body

      syncInternalTimer()

      if (action === 'start') {
        const h = Math.max(0, parseInt(hours) || 0)
        const m = Math.max(0, parseInt(minutes) || 0)
        const s = Math.max(0, parseInt(seconds) || 0)
        const totalSec = h * 3600 + m * 60 + s

        if (totalSec <= 0) {
          sendJson(response, 400, { error: 'Please enter a valid duration greater than zero.' })
          return
        }

        currentState.durationSeconds = totalSec
        currentState.remainingSeconds = totalSec
        currentState.startedAt = Date.now()
        currentState.targetEndTime = currentState.startedAt + totalSec * 1000
        currentState.pausedAt = null
        currentState.status = 'running'

        addAuditLog('TIMER_STARTED', `Timer started with duration ${h}h ${m}m ${s}s (${totalSec}s)`, session.email)
      } else if (action === 'set_target') {
        const { targetDate, targetTime, timezone } = body
        if (!targetDate || !targetTime) {
          sendJson(response, 400, { error: 'Both target date and target time are required.' })
          return
        }

        const tz = timezone || 'UTC'
        // Construct ISO string. If no seconds, append :00
        const timePart = targetTime.length === 5 ? `${targetTime}:00` : targetTime
        const isoString = `${targetDate}T${timePart}Z`
        const parsedMs = Date.parse(isoString)

        if (isNaN(parsedMs)) {
          sendJson(response, 400, { error: 'Invalid date or time specification.' })
          return
        }

        const now = Date.now()
        const diffMs = parsedMs - now
        if (diffMs <= 0) {
          sendJson(response, 400, { error: 'Target time must be in the future.' })
          return
        }

        const totalSec = Math.ceil(diffMs / 1000)
        currentState.targetDate = targetDate
        currentState.targetTime = targetTime
        currentState.timezone = tz
        currentState.durationSeconds = totalSec
        currentState.remainingSeconds = totalSec
        currentState.startedAt = now
        currentState.targetEndTime = parsedMs
        currentState.pausedAt = null
        currentState.status = 'running'

        addAuditLog('TARGET_DATETIME_CONFIGURED', `Target scheduled for ${targetDate} ${targetTime} (${tz}) [${totalSec}s remaining]`, session.email)
      } else if (action === 'pause') {
        if (currentState.status === 'running') {
          const now = Date.now()
          currentState.pausedAt = now
          currentState.remainingSeconds = Math.max(0, Math.ceil((currentState.targetEndTime - now) / 1000))
          currentState.targetEndTime = null
          currentState.status = 'paused'
          addAuditLog('TIMER_PAUSED', `Timer paused with ${currentState.remainingSeconds}s remaining`, session.email)
        }
      } else if (action === 'resume') {
        if (currentState.status === 'paused') {
          const now = Date.now()
          currentState.startedAt = now
          currentState.targetEndTime = now + currentState.remainingSeconds * 1000
          currentState.pausedAt = null
          currentState.status = 'running'
          addAuditLog('TIMER_RESUMED', `Timer resumed at ${currentState.remainingSeconds}s remaining`, session.email)
        }
      } else if (action === 'reset') {
        currentState.status = 'not_started'
        currentState.remainingSeconds = currentState.durationSeconds
        currentState.targetEndTime = null
        currentState.startedAt = null
        currentState.pausedAt = null
        addAuditLog('TIMER_RESET', `Event reset to not started (${currentState.durationSeconds}s)`, session.email)
      } else if (action === 'emergency_reveal') {
        currentState.status = 'completed'
        currentState.remainingSeconds = 0
        currentState.targetEndTime = Date.now()
        addAuditLog('EMERGENCY_REVEAL_TRIGGERED', 'Admin triggered emergency reveal override', session.email)
      } else if (action === 'reseal') {
        currentState.status = 'not_started'
        currentState.remainingSeconds = currentState.durationSeconds
        currentState.targetEndTime = null
        addAuditLog('ENVELOPE_RESEALED', 'Returned envelope to sealed not-started state', session.email)
      } else {
        sendJson(response, 400, { error: 'Unknown timer control action' })
        return
      }

      await saveStateToFile()
      broadcastState()
      sendJson(response, 200, getAdminPayload())
      return
    }

    // Update Reveal Mission Content
    if ((request.method === 'POST' || request.method === 'PUT') && (pathname === '/api/admin/mission-content' || pathname === '/api/admin/settings')) {
      const body = await readJson(request)
      const { title, text, image, revealType } = body

      currentState.mission = {
        title: typeof title === 'string' ? title.trim() : currentState.mission.title,
        text: typeof text === 'string' ? text.trim() : currentState.mission.text,
        image: typeof image === 'string' ? image.trim() : currentState.mission.image,
        revealType: ['image', 'text', 'both'].includes(revealType) ? revealType : currentState.mission.revealType,
      }

      addAuditLog('MISSION_CONTENT_UPDATED', `Updated reveal mission parameters (Type: ${currentState.mission.revealType})`, session.email)
      await saveStateToFile()
      broadcastState()
      sendJson(response, 200, getAdminPayload())
      return
    }

    // Direct Image Upload (Base64)
    if (request.method === 'POST' && pathname === '/api/admin/upload-image') {
      const body = await readJson(request, 8 * 1024 * 1024) // 8MB limit
      const { base64Data, filename } = body

      if (!base64Data || typeof base64Data !== 'string') {
        sendJson(response, 400, { error: 'Invalid image data' })
        return
      }

      const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
      if (!matches || matches.length !== 3) {
        sendJson(response, 400, { error: 'Invalid Base64 image encoding' })
        return
      }

      const ext = matches[1].includes('png') ? '.png' : matches[1].includes('webp') ? '.webp' : '.jpg'
      const safeName = `mission-reveal-${Date.now()}${ext}`
      await mkdir(uploadsDirectory, { recursive: true })
      const filePath = path.join(uploadsDirectory, safeName)
      const buffer = Buffer.from(matches[2], 'base64')
      await writeFile(filePath, buffer)

      const imagePath = `/uploads/${safeName}`
      currentState.mission.image = imagePath
      addAuditLog('MISSION_IMAGE_UPLOADED', `Uploaded new image: ${imagePath} (${buffer.length} bytes)`, session.email)
      await saveStateToFile()
      broadcastState()

      sendJson(response, 200, { success: true, imagePath, adminState: getAdminPayload() })
      return
    }
  }

  sendJson(response, 404, { error: 'Endpoint not found' })
}

export async function loadSettings() {
  await loadStateFromFile()
  return {
    missionImage: currentState.mission?.image || '',
    targetTime: new Date(currentState.targetEndTime || Date.now()).toISOString(),
  }
}

