# YNUBSEC — setup checklist

## Push to GitHub

1. Copy `.env.example` → `.env.local` and fill secrets (never commit `.env` / `.env.local`).
2. Commit and push:

```bash
git add .
git status   # confirm .env is NOT listed
git commit -m "YNUBSEC site: blog, admin, gallery, videos"
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

3. On **Vercel**: see **[DEPLOY.md](./DEPLOY.md)** — import repo, add env vars, deploy (not GitHub Pages).

## 1. Install and run

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase keys and admin password
npm run dev
```

- Site: http://localhost:3000 (redirects to `/blog`)
- Admin: http://localhost:3000/admin/login

## 2. Supabase database

In **Supabase → SQL Editor**, run the single consolidated schema:

1. `supabase.sql` (full schema + indexes + policies — safe to re-run)

This creates:

| Table | Purpose |
|-------|---------|
| `writeups` | Blog posts |
| `projects` | Work / portfolio |
| `categories` | Navbar + category pages |
| `site_config` | Person, blog, gallery JSON settings |
| `subscribers` | Newsletter |
| `contact_messages` | Contact form |
| `diagrams` | Diagram builder |
| `site_settings` | Admin image styling |

## 3. Storage

1. **Storage → New bucket** → name `images` → **Public** ON  
2. Or run the commented SQL at the bottom of `supabase.sql`

## 4. Admin workflow

1. Log in at `/admin/login` with `PAGE_ACCESS_PASSWORD`
2. **Categories** — add nav categories (or add inline in the writeup editor)
3. **Writeups** — create posts, pick/create category, upload images
4. **Settings** — edit site JSON (person, blog title, gallery images)
5. **Gallery** — manage gallery images

## 5. Public site

| Nav | URL |
|-----|-----|
| Home | `/blog` |
| Categories | `/categories` → `/category/{slug}` |
| Personal | `/personal` |
| Gallery | `/gallery` |

## 6. Production

```bash
npm run build
npm start
```

Set the same env vars on your host (Vercel, etc.). Use `npm run dev:clean` on Windows if `.next` locks.

## Config files

| File | What it controls |
|------|------------------|
| `.env.local` | Secrets (Supabase, admin password) |
| `src/resources/once-ui.config.ts` | Routes on/off, theme, SEO base URL |
| `src/lib/config.ts` | Default site content if DB empty |
| Supabase `site_config` | Live site content (overrides defaults) |
