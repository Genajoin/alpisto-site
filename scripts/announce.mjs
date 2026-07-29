#!/usr/bin/env node
/**
 * Announce blog posts to email subscribers.
 *
 *   npm run announce -- why-no-accelerometer-in-my-vario
 *   npm run announce -- post-a post-b --send
 *   npm run announce -- my-post --subject "Something better than the title"
 *   npm run announce -- my-post --dry     # write the HTML to /tmp and stop
 *
 * Reads title/description straight out of the post's frontmatter, renders the
 * standard template, and creates a Resend broadcast. A draft by default: open
 * it in Resend, look at the preview, press Send. `--send` skips that.
 *
 * Needs RESEND_API_KEY (contact-write access) and RESEND_SEGMENT_ID in .env.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BLOG_DIR = join(ROOT, 'src/content/blog')
const SITE = 'https://alpisto.eu'
const FROM = 'Alpisto Blog <blog@alpisto.eu>'
const REPLY_TO = 'hello@alpisto.eu'

const die = message => {
  console.error(`announce: ${message}`)
  process.exit(1)
}

// --- arguments ---------------------------------------------------------------

const argv = process.argv.slice(2)
const flags = { send: false, dry: false, subject: null }
const slugs = []

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]
  if (arg === '--send') flags.send = true
  else if (arg === '--dry') flags.dry = true
  else if (arg === '--subject') flags.subject = argv[++i] ?? die('--subject needs a value')
  else if (arg.startsWith('-')) die(`unknown flag ${arg}`)
  else slugs.push(arg.replace(/\.mdx?$/, ''))
}

if (slugs.length === 0) {
  const available = (await readdir(BLOG_DIR))
    .filter(f => /\.mdx?$/.test(f))
    .map(f => `  ${f.replace(/\.mdx?$/, '')}`)
    .sort()
  die(`no post given.\n\nUsage: npm run announce -- <slug> [more slugs] [--send]\n\nPosts:\n${available.join('\n')}`)
}

// --- frontmatter -------------------------------------------------------------

/** Minimal frontmatter reader — only the fields this script needs. */
const readPost = async slug => {
  let raw
  for (const ext of ['.md', '.mdx']) {
    try {
      raw = await readFile(join(BLOG_DIR, slug + ext), 'utf8')
      break
    } catch {
      /* try the next extension */
    }
  }
  if (!raw) die(`post not found: ${slug}`)

  const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!block) die(`${slug}: no frontmatter`)

  const field = name => {
    const m = block[1].match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : null
  }

  const title = field('title') ?? die(`${slug}: no title`)
  const description = field('description') ?? die(`${slug}: no description`)
  if (field('draft') === 'true') die(`${slug} is still a draft — publish it first`)

  return { slug, title, description, url: `${SITE}/blog/${slug}/` }
}

const posts = []
for (const slug of slugs) posts.push(await readPost(slug))

// --- template ---------------------------------------------------------------

const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const card = ({ title, description, url }) => `
      <a href="${url}" style="display:block;text-decoration:none;border:2px solid #0c0c0c;
         background:#f7f3e8;padding:22px;margin:0 0 14px">
        <div style="font:700 20px/1.25 ui-sans-serif,system-ui,sans-serif;color:#0c0c0c;
             letter-spacing:-0.02em">${escape(title)}</div>
        <div style="font:400 15px/1.55 ui-sans-serif,system-ui,sans-serif;color:#2a2a2a;
             margin-top:10px">${escape(description)}</div>
        <div style="font:600 12px/1 ui-monospace,monospace;color:#ff5b1f;margin-top:14px;
             text-transform:uppercase;letter-spacing:0.08em">Read article →</div>
      </a>`

const heading = posts.length === 1 ? 'New post' : `${posts.length} new posts`
const intro =
  posts.length === 1
    ? 'A new one on the blog — the short version is below, the argument is in the post.'
    : 'Two new ones on the blog. Short versions below, the arguments are in the posts.'

const html = `<div style="background:#eeeae0;padding:28px 18px">
  <div style="max-width:560px;margin:0 auto">
    <div style="font:600 12px/1 ui-monospace,monospace;color:#5a5a5a;
         text-transform:uppercase;letter-spacing:0.18em;margin-bottom:14px">
      ● Alpisto — field notes
    </div>
    <div style="font:700 30px/1.05 ui-sans-serif,system-ui,sans-serif;color:#0c0c0c;
         letter-spacing:-0.04em;margin-bottom:16px">
      ${heading}<span style="color:#ff5b1f">.</span>
    </div>
    <div style="font:400 16px/1.6 ui-sans-serif,system-ui,sans-serif;color:#2a2a2a;
         margin-bottom:24px">${intro}</div>
    ${posts.map(card).join('')}
    <div style="font:400 15px/1.6 ui-sans-serif,system-ui,sans-serif;color:#2a2a2a;
         margin-top:24px">
      Replies come straight to me — if you disagree with the reasoning, or have field data
      that contradicts it, I'd genuinely like to hear it.
    </div>
    <div style="font:400 15px/1.6 ui-sans-serif,system-ui,sans-serif;color:#2a2a2a;
         margin-top:16px">— Evgeny, Tolmin</div>
    <div style="border-top:1px solid #5a5a5a;margin-top:28px;padding-top:14px;
         font:400 12px/1.5 ui-monospace,monospace;color:#5a5a5a">
      You get this because you subscribed at alpisto.eu/blog.
      <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#5a5a5a">Unsubscribe</a>.
    </div>
  </div>
</div>`

// Plain text matters: some clients show it, and having it improves deliverability.
const text = [
  `${heading} on the Alpisto blog.`,
  '',
  ...posts.flatMap((p, i) => [`${i + 1}. ${p.title}`, `   ${p.url}`, '']),
  'Replies come straight to me.',
  '',
  '— Evgeny, Tolmin',
  '',
  'Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}',
].join('\n')

// Joining every title makes an unreadable subject line, so past the first one we
// just count them — the cards carry the detail.
const defaultSubject =
  posts.length === 1
    ? posts[0].title
    : `${posts[0].title} (+${posts.length - 1} more)`
const subject = flags.subject ?? defaultSubject

if (flags.dry) {
  const out = '/tmp/announce-preview.html'
  await writeFile(out, html)
  console.log(`subject: ${subject}`)
  console.log(`posts:   ${posts.map(p => p.slug).join(', ')}`)
  console.log(`preview: ${out}`)
  process.exit(0)
}

// --- send -------------------------------------------------------------------

const { RESEND_API_KEY, RESEND_SEGMENT_ID } = process.env
if (!RESEND_API_KEY) die('RESEND_API_KEY is not set (put it in .env)')
if (!RESEND_SEGMENT_ID) die('RESEND_SEGMENT_ID is not set (put it in .env)')

const api = async (path, body) => {
  const res = await fetch(`https://api.resend.com${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      'content-type': 'application/json',
      // Cloudflare sits in front of the API and answers 403/1010 without a UA.
      'user-agent': 'alpisto-announce/1.0',
    },
    body: JSON.stringify(body),
  })
  const payload = await res.text()
  if (!res.ok) die(`Resend ${res.status}: ${payload}`)
  return JSON.parse(payload)
}

const broadcast = await api('/broadcasts', {
  segment_id: RESEND_SEGMENT_ID,
  from: FROM,
  reply_to: REPLY_TO,
  subject,
  name: `${new Date().toISOString().slice(0, 10)} · ${posts.map(p => p.slug).join(' + ')}`,
  html,
  text,
})

console.log(`draft created: ${broadcast.id}`)
console.log(`subject:       ${subject}`)

if (!flags.send) {
  console.log('\nReview it at https://resend.com/broadcasts and press Send,')
  console.log('or re-run with --send to send straight away.')
  process.exit(0)
}

await api(`/broadcasts/${broadcast.id}/send`, {})
console.log('sent.')
