-- Fase 3: seguir y privacidad
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@test.dev'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bea@test.dev'),
  ('cccccccc-0000-0000-0000-000000000003', 'carlos@test.dev');
insert into public.profiles (id, username, full_name, is_private) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', false),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bea', 'Bea', true),
  ('cccccccc-0000-0000-0000-000000000003', 'carlos', 'Carlos', false);
insert into storage.objects (bucket_id, name, owner) values
  ('outfits', 'bbbbbbbb-0000-0000-0000-000000000002/1.webp', 'bbbbbbbb-0000-0000-0000-000000000002');

-- Bea (privada) sube un outfit
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
insert into public.outfits (image_path) values ('bbbbbbbb-0000-0000-0000-000000000002/1.webp');
select pg_temp.logout();

-- Ana sigue a Carlos (pública): aceptado al instante
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.follows (following_id) values ('cccccccc-0000-0000-0000-000000000003');
select pg_temp.check(
  (select status = 'accepted' from public.follows where following_id = 'cccccccc-0000-0000-0000-000000000003'),
  'seguir a una cuenta pública se acepta solo');

-- Ana pide seguir a Bea (privada): queda pendiente aunque intente forzar el estado
do $$ begin
  insert into public.follows (following_id, status) values ('bbbbbbbb-0000-0000-0000-000000000002', 'accepted');
  raise exception 'FALLO: el cliente eligió el estado';
exception when insufficient_privilege then raise notice 'ok  el cliente no puede elegir el estado';
end $$;
insert into public.follows (following_id) values ('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check(
  (select status = 'pending' from public.follows where following_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'seguir a una cuenta privada crea una solicitud');

-- Mientras está pendiente, Ana no ve los outfits ni las fotos de Bea
select pg_temp.check(
  (select count(*) = 0 from public.outfits where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'solicitud pendiente: no ve los outfits');
select pg_temp.check(
  (select count(*) = 0 from storage.objects where bucket_id = 'outfits'),
  'solicitud pendiente: no ve las fotos');

-- Ana no puede aceptarse a sí misma
update public.follows set status = 'accepted' where following_id = 'bbbbbbbb-0000-0000-0000-000000000002';
select pg_temp.check(
  (select status = 'pending' from public.follows where following_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'el seguidor no puede aceptar su propia solicitud');

do $$ begin
  insert into public.follows (follower_id, following_id) values ('cccccccc-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002');
  raise exception 'FALLO: siguió en nombre de otro';
exception when insufficient_privilege then raise notice 'ok  no se puede seguir en nombre de otro';
end $$;

do $$ begin
  insert into public.follows (following_id) values ('aaaaaaaa-0000-0000-0000-000000000001');
  raise exception 'FALLO: se siguió a sí misma';
exception when check_violation then raise notice 'ok  no se puede seguir a uno mismo';
end $$;
select pg_temp.logout();

-- Carlos no ve la solicitud de Ana a Bea
select pg_temp.login('cccccccc-0000-0000-0000-000000000003');
select pg_temp.check(
  (select count(*) = 0 from public.follows where status = 'pending'),
  'las solicitudes ajenas no son visibles');
select pg_temp.logout();

-- Bea ve la solicitud y la acepta
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check(
  (select count(*) = 1 from public.follows where following_id = 'bbbbbbbb-0000-0000-0000-000000000002' and status = 'pending'),
  'la cuenta privada ve su solicitud');
update public.follows set status = 'accepted'
where follower_id = 'aaaaaaaa-0000-0000-0000-000000000001' and following_id = 'bbbbbbbb-0000-0000-0000-000000000002';
select pg_temp.check(
  (select followers = 1 and following = 0 from public.follow_counts('bbbbbbbb-0000-0000-0000-000000000002')),
  'contadores tras aceptar');

do $$ begin
  update public.follows set status = 'pending'
  where follower_id = 'aaaaaaaa-0000-0000-0000-000000000001' and following_id = 'bbbbbbbb-0000-0000-0000-000000000002';
  raise exception 'FALLO: volvió a pendiente';
exception when insufficient_privilege then raise notice 'ok  una aceptada no vuelve a pendiente';
end $$;
select pg_temp.logout();

-- Ahora Ana sí ve los outfits y las fotos de Bea
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check(
  (select count(*) = 1 from public.outfits where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'seguidora aceptada: ve los outfits');
select pg_temp.check(
  (select count(*) = 1 from storage.objects where bucket_id = 'outfits'),
  'seguidora aceptada: ve las fotos');
select pg_temp.logout();

-- Carlos pide seguir a Bea; Bea la rechaza (borra) y luego elimina a Ana como seguidora
select pg_temp.login('cccccccc-0000-0000-0000-000000000003');
insert into public.follows (following_id) values ('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.logout();
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
delete from public.follows where follower_id = 'cccccccc-0000-0000-0000-000000000003';
delete from public.follows where follower_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.check(
  (select count(*) = 0 from public.follows where following_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'la cuenta privada rechaza solicitudes y elimina seguidores');
select pg_temp.logout();

select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check(
  (select count(*) = 0 from public.outfits where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'tras ser eliminada ya no ve los outfits');
-- Ana deja de seguir a Carlos
delete from public.follows where following_id = 'cccccccc-0000-0000-0000-000000000003';
select pg_temp.check(
  (select count(*) = 0 from public.follows where follower_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'dejar de seguir');
-- Ana vuelve a pedir seguir a Bea
insert into public.follows (following_id) values ('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.logout();

-- Bea pasa a pública: la solicitud pendiente se acepta sola
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
update public.profiles set is_private = false where id = 'bbbbbbbb-0000-0000-0000-000000000002';
select pg_temp.check(
  (select status = 'accepted' from public.follows where follower_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'al pasar a pública las solicitudes se aceptan');
select pg_temp.logout();

rollback;
