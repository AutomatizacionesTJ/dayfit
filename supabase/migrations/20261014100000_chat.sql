-- Fase 5: chat 1:1 en tiempo real
-- Una conversación por pareja de usuarios. Solo se puede escribir a una cuenta
-- pública, o a una privada si hay un seguimiento aceptado en cualquier dirección.

create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  user_a          uuid not null references public.profiles (id) on delete cascade,
  user_b          uuid not null references public.profiles (id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz,
  a_read_at       timestamptz not null default now(),
  b_read_at       timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

comment on table public.conversations is 'Chat 1:1. user_a < user_b para que cada pareja tenga una sola conversación.';
create index conversations_user_b_idx on public.conversations (user_b);
create index conversations_last_message_idx on public.conversations (last_message_at desc nulls last);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 2000),
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

-- ¿Es p_user uno de los dos miembros de la conversación?
create or replace function public.is_conversation_member(p_conversation uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversations
    where id = p_conversation and p_user in (user_a, user_b)
  );
$$;

-- ¿Puede el usuario actual escribir a p_other?
-- Cuenta pública, o seguimiento aceptado en cualquier dirección.
create or replace function public.can_message(p_other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and p_other <> (select auth.uid())
    and (
      exists (select 1 from public.profiles where id = p_other and not is_private)
      or exists (
        select 1 from public.follows
        where status = 'accepted'
          and (
            (follower_id = (select auth.uid()) and following_id = p_other)
            or (follower_id = p_other and following_id = (select auth.uid()))
          )
      )
    );
$$;

-- Devuelve la conversación con p_other, creándola si se puede escribirle
create or replace function public.get_or_create_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_a  uuid := least(v_me, p_other);
  v_b  uuid := greatest(v_me, p_other);
  v_id uuid;
begin
  if v_me is null or p_other is null or p_other = v_me then
    raise exception 'Conversación no válida' using errcode = '22023';
  end if;

  select id into v_id from public.conversations where user_a = v_a and user_b = v_b;
  if v_id is not null then
    return v_id;
  end if;

  if not public.can_message(p_other) then
    raise exception 'No puedes escribir a esta cuenta' using errcode = '42501';
  end if;

  insert into public.conversations (user_a, user_b) values (v_a, v_b)
  on conflict (user_a, user_b) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.conversations where user_a = v_a and user_b = v_b;
  end if;
  return v_id;
end;
$$;

-- Marca la conversación como leída por el usuario actual
create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.conversations set
    a_read_at = case when user_a = (select auth.uid()) then now() else a_read_at end,
    b_read_at = case when user_b = (select auth.uid()) then now() else b_read_at end
  where id = p_conversation and (select auth.uid()) in (user_a, user_b);
$$;

-- Al enviar: hora del servidor, cuerpo limpio y la conversación se actualiza
create or replace function public.messages_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := now();
  new.body := btrim(new.body);
  return new;
end;
$$;

create trigger messages_before_insert
before insert on public.messages
for each row execute function public.messages_before_insert();

create or replace function public.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations set
    last_message_at = new.created_at,
    a_read_at = case when user_a = new.sender_id then new.created_at else a_read_at end,
    b_read_at = case when user_b = new.sender_id then new.created_at else b_read_at end
  where id = new.conversation_id;
  return null;
end;
$$;

create trigger messages_after_insert
after insert on public.messages
for each row execute function public.messages_after_insert();

-- Lista de mis conversaciones con la otra persona, el último mensaje y si hay no leídos
create or replace function public.my_conversations()
returns table (
  id              uuid,
  other_id        uuid,
  username        text,
  full_name       text,
  avatar_url      text,
  last_message_at timestamptz,
  last_body       text,
  last_sender_id  uuid,
  unread          integer
)
language sql
stable
set search_path = ''
as $$
  select c.id, p.id, p.username::text, p.full_name, p.avatar_url, c.last_message_at,
         m.body, m.sender_id,
         (select count(*)::integer from public.messages u
          where u.conversation_id = c.id
            and u.sender_id <> (select auth.uid())
            and u.created_at > case when c.user_a = (select auth.uid()) then c.a_read_at else c.b_read_at end)
  from public.conversations c
  join public.profiles p on p.id = case when c.user_a = (select auth.uid()) then c.user_b else c.user_a end
  left join lateral (
    select body, sender_id from public.messages
    where conversation_id = c.id
    order by created_at desc
    limit 1
  ) m on true
  where (select auth.uid()) in (c.user_a, c.user_b)
    and c.last_message_at is not null
  order by c.last_message_at desc;
$$;

-- Número de conversaciones con mensajes sin leer (para el aviso de la barra inferior)
create or replace function public.unread_conversations()
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer from public.my_conversations() where unread > 0;
$$;

-- RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Ver mis conversaciones"
on public.conversations for select
to authenticated
using ((select auth.uid()) in (user_a, user_b));

create policy "Ver mensajes de mis conversaciones"
on public.messages for select
to authenticated
using (public.is_conversation_member(conversation_id, (select auth.uid())));

-- Para enviar hay que ser miembro y seguir pudiendo escribir a la otra persona
create policy "Enviar mensajes si se puede escribir"
on public.messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (select auth.uid()) in (c.user_a, c.user_b)
      and public.can_message(case when c.user_a = (select auth.uid()) then c.user_b else c.user_a end)
  )
);

-- Las conversaciones solo se crean con get_or_create_conversation; los mensajes no se editan
revoke insert, update, delete on public.conversations from anon, authenticated;
revoke insert, update, delete on public.messages from anon, authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;

revoke execute on function public.is_conversation_member(uuid, uuid) from public, anon;
revoke execute on function public.can_message(uuid) from public, anon;
revoke execute on function public.get_or_create_conversation(uuid) from public, anon;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
revoke execute on function public.my_conversations() from public, anon;
revoke execute on function public.unread_conversations() from public, anon;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;
grant execute on function public.can_message(uuid) to authenticated;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.my_conversations() to authenticated;
grant execute on function public.unread_conversations() to authenticated;

-- Tiempo real: los mensajes nuevos se envían a los miembros (Realtime respeta RLS)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
