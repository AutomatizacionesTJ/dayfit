-- Fase 6: armario y análisis con IA
-- Cada usuario guarda sus prendas. La IA (API de Claude, llamada desde el servidor)
-- ayuda a rellenarlas, con un límite diario de análisis por usuario.

create table public.wardrobe_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  image_path  text check (image_path is null or char_length(image_path) <= 300),
  category    text not null check (char_length(btrim(category)) between 1 and 40),
  color       text check (color is null or char_length(color) <= 40),
  brand       text check (brand is null or char_length(brand) <= 60),
  notes       text check (notes is null or char_length(notes) <= 300),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.wardrobe_items is 'Prendas del armario de cada usuario (privadas).';
create index wardrobe_items_user_idx on public.wardrobe_items (user_id, created_at desc);

create or replace function public.wardrobe_items_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.category := btrim(new.category);
  new.color := nullif(btrim(new.color), '');
  new.brand := nullif(btrim(new.brand), '');
  new.notes := nullif(btrim(new.notes), '');
  if new.image_path is not null and split_part(new.image_path, '/', 1) <> new.user_id::text then
    raise exception 'La foto debe estar en tu carpeta' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    new.created_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger wardrobe_items_before_write
before insert or update on public.wardrobe_items
for each row execute function public.wardrobe_items_before_write();

alter table public.wardrobe_items enable row level security;

create policy "Ver mi armario"
on public.wardrobe_items for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Añadir a mi armario"
on public.wardrobe_items for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Editar mi armario"
on public.wardrobe_items for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Borrar de mi armario"
on public.wardrobe_items for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.wardrobe_items from anon, authenticated;
grant insert (image_path, category, color, brand, notes) on public.wardrobe_items to authenticated;
grant update (image_path, category, color, brand, notes) on public.wardrobe_items to authenticated;
grant delete on public.wardrobe_items to authenticated;

-- Storage: fotos de prendas en un bucket PRIVADO, wardrobe/{user_id}/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wardrobe', 'wardrobe', false, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "Armario: subir en tu carpeta"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'wardrobe'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Armario: ver tu carpeta"
on storage.objects for select
to authenticated
using (
  bucket_id = 'wardrobe'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Armario: borrar en tu carpeta"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'wardrobe'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Límite diario de análisis con IA (por usuario y día de su zona horaria)
create table public.ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day     date not null,
  count   integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;
-- Sin políticas ni permisos: solo las funciones de abajo la tocan.
revoke all on public.ai_usage from anon, authenticated;

-- Análisis con IA permitidos al día por usuario (cámbialo aquí si quieres más)
create or replace function public.ai_daily_limit()
returns integer
language sql
immutable
set search_path = ''
as $$ select 2 $$;

-- Análisis que le quedan hoy al usuario actual
create or replace function public.ai_quota_remaining()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(public.ai_daily_limit() - coalesce((
    select count from public.ai_usage
    where user_id = (select auth.uid()) and day = public.user_today((select auth.uid()))
  ), 0), 0);
$$;

-- Gasta un análisis del día. Devuelve los que quedan después, o -1 si ya no quedaba ninguno.
-- Se llama ANTES de llamar a la IA, así que no se puede saltar el límite con peticiones en paralelo.
create or replace function public.consume_ai_quota()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;

  insert into public.ai_usage as u (user_id, day, count)
  values (v_user, public.user_today(v_user), 1)
  on conflict (user_id, day) do update
    set count = u.count + 1
    where u.count < public.ai_daily_limit()
  returning count into v_count;

  if v_count is null then
    return -1;
  end if;
  return public.ai_daily_limit() - v_count;
end;
$$;

revoke execute on function public.ai_quota_remaining() from public, anon;
revoke execute on function public.consume_ai_quota() from public, anon;
grant execute on function public.ai_quota_remaining() to authenticated;
grant execute on function public.consume_ai_quota() to authenticated;
