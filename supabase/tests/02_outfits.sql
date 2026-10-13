-- Fase 2: outfits y racha
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@test.dev'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bea@test.dev'),
  ('cccccccc-0000-0000-0000-000000000003', 'carlos@test.dev');
insert into public.profiles (id, username, full_name, timezone, is_private) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana', 'Europe/Madrid', false),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bea', 'Bea', 'America/Mexico_City', true),
  ('cccccccc-0000-0000-0000-000000000003', 'carlos', 'Carlos', 'Pacific/Auckland', false);

-- Ana sube su outfit: la fecha la pone el servidor según su zona horaria
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.outfits (image_path, caption) values ('aaaaaaaa-0000-0000-0000-000000000001/1.webp', ' Look ');
select pg_temp.check(
  (select post_date = (now() at time zone 'Europe/Madrid')::date and caption = 'Look'
   from public.outfits where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'post_date en la zona horaria del usuario');
select pg_temp.check(
  (select current_streak = 1 and max_streak = 1 and p.streak = 1 from public.profiles p
   where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'primer outfit: racha 1');

do $$ begin
  insert into public.outfits (image_path) values ('aaaaaaaa-0000-0000-0000-000000000001/2.webp');
  raise exception 'FALLO: subió dos outfits el mismo día';
exception when unique_violation then raise notice 'ok  solo un outfit por día';
end $$;

do $$ begin
  insert into public.outfits (image_path, post_date) values ('aaaaaaaa-0000-0000-0000-000000000001/3.webp', '2020-01-01');
  raise exception 'FALLO: el cliente eligió la fecha';
exception when insufficient_privilege then raise notice 'ok  el cliente no puede elegir la fecha';
end $$;

do $$ begin
  insert into public.outfits (user_id, image_path) values ('bbbbbbbb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002/x.webp');
  raise exception 'FALLO: subió un outfit a nombre de otro';
exception when insufficient_privilege then raise notice 'ok  no se puede subir a nombre de otro';
end $$;

do $$ begin
  update public.profiles set current_streak = 99 where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  raise exception 'FALLO: pudo editar su racha';
exception when insufficient_privilege then raise notice 'ok  la racha no es editable';
end $$;

do $$ begin
  update public.outfits set caption = 'x';
  raise exception 'FALLO: pudo editar un outfit';
exception when insufficient_privilege then raise notice 'ok  los outfits no se editan';
end $$;

-- Bea (privada) sube; Ana no la ve, Bea sí ve la de Ana (pública)
select pg_temp.logout();
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
insert into public.outfits (image_path) values ('bbbbbbbb-0000-0000-0000-000000000002/1.webp');
select pg_temp.check((select count(*) from public.outfits) = 2, 'Bea ve el suyo y el de Ana (pública)');
select pg_temp.logout();
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check((select count(*) from public.outfits where user_id = 'bbbbbbbb-0000-0000-0000-000000000002') = 0,
  'Ana no ve los outfits de una cuenta privada');
select pg_temp.logout();

-- Storage: las fotos de cuentas privadas tampoco se pueden leer
insert into storage.objects (bucket_id, name) values
  ('outfits', 'bbbbbbbb-0000-0000-0000-000000000002/1.webp'),
  ('outfits', 'aaaaaaaa-0000-0000-0000-000000000001/1.webp');
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'outfits') = 1,
  'Storage: Ana solo puede leer fotos visibles');
select pg_temp.logout();

-- Racha a partir de fechas pasadas (insertadas sin triggers, luego recalculada)
set local session_replication_role = replica;
insert into public.outfits (user_id, image_path, post_date)
select 'cccccccc-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003/' || d || '.webp',
       public.user_today('cccccccc-0000-0000-0000-000000000003') - d
from unnest(array[10, 9, 5, 4, 3]) as d;
set local session_replication_role = origin;
select public.recompute_streak('cccccccc-0000-0000-0000-000000000003');
select pg_temp.check(
  (select current_streak = 3 and max_streak = 3 and p.streak = 0 from public.profiles p
   where id = 'cccccccc-0000-0000-0000-000000000003'),
  'racha de 3 que terminó hace 3 días: vigente 0, máxima 3');

set local session_replication_role = replica;
insert into public.outfits (user_id, image_path, post_date) values
  ('cccccccc-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003/1.webp', public.user_today('cccccccc-0000-0000-0000-000000000003') - 1),
  ('cccccccc-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003/2.webp', public.user_today('cccccccc-0000-0000-0000-000000000003') - 2);
set local session_replication_role = origin;
select public.recompute_streak('cccccccc-0000-0000-0000-000000000003');
select pg_temp.check(
  (select current_streak = 5 and max_streak = 5 and p.streak = 5 from public.profiles p
   where id = 'cccccccc-0000-0000-0000-000000000003'),
  'rellenar el hueco une la racha: 5 seguidos hasta ayer siguen vigentes');

-- Borrar un día rompe la racha, pero la máxima histórica se conserva
select pg_temp.login('cccccccc-0000-0000-0000-000000000003');
delete from public.outfits where post_date = public.user_today('cccccccc-0000-0000-0000-000000000003') - 2;
select pg_temp.check(
  (select current_streak = 1 and max_streak = 5 from public.profiles
   where id = 'cccccccc-0000-0000-0000-000000000003'),
  'al borrar un día la racha baja y la máxima se mantiene');

-- Subir hoy continúa la racha desde ayer
insert into public.outfits (image_path) values ('cccccccc-0000-0000-0000-000000000003/hoy.webp');
select pg_temp.check(
  (select current_streak = 2 and p.streak = 2 from public.profiles p where id = 'cccccccc-0000-0000-0000-000000000003'),
  'subir hoy suma a la racha de ayer');

rollback;
