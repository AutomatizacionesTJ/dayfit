-- Fase 5: chat
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@test.dev'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bea@test.dev'),
  ('cccccccc-0000-0000-0000-000000000003', 'carlos@test.dev');
insert into public.profiles (id, username, full_name, is_private) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', false),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bea', 'Bea', true),
  ('cccccccc-0000-0000-0000-000000000003', 'carlos', 'Carlos', false);

-- Ana escribe a Carlos (pública): se crea la conversación y se envía
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
create temp table ids as select public.get_or_create_conversation('cccccccc-0000-0000-0000-000000000003') as ac;
grant select on ids to authenticated;
select pg_temp.check(
  (select public.get_or_create_conversation('cccccccc-0000-0000-0000-000000000003') = ac from ids),
  'una sola conversación por pareja');
-- En el test todo ocurre en la misma transacción (mismo now()): retrasamos la lectura
select pg_temp.logout();
update public.conversations set a_read_at = now() - interval '1 minute', b_read_at = now() - interval '1 minute';
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.messages (conversation_id, body) select ac, '  Hola Carlos  ' from ids;
select pg_temp.check(
  (select body = 'Hola Carlos' from public.messages),
  'el mensaje se guarda limpio');

-- Ana no puede escribir a Bea (privada, sin seguimiento)
do $$ begin
  perform public.get_or_create_conversation('bbbbbbbb-0000-0000-0000-000000000002');
  raise exception 'FALLO: abrió chat con una privada sin seguirla';
exception when insufficient_privilege then raise notice 'ok  no se abre chat con privada sin seguimiento';
end $$;

do $$ begin
  insert into public.conversations (user_a, user_b) values ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002');
  raise exception 'FALLO: creó una conversación a mano';
exception when insufficient_privilege then raise notice 'ok  las conversaciones solo se crean por la función';
end $$;

do $$ begin
  update public.messages set body = 'editado';
  raise exception 'FALLO: editó un mensaje';
exception when insufficient_privilege then raise notice 'ok  los mensajes no se editan';
end $$;
select pg_temp.logout();

-- Carlos recibe: 1 no leído, y lo marca como leído
select pg_temp.login('cccccccc-0000-0000-0000-000000000003');
select pg_temp.check(
  (select unread = 1 and username = 'ana' and last_body = 'Hola Carlos' from public.my_conversations()),
  'lista de conversaciones con no leídos');
select pg_temp.check(public.unread_conversations() = 1, 'contador de conversaciones sin leer');
select public.mark_conversation_read(ac) from ids;
select pg_temp.check(public.unread_conversations() = 0, 'marcar como leída');

-- Carlos no puede enviar en nombre de Ana
do $$ begin
  insert into public.messages (conversation_id, sender_id, body) select ac, 'aaaaaaaa-0000-0000-0000-000000000001', 'x' from ids;
  raise exception 'FALLO: envió en nombre de otro';
exception when insufficient_privilege then raise notice 'ok  no se envía en nombre de otro';
end $$;
select pg_temp.logout();

-- Bea (ajena) no ve ni escribe en la conversación de Ana y Carlos
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check(
  (select count(*) = 0 from public.messages) and (select count(*) = 0 from public.conversations),
  'una ajena no ve conversaciones ni mensajes');
do $$ begin
  insert into public.messages (conversation_id, body) select ac, 'intrusa' from ids;
  raise exception 'FALLO: escribió en una conversación ajena';
exception when insufficient_privilege then raise notice 'ok  no se escribe en conversaciones ajenas';
end $$;
select pg_temp.logout();

-- Ana pide seguir a Bea y Bea acepta: ahora pueden hablar (en ambas direcciones)
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.follows (following_id) values ('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.logout();
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
update public.follows set status = 'accepted' where follower_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.logout();
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
insert into ids (ac) values (null);
update ids set ac = public.get_or_create_conversation('bbbbbbbb-0000-0000-0000-000000000002') where ac is null;
insert into public.messages (conversation_id, body)
select c.id, 'Hola Bea' from public.conversations c where 'bbbbbbbb-0000-0000-0000-000000000002' in (c.user_a, c.user_b);
select pg_temp.check(
  (select count(*) = 2 from public.my_conversations()),
  'con seguimiento aceptado se puede escribir a una privada');
select pg_temp.logout();

-- Bea elimina a Ana como seguidora: Ana ya no puede escribirle, pero conserva el historial
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
delete from public.follows where follower_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.logout();
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
do $$ begin
  insert into public.messages (conversation_id, body)
  select c.id, 'sigo aquí' from public.conversations c where 'bbbbbbbb-0000-0000-0000-000000000002' in (c.user_a, c.user_b);
  raise exception 'FALLO: escribió a una privada tras perder el seguimiento';
exception when insufficient_privilege then raise notice 'ok  sin seguimiento ya no se puede escribir';
end $$;
select pg_temp.check(
  (select count(*) = 1 from public.messages m join public.conversations c on c.id = m.conversation_id
   where 'bbbbbbbb-0000-0000-0000-000000000002' in (c.user_a, c.user_b)),
  'el historial sigue visible');
select pg_temp.check(not public.can_message('bbbbbbbb-0000-0000-0000-000000000002'), 'can_message refleja la privacidad');
select pg_temp.logout();

rollback;
