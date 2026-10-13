-- Fase 2: outfit del día y racha
-- Un outfit por usuario y día (según su zona horaria). La racha se calcula
-- en el servidor a partir de las fechas de los outfits.

-- Racha guardada en el perfil (no editable desde el cliente: no hay GRANT de columna)
alter table public.profiles
  add column current_streak integer not null default 0,
  add column max_streak     integer not null default 0,
  add column last_post_date date;

-- Fecha de "hoy" para un usuario según su zona horaria
create or replace function public.user_today(p_user uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce(
    (select timezone from public.profiles where id = p_user), 'UTC'))::date;
$$;

revoke execute on function public.user_today(uuid) from public, anon;
grant execute on function public.user_today(uuid) to authenticated;

create table public.outfits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  image_path  text not null check (char_length(image_path) <= 300),
  caption     text check (caption is null or char_length(caption) <= 300),
  post_date   date not null,
  created_at  timestamptz not null default now(),
  unique (user_id, post_date)
);

comment on table public.outfits is 'Un outfit por usuario y día.';
create index outfits_user_date_idx on public.outfits (user_id, post_date desc);
create index outfits_created_idx on public.outfits (created_at desc);

-- La fecha la pone el servidor; el cliente no puede elegirla
create or replace function public.outfits_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.post_date := public.user_today(new.user_id);
  new.created_at := now();
  new.caption := nullif(btrim(new.caption), '');
  if split_part(new.image_path, '/', 1) <> new.user_id::text then
    raise exception 'La foto debe estar en tu carpeta' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger outfits_before_insert
before insert on public.outfits
for each row execute function public.outfits_before_insert();

-- Recalcula la racha de un usuario a partir de sus fechas de publicación
create or replace function public.recompute_streak(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last    date;
  v_current integer := 0;
  v_longest integer := 0;
begin
  select max(post_date) into v_last from public.outfits where user_id = p_user;

  if v_last is not null then
    -- Islas de días consecutivos: post_date - row_number() es constante dentro de cada racha
    with runs as (
      select post_date - (row_number() over (order by post_date))::integer as grp, post_date
      from public.outfits
      where user_id = p_user
    ), lengths as (
      select count(*)::integer as len, max(post_date) as ends_on
      from runs
      group by grp
    )
    select
      coalesce(max(len) filter (where ends_on = v_last), 0),
      coalesce(max(len), 0)
    into v_current, v_longest
    from lengths;
  end if;

  update public.profiles
  set current_streak = v_current,
      max_streak = greatest(max_streak, v_longest),
      last_post_date = v_last
  where id = p_user;
end;
$$;

revoke execute on function public.recompute_streak(uuid) from public, anon, authenticated;

create or replace function public.outfits_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recompute_streak(coalesce(new.user_id, old.user_id));
  return null;
end;
$$;

create trigger outfits_after_change
after insert or delete on public.outfits
for each row execute function public.outfits_after_change();

-- Racha vigente: si no subió ni hoy ni ayer, la racha es 0.
-- Se usa como columna calculada en la API: profiles?select=*,streak
create or replace function public.streak(p public.profiles)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p.last_post_date >= public.user_today(p.id) - 1 then p.current_streak
    else 0
  end;
$$;

revoke execute on function public.streak(public.profiles) from public, anon;
grant execute on function public.streak(public.profiles) to authenticated;

-- ¿Puede el usuario actual ver los outfits de p_owner?
-- Fase 2: los propios y los de cuentas públicas. La fase 3 añade seguidores aceptados.
create or replace function public.can_view_outfits(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_owner = (select auth.uid())
    or exists (select 1 from public.profiles where id = p_owner and not is_private);
$$;

revoke execute on function public.can_view_outfits(uuid) from public, anon;
grant execute on function public.can_view_outfits(uuid) to authenticated;

-- RLS
alter table public.outfits enable row level security;

create policy "Outfits visibles según privacidad"
on public.outfits for select
to authenticated
using (public.can_view_outfits(user_id));

create policy "Cada usuario sube sus outfits"
on public.outfits for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Cada usuario borra sus outfits"
on public.outfits for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.outfits from anon, authenticated;
grant insert (image_path, caption) on public.outfits to authenticated;
grant delete on public.outfits to authenticated;

-- Storage: fotos de outfits en un bucket PRIVADO, outfits/{user_id}/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('outfits', 'outfits', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "Outfits: subir en tu carpeta"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'outfits'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Outfits: ver según privacidad"
on storage.objects for select
to authenticated
using (
  bucket_id = 'outfits'
  and public.can_view_outfits(((storage.foldername(name))[1])::uuid)
);

create policy "Outfits: borrar en tu carpeta"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'outfits'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
