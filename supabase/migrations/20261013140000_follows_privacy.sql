-- Fase 3: seguir y privacidad
-- Seguir a una cuenta pública es inmediato; a una privada crea una solicitud
-- pendiente que solo la persona seguida puede aceptar o rechazar.

create table public.follows (
  follower_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

comment on table public.follows is 'Relaciones de seguimiento. pending = solicitud a cuenta privada.';
create index follows_following_idx on public.follows (following_id, status);
create index follows_follower_idx on public.follows (follower_id, status);

-- El estado lo decide el servidor: aceptado si la cuenta es pública, pendiente si es privada
create or replace function public.follows_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_at := now();
  new.status := case
    when (select is_private from public.profiles where id = new.following_id) then 'pending'
    else 'accepted'
  end;
  return new;
end;
$$;

create trigger follows_before_insert
before insert on public.follows
for each row execute function public.follows_before_insert();

-- Una solicitud solo puede pasar de pendiente a aceptada (nunca al revés)
create or replace function public.follows_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'pending' or new.status <> 'accepted' then
    raise exception 'Solo se puede aceptar una solicitud pendiente' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger follows_before_update
before update on public.follows
for each row execute function public.follows_before_update();

-- Al pasar la cuenta a pública, las solicitudes pendientes se aceptan solas
create or replace function public.profiles_after_privacy_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_private and not new.is_private then
    update public.follows set status = 'accepted'
    where following_id = new.id and status = 'pending';
  end if;
  return null;
end;
$$;

create trigger profiles_after_privacy_change
after update of is_private on public.profiles
for each row execute function public.profiles_after_privacy_change();

-- RLS
alter table public.follows enable row level security;

-- Los seguimientos aceptados son visibles (contadores); las solicitudes solo para sus implicados
create policy "Seguimientos visibles"
on public.follows for select
to authenticated
using (
  status = 'accepted'
  or (select auth.uid()) in (follower_id, following_id)
);

create policy "Cada usuario sigue en su nombre"
on public.follows for insert
to authenticated
with check ((select auth.uid()) = follower_id);

create policy "Solo la persona seguida acepta"
on public.follows for update
to authenticated
using ((select auth.uid()) = following_id)
with check ((select auth.uid()) = following_id);

-- El seguidor deja de seguir o cancela; el seguido rechaza o elimina al seguidor
create policy "Dejar de seguir o rechazar"
on public.follows for delete
to authenticated
using ((select auth.uid()) in (follower_id, following_id));

revoke insert, update, delete on public.follows from anon, authenticated;
grant insert (following_id) on public.follows to authenticated;
grant update (status) on public.follows to authenticated;
grant delete on public.follows to authenticated;

-- ¿Puede el usuario actual ver los outfits de p_owner?
-- Los propios, los de cuentas públicas y los de cuentas que sigue con solicitud aceptada.
-- Las políticas de outfits y de Storage ya usan esta función.
create or replace function public.can_view_outfits(p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_owner = (select auth.uid())
    or exists (select 1 from public.profiles where id = p_owner and not is_private)
    or exists (
      select 1 from public.follows
      where follower_id = (select auth.uid())
        and following_id = p_owner
        and status = 'accepted'
    );
$$;

-- Contadores de seguidores y seguidos (solo aceptados)
create or replace function public.follow_counts(p_user uuid)
returns table (followers integer, following integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer from public.follows where following_id = p_user and status = 'accepted'),
    (select count(*)::integer from public.follows where follower_id = p_user and status = 'accepted');
$$;

revoke execute on function public.follow_counts(uuid) from public, anon;
grant execute on function public.follow_counts(uuid) to authenticated;
