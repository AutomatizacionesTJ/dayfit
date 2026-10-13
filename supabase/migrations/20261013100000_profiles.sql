-- Fase 1: perfiles y avatares
-- Un perfil existe solo cuando el usuario ha completado el onboarding.

create extension if not exists citext with schema extensions;

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    extensions.citext not null unique
              check (username ~ '^[a-z0-9._]{3,20}$' and username !~ '^[.]|[.]$|[.]{2}'),
  full_name   text not null check (char_length(btrim(full_name)) between 1 and 50),
  avatar_url  text check (avatar_url is null or char_length(avatar_url) <= 500),
  bio         text check (bio is null or char_length(bio) <= 160),
  is_private  boolean not null default false,
  timezone    text not null default 'UTC',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Perfil público de cada usuario (1:1 con auth.users).';

-- Normaliza y valida antes de guardar
create or replace function public.profiles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.username := lower(btrim(new.username));
  new.full_name := btrim(new.full_name);
  new.bio := nullif(btrim(new.bio), '');
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Zona horaria no válida: %', new.timezone using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger profiles_before_write
before insert or update on public.profiles
for each row execute function public.profiles_before_write();

-- RLS
alter table public.profiles enable row level security;

create policy "Perfiles visibles para usuarios autenticados"
on public.profiles for select
to authenticated
using (true);

create policy "Cada usuario crea su propio perfil"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Cada usuario edita su propio perfil"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Solo estas columnas son escribibles desde el cliente
revoke insert, update, delete on public.profiles from anon, authenticated;
grant insert (id, username, full_name, avatar_url, bio, is_private, timezone)
  on public.profiles to authenticated;
grant update (username, full_name, avatar_url, bio, is_private, timezone)
  on public.profiles to authenticated;

-- Comprueba si un nombre de usuario está libre (para el formulario)
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles
    where username = lower(btrim(p_username))::extensions.citext
      and id <> coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid)
  );
$$;

revoke execute on function public.username_available(text) from public, anon;
grant execute on function public.username_available(text) to authenticated;

-- Storage: avatares públicos en avatars/{user_id}/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "Avatares: subir en tu carpeta"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Avatares: actualizar en tu carpeta"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Avatares: borrar en tu carpeta"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Avatares: ver los tuyos vía API"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
