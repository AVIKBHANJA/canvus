-- Defense-in-depth CHECK constraints on public.canvus_drops.
-- These guarantee that even a compromised client cannot forge a file_path
-- outside the user's prefix, a non-HTTPS thumbnail URL, or a disallowed
-- file MIME type.
alter table public.canvus_drops
  add constraint canvus_drops_file_path_own
    check (file_path is null or file_path like user_id::text || '/%'),
  add constraint canvus_drops_thumbnail_scheme
    check (thumbnail is null or thumbnail like 'https://%'),
  add constraint canvus_drops_file_mime_allowed
    check (
      file_mime is null or file_mime in (
        'image/png','image/jpeg','image/webp','image/gif','image/avif','image/heic',
        'application/pdf','text/plain','text/markdown','text/csv',
        'application/zip','application/json','application/x-zip-compressed'
      )
    );
