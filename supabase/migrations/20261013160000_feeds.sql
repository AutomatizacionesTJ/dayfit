-- Fase 4: feeds de Inicio y Descubrir, y buscador de usuarios
-- Las funciones son SECURITY INVOKER: las políticas RLS de outfits, follows y
-- profiles se siguen aplicando, así que un feed nunca muestra lo que no puedes ver.

create extension if not exists pg_trgm with schema extensions;

-- Búsqueda por username o nombre (ILIKE '%texto%' usa estos índices)
create index profiles_username_trgm_idx on public.profiles using gin ((username::text) extensions.gin_trgm_ops);
create index profiles_full_name_trgm_idx on public.profiles using gin (full_name extensions.gin_trgm_ops);

-- Orden estable para la paginación por cursor
create index outfits_created_id_idx on public.outfits (created_at desc, id desc);

-- Fila de un feed: el outfit y lo necesario de su autor
create type public.feed_item as (
  id          uuid,
  user_id     uuid,
  image_path  text,
  caption     text,
  post_date   date,
  created_at  timestamptz,
  username    text,
  full_name   text,
  avatar_url  text,
  streak      integer
);

-- Inicio: outfits de las cuentas que sigo (seguimiento aceptado), los más recientes primero.
-- Cursor: (p_before_at, p_before_id) del último elemento de la página anterior.
create or replace function public.home_feed(
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 12
)
returns setof public.feed_item
language sql
stable
set search_path = ''
as $$
  select o.id, o.user_id, o.image_path, o.caption, o.post_date, o.created_at,
         p.username::text, p.full_name, p.avatar_url, public.streak(p)
  from public.follows f
  join public.outfits o on o.user_id = f.following_id
  join public.profiles p on p.id = o.user_id
  where f.follower_id = (select auth.uid())
    and f.status = 'accepted'
    and (p_before_at is null or (o.created_at, o.id) < (p_before_at, p_before_id))
  order by o.created_at desc, o.id desc
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

-- Descubrir: outfits recientes de cuentas públicas que no sigo (ni yo).
create or replace function public.discover_feed(
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 18
)
returns setof public.feed_item
language sql
stable
set search_path = ''
as $$
  select o.id, o.user_id, o.image_path, o.caption, o.post_date, o.created_at,
         p.username::text, p.full_name, p.avatar_url, public.streak(p)
  from public.outfits o
  join public.profiles p on p.id = o.user_id
  where not p.is_private
    and o.user_id <> (select auth.uid())
    and not exists (
      select 1 from public.follows f
      where f.follower_id = (select auth.uid()) and f.following_id = o.user_id
    )
    and (p_before_at is null or (o.created_at, o.id) < (p_before_at, p_before_id))
  order by o.created_at desc, o.id desc
  limit least(greatest(coalesce(p_limit, 18), 1), 50);
$$;

-- Buscador de usuarios por username o nombre. Primero quien empieza por el texto.
create or replace function public.search_profiles(p_query text, p_limit integer default 20)
returns table (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  is_private boolean
)
language sql
stable
set search_path = ''
as $$
  with q as (
    -- Escapa los comodines de LIKE y quita la @ inicial
    select replace(replace(replace(lower(btrim(ltrim(btrim(coalesce(p_query, '')), '@'))), '\', '\\'), '%', '\%'), '_', '\_') as term
  )
  select p.id, p.username::text, p.full_name, p.avatar_url, p.is_private
  from public.profiles p, q
  where char_length(q.term) >= 1
    and (p.username::text ilike '%' || q.term || '%' or p.full_name ilike '%' || q.term || '%')
  order by
    (p.username::text ilike q.term || '%') desc,
    (p.full_name ilike q.term || '%') desc,
    char_length(p.username::text),
    p.username
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke execute on function public.home_feed(timestamptz, uuid, integer) from public, anon;
revoke execute on function public.discover_feed(timestamptz, uuid, integer) from public, anon;
revoke execute on function public.search_profiles(text, integer) from public, anon;
grant execute on function public.home_feed(timestamptz, uuid, integer) to authenticated;
grant execute on function public.discover_feed(timestamptz, uuid, integer) to authenticated;
grant execute on function public.search_profiles(text, integer) to authenticated;
