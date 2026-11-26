-- Bucket público para los handbooks de las casas (Pearl Connexions).
-- Ejecutar en el SQL Editor del proyecto Supabase de Pearl (el del dashboard).
-- El bucket es de lectura pública por URL; no se puede listar su contenido.
-- Solo PDF, máximo 25 MB por archivo (los handbooks preparados pesan 14 a 18 MB).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('house-guides', 'house-guides', true, 26214400, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
