/**
 * POST /api/subscribe  — step 1 of double opt-in.
 *
 * Takes an email, sends a confirmation link, stores nothing.
 * The link carries a signed, expiring token (HMAC-SHA256), so no KV/D1 is needed:
 * an unconfirmed address simply never exists anywhere.
 *
 * Env (Pages project → Settings → Environment variables):
 *   RESEND_API_KEY      re_...                      (secret)
 *   SUBSCRIBE_SECRET    long random string           (secret)
 *   FROM_EMAIL          e.g. blog@alpisto.eu (verified domain in Resend)
 *   RESEND_SEGMENT_ID   optional, set in confirm.ts to file the contact
 */

interface Env {
  RESEND_API_KEY: string
  SUBSCRIBE_SECRET: string
  FROM_EMAIL?: string
  /** Where replies go — useful when sending from a domain other than alpisto.eu. */
  REPLY_TO_EMAIL?: string
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 3 // 3 days
const ALLOWED_ORIGINS = ['https://alpisto.eu', 'https://www.alpisto.eu']

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

const b64url = (bytes: ArrayBuffer | Uint8Array) => {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const sign = async (payload: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return b64url(sig)
}

// Deliberately permissive: the confirmation email is the real validator.
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origin = request.headers.get('origin')
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return json({ ok: false, error: 'bad_origin' }, 403)
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400)
  }

  // Honeypot: real people never fill a field they cannot see.
  if (typeof body.company === 'string' && body.company.trim() !== '') {
    return json({ ok: true })
  }

  const email = String(body.email ?? '').trim().toLowerCase()
  if (!looksLikeEmail(email)) {
    return json({ ok: false, error: 'invalid_email' }, 400)
  }

  if (!env.RESEND_API_KEY || !env.SUBSCRIBE_SECRET) {
    console.error('subscribe: missing environment configuration')
    return json({ ok: false, error: 'not_configured' }, 500)
  }

  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({ e: email, x: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }),
    ),
  )
  const token = `${payload}.${await sign(payload, env.SUBSCRIBE_SECRET)}`
  const confirmUrl = `${new URL(request.url).origin}/api/confirm?t=${encodeURIComponent(token)}`

  const from = env.FROM_EMAIL ?? 'Alpisto Blog <blog@alpisto.eu>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      reply_to: env.REPLY_TO_EMAIL ?? 'hello@alpisto.eu',
      subject: 'Confirm your subscription to the Alpisto blog',
      text: [
        'Someone (hopefully you) asked for new Alpisto blog posts by email.',
        '',
        'Confirm here — the link works for three days:',
        confirmUrl,
        '',
        "If it wasn't you, ignore this email. Nothing is stored until you confirm.",
        '',
        '— Evgeny, Alpisto',
      ].join('\n'),
      html: `
        <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:16px;line-height:1.55;color:#141414;max-width:520px">
          <p>Someone (hopefully you) asked for new Alpisto blog posts by email.</p>
          <p style="margin:28px 0">
            <a href="${confirmUrl}"
               style="display:inline-block;background:#141414;color:#fff;text-decoration:none;padding:14px 22px;font-weight:700;border:2px solid #141414">
              Confirm subscription
            </a>
          </p>
          <p style="font-size:14px;color:#555">The link works for three days.</p>
          <p style="font-size:14px;color:#555">
            If it wasn't you, just ignore this email — nothing is stored until you confirm.
          </p>
          <p style="font-size:14px;color:#555">— Evgeny, Alpisto</p>
        </div>`,
    }),
  })

  if (!res.ok) {
    // Resend's own message is the only useful diagnostic here (unverified domain,
    // bad key, wrong from-address), and it contains no secrets — surface it.
    const detail = await res.text()
    console.error('subscribe: resend failed', res.status, detail)
    return json({ ok: false, error: 'send_failed', status: res.status, detail }, 502)
  }

  return json({ ok: true })
}
