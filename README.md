# alpisto-site

Corporate site for **[Alpisto d.o.o.](https://alpisto.eu)** — an engineering consultancy based in Slovenia, focused on MATLAB → Python migrations, power-systems algorithms, embedded BLE devices, and event-driven backends.

Live: **[alpisto.eu](https://alpisto.eu)**

## Stack

- **[Astro](https://astro.build)** — static site generator
- **[Tailwind CSS](https://tailwindcss.com)** + `@tailwindcss/typography` for blog and case studies
- **Markdown content collections** (zod-typed schemas) for blog posts and case studies
- **[Cloudflare Pages](https://pages.cloudflare.com)** — hosting, auto-deploy on push to `main`
- **[Formspree](https://formspree.io)** — contact form backend (no own server)
- **Cal.com** — booking widget for free 30-minute readiness calls
- **Cloudflare Web Analytics** — cookie-free, GDPR-friendly

Zero JavaScript on static pages by default.

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:4321
pnpm build        # static build → dist/
pnpm preview      # preview built output
```

Requires Node 20+ and pnpm 9+.

## Project structure

```
src/
├── content/
│   ├── config.ts              # collection schemas (blog, case-studies)
│   ├── blog/                  # markdown articles
│   └── case-studies/          # anonymous case studies
├── layouts/
│   ├── Base.astro             # HTML shell, meta, fonts
│   ├── Page.astro             # standard page wrapper (header + footer)
│   ├── BlogPost.astro         # article layout with typography
│   └── CaseStudyLayout.astro  # case study with meta grid
├── components/
│   ├── Header.astro
│   ├── Footer.astro
│   ├── ServiceCard.astro
│   └── SEO.astro
├── pages/
│   ├── index.astro            # services hub
│   ├── matlab-to-python.astro # MATLAB → Python landing
│   ├── about.astro
│   ├── blog/
│   ├── case-studies/
│   ├── thanks.astro           # post-submit confirmation
│   └── 404.astro
└── styles/
    └── globals.css
public/
├── favicon.svg
├── robots.txt
└── og-default.png
```

## Adding content

**New blog post:** create `src/content/blog/<slug>.md` with frontmatter (`title`, `description`, `pubDate`, `tags`, `draft`). See existing posts for examples.

**New case study:** create `src/content/case-studies/<slug>.md` with frontmatter (`title`, `client`, `industry`, `duration`, `tech`, `pubDate`, `problem`, `result`). Keep anonymous — no client names, no proprietary code.

## Email subscription (double opt-in)

Readers subscribe from the blog page or the end of any article. They receive a confirmation email
first; the address is only stored — as a contact in a Resend audience — once they click the link in
it. Unconfirmed addresses are never persisted. Posts go out as Resend broadcasts, which carry the
unsubscribe link.

Required environment variables (Pages project → Settings → Environment variables → Production;
mark the two secrets as secrets):

| Variable | Value |
| :--- | :--- |
| `RESEND_API_KEY` | `re_…` — needs contact-write access — secret |
| `RESEND_AUDIENCE_ID` | UUID of the audience in Resend → Audiences |
| `SUBSCRIBE_SECRET` | long random string, e.g. `openssl rand -base64 48` — secret |
| `FROM_EMAIL` | `Alpisto Blog <blog@alpisto.eu>` — domain must be verified in Resend |

Local run: `npx wrangler pages dev dist` with the same variables in `.dev.vars` (gitignored).

## Deploy

Push to `main` → Cloudflare Pages builds and deploys automatically. Build command: `pnpm build`, output directory: `dist`.

DNS is managed via Cloudflare. Custom domain `alpisto.eu` and `www.alpisto.eu` configured in CF Pages settings.

## Notes

- Brand decisions (accent color, legal names, etc.) live in local `.brand.json` — gitignored.
- DNS rollback snapshot kept in `.dns-snapshot-pre-switch.txt` — gitignored.
- Local drafts (LinkedIn posts, outreach templates) kept under `drafts/` if used — gitignored.

## License

Source code: MIT. Content (blog posts, case studies) © Alpisto d.o.o.
