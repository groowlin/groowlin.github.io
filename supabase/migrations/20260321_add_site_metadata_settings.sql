alter table cms_site_header
  add column if not exists site_url text not null default 'https://example.com',
  add column if not exists site_name text not null default 'Portfolio',
  add column if not exists default_title text not null default 'Portfolio',
  add column if not exists title_template text not null default '%s | Portfolio',
  add column if not exists default_description text not null default 'Personal portfolio with selected product design case studies.',
  add column if not exists default_og_image text,
  add column if not exists robots_index_by_default boolean not null default true;
