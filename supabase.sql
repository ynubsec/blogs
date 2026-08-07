-- ============================================================================
-- SUPABASE SCHEMA — single consolidated file (safe to re-run)
-- Everything uses IF NOT EXISTS / DROP ... IF EXISTS so you can paste the whole
-- file into the Supabase SQL editor as many times as you like.
-- ============================================================================

-- ==========================================
-- 1. WRITEUPS (Blog Posts)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.writeups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  category text,
  summary text,
  content text,
  featured_image_url text,
  image_url text,
  images text[],
  tags text[],
  video_url text,
  status text DEFAULT 'Draft',
  is_deleted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  date date DEFAULT CURRENT_DATE
);

-- ==========================================
-- 2. PROJECTS (Work/Portfolio)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  summary text,
  content text,
  featured_image_url text,
  images text[],
  technologies text[],
  live_url text,
  github_url text,
  status text DEFAULT 'Published',
  is_deleted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  date date DEFAULT CURRENT_DATE
);

-- ==========================================
-- 3. SITE CONFIGURATION (Global Settings)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.site_config (
  id integer PRIMARY KEY DEFAULT 1, -- Single row configuration
  site_name text DEFAULT 'YNUBSEC',
  tagline text DEFAULT 'Security Newsroom',
  maintenance_mode boolean DEFAULT false,
  maintenance_message text,
  contact_email text,
  about_content text,
  hero_title text,
  hero_subtitle text,
  footer_text text,
  accent_color text,
  social_links jsonb DEFAULT '[]'::jsonb,
  email jsonb, -- { from_address } used by the admin email broadcasts
  person jsonb,
  newsletter jsonb,
  home jsonb,
  about jsonb,
  blog jsonb,
  work jsonb,
  gallery jsonb,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- 4. SUBSCRIBERS (Newsletter)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  status text DEFAULT 'active', -- active, unsubscribed
  subscribed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 5. CONTACT MESSAGES (Form Submissions)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 6. NAV CATEGORIES (with subcategory support)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  description text,
  icon text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- A category cannot be its own parent (re-created safely on each run).
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS check_not_self_parent;
ALTER TABLE public.categories
  ADD CONSTRAINT check_not_self_parent CHECK (id != parent_id);

-- ==========================================
-- 7. DIAGRAMS (Diagram Builder)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.diagrams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  nodes jsonb NOT NULL DEFAULT '[]',
  connections jsonb NOT NULL DEFAULT '[]',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- 8. SITE SETTINGS (Admin → Image Styling key/value store)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb,
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.writeups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PUBLIC READ POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Public writeups are viewable by everyone." ON public.writeups;
CREATE POLICY "Public writeups are viewable by everyone." ON public.writeups
  FOR SELECT USING (status = 'Published' AND is_deleted = false);

DROP POLICY IF EXISTS "Public projects are viewable by everyone." ON public.projects;
CREATE POLICY "Public projects are viewable by everyone." ON public.projects
  FOR SELECT USING (status = 'Published' AND is_deleted = false);

DROP POLICY IF EXISTS "Site config is viewable by everyone." ON public.site_config;
CREATE POLICY "Site config is viewable by everyone." ON public.site_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.categories;
CREATE POLICY "Categories are viewable by everyone." ON public.categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public.diagrams;
CREATE POLICY "Allow public read" ON public.diagrams
  FOR SELECT USING (true);

-- ==========================================
-- PUBLIC WRITE POLICIES (Forms)
-- ==========================================
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;
CREATE POLICY "Anyone can subscribe" ON public.subscribers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can send contact message" ON public.contact_messages;
CREATE POLICY "Anyone can send contact message" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

-- ==========================================
-- ADMIN POLICIES (Service role has full access; service_role bypasses RLS)
-- ==========================================
DROP POLICY IF EXISTS "Service role full access writeups" ON public.writeups;
CREATE POLICY "Service role full access writeups" ON public.writeups
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access projects" ON public.projects;
CREATE POLICY "Service role full access projects" ON public.projects
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access config" ON public.site_config;
CREATE POLICY "Service role full access config" ON public.site_config
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access subscribers" ON public.subscribers;
CREATE POLICY "Service role full access subscribers" ON public.subscribers
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access messages" ON public.contact_messages;
CREATE POLICY "Service role full access messages" ON public.contact_messages
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access categories" ON public.categories;
CREATE POLICY "Service role full access categories" ON public.categories
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access site settings" ON public.site_settings;
CREATE POLICY "Service role full access site settings" ON public.site_settings
  FOR ALL USING (true) WITH CHECK (true);

-- Diagrams: authenticated users may manage them.
DROP POLICY IF EXISTS "Allow authenticated users to manage diagrams" ON public.diagrams;
CREATE POLICY "Allow authenticated users to manage diagrams" ON public.diagrams
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_writeups_published_list
  ON public.writeups (created_at DESC)
  WHERE is_deleted = false AND status = 'Published';

CREATE INDEX IF NOT EXISTS idx_writeups_category_published
  ON public.writeups (category)
  WHERE is_deleted = false AND status = 'Published';

CREATE INDEX IF NOT EXISTS idx_writeups_slug
  ON public.writeups (slug)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_categories_nav_order
  ON public.categories (sort_order ASC, name ASC);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_parent_sort ON public.categories(parent_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_projects_published_list
  ON public.projects (created_at DESC)
  WHERE is_deleted = false AND status = 'Published';

CREATE INDEX IF NOT EXISTS idx_diagrams_created_at ON public.diagrams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagrams_name ON public.diagrams(name);

-- ==========================================
-- SEED DATA (safe to re-run)
-- ==========================================
INSERT INTO public.site_config (id, site_name) VALUES (1, 'YNUBSEC')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('News', 'news', 0),
  ('Personal', 'personal', 1),
  ('Gallery', 'gallery', 2)
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- STORAGE (images bucket for admin uploads)
-- Create in Dashboard: Storage → New bucket → name "images" → Public bucket ON
-- Or run in the SQL editor after enabling the storage extension:
-- ==========================================
-- insert into storage.buckets (id, name, public) values ('images', 'images', true)
-- on conflict (id) do update set public = true;
--
-- create policy "Public read images" on storage.objects for select
--   using (bucket_id = 'images');
-- create policy "Authenticated upload images" on storage.objects for insert
--   with check (bucket_id = 'images');
