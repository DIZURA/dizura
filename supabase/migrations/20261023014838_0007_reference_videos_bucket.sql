-- Private bucket for Genjutsu reference videos (ADR 36).
-- Browsers upload only through single-use signed upload URLs minted by the server (service role);
-- there are deliberately NO storage.objects policies for anon/authenticated, so clients can't
-- list, read, overwrite or delete anything. The provider receives short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reference-videos', 'reference-videos', false, 52428800, array['video/mp4', 'video/quicktime'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
