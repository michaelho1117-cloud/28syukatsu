/* global process, Buffer */
import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import { ImapFlow } from 'imapflow'
import iconv from 'iconv-lite'
import db from './shukatsu-db.js'

const app = express()
const PORT = process.env.EMAIL_API_PORT || 8787

app.use(cors())
app.use(express.json({ limit: '1mb' }))

function assertConfig(body) {
  const required = ['email', 'appPassword', 'imapHost', 'imapPort', 'smtpHost', 'smtpPort']
  for (const key of required) {
    if (!body?.[key]) throw new Error(`Missing required field: ${key}`)
  }
}

function smtpTransport(body) {
  const normalizedPass = String(body.appPassword || '').replace(/\s+/g, '')
  const secure = Number(body.smtpPort) === 465
  return nodemailer.createTransport({
    host: body.smtpHost,
    port: Number(body.smtpPort),
    secure,
    auth: { user: body.email, pass: normalizedPass },
  })
}

function imapClient(body) {
  const normalizedPass = String(body.appPassword || '').replace(/\s+/g, '')
  return new ImapFlow({
    host: body.imapHost,
    port: Number(body.imapPort),
    secure: true,
    auth: { user: body.email, pass: normalizedPass },
    logger: false,
  })
}

let cachedEmailConfig = {
  email: 'michaelho1117@gmail.com',
  appPassword: 'eksc epku qvur dahg',
  imapHost: 'imap.gmail.com',
  imapPort: 993,
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465
}
let syncTimer = null
let isSyncing = false

// Start sync immediately on server start if credentials exist
if (cachedEmailConfig.email && cachedEmailConfig.appPassword) {
  setTimeout(() => {
    console.log('[Auto-Start] Initiating initial email sync...');
    runSync();
    syncTimer = setInterval(runSync, 5 * 60 * 1000);
  }, 1000);
}


async function runSync() {
  if (!cachedEmailConfig || isSyncing) return
  isSyncing = true
  console.log(`[Sync] Starting background sync for ${cachedEmailConfig.email}...`)
  const client = imapClient(cachedEmailConfig)
  try {
    await client.connect()
    const mailbox = await client.mailboxOpen('INBOX')
    
    // Fetch last 50 to look for new ones (incremental sync would be better but this is safer)
    const limit = 50
    const start = Math.max(1, mailbox.exists - limit + 1)
    const end = mailbox.exists

    for await (const msg of client.fetch(`${start}:${end}`, { uid: true, envelope: true, source: true })) {
      const uid = msg.uid
      const subject = msg.envelope?.subject || ''
      const from = msg.envelope?.from?.[0]?.address || ''
      const date = msg.envelope?.date?.toISOString?.() || ''
      const sourceText = Buffer.isBuffer(msg.source) ? msg.source.toString('utf8') : String(msg.source || '')
      const body = extractReadableBody(sourceText)
      
      const isJob = isJobHunt(subject, body, from)

      // Persistent insert if not exists
      try {
        db.prepare(`
          INSERT INTO EmailInbox (uid, subject, sender, date, body_preview, is_job_hunt)
          VALUES (@uid, @subject, @sender, @date, @body_preview, @is_job_hunt)
          ON CONFLICT(uid) DO UPDATE SET
            subject = excluded.subject,
            sender = excluded.sender,
            date = excluded.date,
            body_preview = excluded.body_preview,
            is_job_hunt = excluded.is_job_hunt
        `).run({
          uid,
          subject,
          sender: from,
          date,
          body_preview: body.substring(0, 3000),
          is_job_hunt: isJob ? 1 : 0
        })
      } catch {
        // likely unique constraint hit, ignore
      }
    }
    console.log(`[Sync] Finished background sync.`)
    await client.logout()
  } catch (err) {
    console.error(`[Sync] Error: ${err.message}`)
    try {
      await client.logout()
    } catch {
      // no-op
    }
  } finally {
    isSyncing = false
  }
}


function normalizeText(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()（）【】[\]「」『』・,，.。/\\\-_:：]/g, '')
}


function decodeQuotedPrintable(input = '') {
  const normalized = String(input || '').replace(/=\r?\n/g, '')
  const bytes = []
  for (let i = 0; i < normalized.length; i += 1) {
    if (normalized[i] === '=' && /[A-Fa-f0-9]{2}/.test(normalized.slice(i + 1, i + 3))) {
      bytes.push(parseInt(normalized.slice(i + 1, i + 3), 16))
      i += 2
    } else {
      bytes.push(normalized.charCodeAt(i) & 0xff)
    }
  }
  return Buffer.from(bytes)
}

function parseHeaders(rawHeaders = '') {
  const unfolded = String(rawHeaders || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]+/g, ' ')
  const headers = {}
  for (const line of unfolded.split('\n')) {
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim()
  }
  return headers
}

function splitMessage(raw = '') {
  const normalized = String(raw || '').replace(/\r\n/g, '\n')
  const splitIndex = normalized.search(/\n\n/)
  if (splitIndex === -1) return { headersRaw: '', bodyRaw: normalized }
  return {
    headersRaw: normalized.slice(0, splitIndex),
    bodyRaw: normalized.slice(splitIndex + 2),
  }
}

function readParam(headerValue = '', key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(headerValue || '').match(new RegExp(`${escapedKey}\\s*=\\s*"?([^\";]+)"?`, 'i'))
  return match?.[1]?.trim() || ''
}

function decodeBodyByEncoding(bodyRaw = '', transferEncoding = '', charset = 'utf-8') {
  const encoding = String(transferEncoding || '').toLowerCase()
  const normalizedCharset = (String(charset || 'utf-8').trim() || 'utf-8').toLowerCase()
  let buffer

  if (encoding.includes('base64')) {
    const compact = String(bodyRaw || '').replace(/\s+/g, '')
    buffer = Buffer.from(compact, 'base64')
  } else if (encoding.includes('quoted-printable')) {
    buffer = decodeQuotedPrintable(bodyRaw)
  } else {
    buffer = Buffer.from(String(bodyRaw || ''), 'binary')
  }

  try {
    if (iconv.encodingExists(normalizedCharset)) {
      return iconv.decode(buffer, normalizedCharset)
    }
  } catch {
    // fall back to utf-8 below
  }
  return buffer.toString('utf8')
}

function stripHtmlToText(input = '') {
  return String(input || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
}

function cleanupReadableBody(input = '') {
  return String(input || '')
    .replace(/^--[A-Za-z0-9'()+_,./:=?-]+$/gm, '')
    .replace(/^(Content-Id:|Content-Type:|Content-Transfer-Encoding:|Content-Disposition:).*/gim, '')
    .replace(/^(Delivered-To:|Received:|X-Received:|ARC-|Authentication-Results:|Return-Path:|Message-ID:|MIME-Version:|DKIM-Signature:).*/gim, '')
    .replace(/^[-\w]+:\s.*$/gim, (line) => (line.length > 120 ? '' : line))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function parseMimePart(rawPart = '') {
  const { headersRaw, bodyRaw } = splitMessage(rawPart)
  const headers = parseHeaders(headersRaw)
  const contentType = headers['content-type'] || 'text/plain'
  const transferEncoding = headers['content-transfer-encoding'] || ''
  const boundary = readParam(contentType, 'boundary')
  const charset = readParam(contentType, 'charset') || 'utf-8'

  if (/multipart\//i.test(contentType) && boundary) {
    const marker = `--${boundary}`
    const children = bodyRaw
      .split(marker)
      .map((part) => part.trim())
      .filter((part) => part && part !== '--')
      .map((part) => parseMimePart(part.replace(/--$/, '').trim()))
      .filter(Boolean)

    const plainPart = children.find((part) => /^text\/plain/i.test(part.contentType) && part.text)
    if (plainPart) return plainPart
    const htmlPart = children.find((part) => /^text\/html/i.test(part.contentType) && part.text)
    if (htmlPart) return { ...htmlPart, text: stripHtmlToText(htmlPart.text) }
    return children.find((part) => part.text) || { contentType, text: '' }
  }

  const decoded = decodeBodyByEncoding(bodyRaw, transferEncoding, charset)
  const text = /^text\/html/i.test(contentType) ? stripHtmlToText(decoded) : decoded
  return { contentType, text }
}

function extractReadableBody(rawSource = '') {
  const src = String(rawSource || '').replace(/\r\n/g, '\n')
  if (!src.trim()) return ''

  const parsed = parseMimePart(src)
  const cleaned = cleanupReadableBody(parsed?.text || '')
  if (cleaned) return cleaned

  const fallback = cleanupReadableBody(stripHtmlToText(src))
  return fallback
}

/**
 * Heuristics to determine if an email is job-hunt related
 */
function isJobHunt(subject, body, from) {
  const jobKeywords = [
    'マイナビ', 'リクナビ', 'mynavi', 'rikunabi', 'onecareer', '外資就活', '就活',
    'エントリー', '面接', '選考', '書類選考', '内定', 'インターン', 'internship',
    'マイページ', '合否', '適性検査', 'webテスト', '説明会'
  ]
  const text = (subject + body + from).toLowerCase()
  return jobKeywords.some(kw => text.includes(kw))
}


function extractCompanyKeywords(companies = [], overrides = {}) {
  const legalWords = new Set([
    '株式会社', '合同会社', '有限会社',
    'inc', 'inc.', 'corp', 'corp.', 'corporation', 'co', 'co.', 'ltd', 'ltd.', 'llc', 'holdings',
  ])

  const businessWords = new Set([
    'コンサルティング', 'ファイナンシャルアドバイザリー', 'アドバイザリー',
    '監査法人', 'audit', 'advisory', 'consulting', 'financial',
  ])

  const stopwords = new Set([...legalWords, ...businessWords])
  const result = []

  for (const company of companies) {
    const raw = String(company || '').trim()
    if (!raw) continue

    const custom = Array.isArray(overrides?.[raw]) ? overrides[raw] : null
    if (custom && custom.length > 0) {
      const normalizedCustom = [...new Set(custom.map((x) => String(x || '').trim()).filter(Boolean))]
        .map((k) => ({ keyword: k, normalized: normalizeText(k) }))
        .filter((k) => k.normalized.length >= 2)
      if (normalizedCustom.length > 0) {
        result.push({ company: raw, keywords: normalizedCustom, source: 'manual' })
        continue
      }
    }

    const tokens = raw
      .split(/[／/\s,，.。()（）・-]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase())
      .filter((t) => !stopwords.has(t))
      .filter((t) => {
        const asciiOnly = /^[a-z0-9&.+-]+$/.test(t)
        if (asciiOnly && t.length < 3) return false
        return t.length >= 2
      })

    const latin = raw.match(/[A-Za-z][A-Za-z0-9&.+-]*/g) || []
    for (const token of latin) {
      if (token.length >= 2) tokens.push(token.toLowerCase())
    }

    const jpChunks = raw.match(/[\u3040-\u30ff\u3400-\u9fffー]{2,}/g) || []
    for (const token of jpChunks) {
      const normalized = token.toLowerCase()
      if (!stopwords.has(normalized)) tokens.push(normalized)
    }

    const unique = [...new Set(tokens)].map((k) => ({ keyword: k, normalized: normalizeText(k) }))
      .filter((k) => k.normalized.length >= 2)
      .filter((k) => {
        const n = k.normalized
        if (/^[a-z]+$/.test(n) && n.length < 3) return false
        if (['at', 'group', 'japan'].includes(n)) return false
        return true
      })
    if (unique.length > 0) result.push({ company: raw, keywords: unique, source: 'auto' })
  }

  return result
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'email api ready' })
})

app.post('/api/email/test-connection', async (req, res) => {
  try {
    assertConfig(req.body)
    const transporter = smtpTransport(req.body)
    await transporter.verify()

    const client = imapClient(req.body)
    await client.connect()
    await client.mailboxOpen('INBOX')
    await client.logout()

    res.json({ ok: true, message: 'SMTP/IMAP connected' })
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message })
  }
})

app.post('/api/email/fetch-inbox', async (req, res) => {
  const client = imapClient(req.body)
  try {
    assertConfig(req.body)
    const limit = Math.max(1, Math.min(Number(req.body.limit || 10), 30))
    await client.connect()
    const mailbox = await client.mailboxOpen('INBOX')
    const start = Math.max(1, mailbox.exists - limit + 1)
    const end = mailbox.exists

    if (mailbox.exists === 0) {
      await client.logout()
      return res.json({ ok: true, count: 0, items: [] })
    }

    const items = []
    for await (const msg of client.fetch(`${start}:${end}`, { uid: true, envelope: true }, { uid: false })) {
      items.push({
        uid: msg.uid,
        subject: msg.envelope?.subject || '',
        from: msg.envelope?.from?.[0]?.address || '',
        date: msg.envelope?.date?.toISOString?.() || '',
      })
    }

    await client.logout()
    items.reverse()
    res.json({ ok: true, count: items.length, items })
  } catch (error) {
    try {
      await client.logout()
    } catch {
      // no-op
    }
    res.status(400).json({ ok: false, error: error.message })
  }
})

app.post('/api/email/send-test', async (req, res) => {
  try {
    assertConfig(req.body)
    if (!req.body.to) throw new Error('Missing required field: to')
    const transporter = smtpTransport(req.body)
    const info = await transporter.sendMail({
      from: req.body.email,
      to: req.body.to,
      subject: 'Job Hunt Manager - SMTP test',
      text: `SMTP test message at ${new Date().toISOString()}`,
    })
    res.json({ ok: true, message: `Test mail sent: ${info.messageId}` })
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message })
  }
})

app.post('/api/email/filter-company-mails', async (req, res) => {
  const client = imapClient(req.body)
  try {
    assertConfig(req.body)
    const companies = Array.isArray(req.body.companies) ? req.body.companies : []
    if (companies.length === 0) throw new Error('companies is empty')

    const overrides = req.body.keywordOverrides && typeof req.body.keywordOverrides === 'object'
      ? req.body.keywordOverrides
      : {}
    const keywordMap = extractCompanyKeywords(companies, overrides)
    const allKeywords = keywordMap.flatMap((entry) => entry.keywords)
    if (allKeywords.length === 0) throw new Error('No valid company keywords extracted')

    const limit = Math.max(1, Math.min(Number(req.body.limit || 120), 300))
    await client.connect()
    const mailbox = await client.mailboxOpen('INBOX')
    const start = Math.max(1, mailbox.exists - limit + 1)
    const end = mailbox.exists

    if (mailbox.exists === 0) {
      await client.logout()
      return res.json({ ok: true, count: 0, items: [], keywords: keywordMap })
    }

    const items = []
    for await (const msg of client.fetch(`${start}:${end}`, { uid: true, envelope: true, source: true }, { uid: false })) {
      const sourceText = Buffer.isBuffer(msg.source) ? msg.source.toString('utf8') : String(msg.source || '')
      const subject = msg.envelope?.subject || ''
      const from = msg.envelope?.from?.[0]?.address || ''
      const date = msg.envelope?.date?.toISOString?.() || ''
      const searchable = normalizeText(`${subject}\n${from}\n${sourceText}`)

      const matchedCompanies = []
      for (const entry of keywordMap) {
        const hit = entry.keywords.some((k) => k.normalized && searchable.includes(k.normalized))
        if (hit) matchedCompanies.push(entry.company)
      }

      if (matchedCompanies.length > 0) {
        items.push({ uid: msg.uid, subject, from, date, matchedCompanies })
      }
    }

    await client.logout()
    items.reverse()
    res.json({ ok: true, count: items.length, items, keywords: keywordMap })
  } catch (error) {
    try {
      await client.logout()
    } catch {
      // no-op
    }
    res.status(400).json({ ok: false, error: error.message })
  }
})

/**
 * Starts background sync with provided configuration
 */
app.post('/api/email/start-sync', (req, res) => {
  try {
    assertConfig(req.body)
    cachedEmailConfig = { ...req.body }
    
    if (syncTimer) clearInterval(syncTimer)
    
    // Run immediately once
    runSync()
    
    // Set interval for every 5 minutes
    syncTimer = setInterval(runSync, 5 * 60 * 1000)
    
    res.json({ ok: true, message: 'Background sync started (5m interval)' })
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message })
  }
})

/**
 * Stop background sync
 */
app.post('/api/email/stop-sync', (_req, res) => {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
  cachedEmailConfig = null
  res.json({ ok: true, message: 'Background sync stopped' })
})

/**
 * List emails from local database with job-hunt filtering
 */
  app.get('/api/email/list-local-inbox', (req, res) => {
  const isJobOnly = req.query.job_only === '1'
  const limit = Math.min(Number(req.query.limit || 50), 200)
  const q = req.query.q || ''
  
  let query = isJobOnly 
    ? 'SELECT * FROM EmailInbox WHERE is_job_hunt = 1'
    : 'SELECT * FROM EmailInbox WHERE 1=1'
  
  const params = []
  if (q) {
    query += ' AND (subject LIKE ? OR sender LIKE ?)'
    params.push(`%${q}%`, `%${q}%`)
  }
  
  query += ' ORDER BY date DESC LIMIT ?'
  params.push(limit)
  
  const items = db.prepare(query).all(...params)
  res.json({ ok: true, count: items.length, items, syncActive: isSyncing })
})

/**
 * Update local email status
 */
app.patch('/api/email/local-inbox/:id', (req, res) => {
  const { status } = req.body
  if (!status) return res.status(400).json({ ok: false, error: 'status is required' })
  db.prepare('UPDATE EmailInbox SET status = ? WHERE id = ?').run(status, req.params.id)
  res.json({ ok: true })
})

/**
 * Manually trigger a sync cycle right now
 */
app.post('/api/email/sync-now', async (_req, res) => {
  try {
    await runSync();
    res.json({ ok: true, message: 'Sync cycle triggered manually' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
})

app.listen(PORT, () => {
  console.log(`Email API listening on http://localhost:${PORT}`)
})
