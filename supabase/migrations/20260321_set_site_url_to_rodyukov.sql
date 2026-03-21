alter table cms_site_header
  alter column site_url set default 'https://rodyukov.art';

update cms_site_header
set site_url = 'https://rodyukov.art'
where site_url in ('https://example.com', 'http://example.com');
