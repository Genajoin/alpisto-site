/**
 * GET /api/confirm?t=<token>  — step 2 of double opt-in.
 *
 * Verifies the signed token from the confirmation email and only then creates
 * the contact in Resend. Redirects to a human-readable page either way.
 */

interface Env {
  RESEND_API_KEY: string
  SUBSCRIBE_SECRET: string
  /** Optional: segment to file the contact under. Contacts are account-level. */
  RESEND_SEGMENT_ID?: string
}

const b64urlDecode = (s: string) => {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

const b64url = (buf: ArrayBuffer) => {
  const arr = new Uint8Array(buf)
  let s = ''
  for (const b of arr) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const sign = async (payload: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)))
}

// Constant-time-ish comparison; both strings are fixed-length base64url digests.
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Never cached: a confirmation link must actually reach this function, even when
// the reader clicks it twice or their client prefetches it.
const redirect = (location: string) =>
  new Response(null, {
    status: 302,
    headers: { location, 'cache-control': 'no-store' },
  })

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const origin = new URL(request.url).origin
  const fail = (reason: string) => redirect(`${origin}/subscribed/?state=${reason}`)

  const token = new URL(request.url).searchParams.get('t') ?? ''
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return fail('invalid')

  if (!env.RESEND_API_KEY || !env.SUBSCRIBE_SECRET) {
    console.error('confirm: missing environment configuration')
    return fail('error')
  }

  if (!safeEqual(signature, await sign(payload, env.SUBSCRIBE_SECRET))) return fail('invalid')

  let email: string
  let expiry: number
  try {
    const data = JSON.parse(b64urlDecode(payload)) as { e: string; x: number }
    email = data.e
    expiry = data.x
  } catch {
    return fail('invalid')
  }

  if (!email || !expiry) return fail('invalid')
  if (expiry < Math.floor(Date.now() / 1000)) return fail('expired')

  const res = await fetch('https://api.resend.com/contacts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email,
      unsubscribed: false,
      ...(env.RESEND_SEGMENT_ID ? { segments: [{ id: env.RESEND_SEGMENT_ID }] } : {}),
    }),
  })

  // 409 means the address is already on the list — not an error for the human
  // clicking the link. Everything else is: 422 here is a validation failure,
  // not "already exists", and swallowing it loses subscribers silently.
  if (!res.ok && res.status !== 409) {
    console.error('confirm: resend failed', res.status, await res.text())
    return fail('error')
  }

  console.log('confirm: contact created', res.status, email)
  return redirect(`${origin}/subscribed/`)
}
