create extension if not exists pgcrypto;

create table if not exists cms_cases (
  id uuid primary key,
  slug text not null unique,
  draft_payload jsonb not null,
  published_payload jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists cms_case_order (
  case_id uuid primary key references cms_cases(id) on delete cascade,
  draft_sort_order integer not null,
  published_sort_order integer
);

create table if not exists cms_site_header (
  id text primary key,
  name text not null,
  role_prefix text not null,
  role_company_label text not null,
  role_company_href text not null,
  logo_alt text not null,
  meta_nav jsonb not null
);

create table if not exists cms_static_pages (
  key text primary key check (key in ('about', 'connect')),
  content_blocks jsonb not null,
  meta jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists cms_media_assets (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  public_url text not null,
  kind text not null check (kind in ('image', 'video', 'gif')),
  mime text not null,
  size bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists cms_preview_tokens (
  token_hash text primary key,
  entity_type text not null check (entity_type in ('case')),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists idx_cms_cases_slug on cms_cases(slug);
create index if not exists idx_cms_cases_published on cms_cases(is_published);
create index if not exists idx_cms_case_order_draft on cms_case_order(draft_sort_order);
create index if not exists idx_cms_case_order_published on cms_case_order(published_sort_order);
create index if not exists idx_cms_preview_tokens_entity on cms_preview_tokens(entity_type, entity_id);
