-- Fase 4: feeds y buscador
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@test.dev'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bea@test.dev'),
  ('cccccccc-0000-0000-0000-000000000003', 'carlos@test.dev'),
  ('dddddddd-0000-0000-0000-000000000004', 'dani@test.dev');
insert into public.profiles (id, username, full_name, is_private) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana López', false),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bea', 'Bea Martín', true),
  ('cccccccc-0000-0000-0000-000000000003', 'carlos', 'Carlos Ruiz', false),
  ('dddddddd-0000-0000-0000-000000000004', 'dani_style', 'Daniela', false);

-- Cada uno sube su outfit de hoy
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.outfits (image_path) values ('aaaaaaaa-0000-0000-0000-000000000001/1.webp');
select pg_temp.logout();
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
insert into public.outfits (image_path) values ('bbbbbbbb-0000-0000-0000-000000000002/1.webp');
select pg_temp.logout();
select pg_temp.login('cccccccc-0000-0000-0000-000000000003');
insert into public.outfits (image_path) values ('cccccccc-0000-0000-0000-000000000003/1.webp');
select pg_temp.logout();
select pg_temp.login('dddddddd-0000-0000-0000-000000000004');
insert into public.outfits (image_path) values ('dddddddd-0000-0000-0000-000000000004/1.webp');
select pg_temp.logout();

-- Horas distintas para comprobar el orden (Dani el más reciente)
update public.outfits set created_at = now() - interval '3 hours' where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.outfits set created_at = now() - interval '2 hours' where user_id = 'bbbbbbbb-0000-0000-0000-000000000002';
update public.outfits set created_at = now() - interval '1 hours' where user_id = 'cccccccc-0000-0000-0000-000000000003';

-- Ana sigue a Carlos (pública) y pide seguir a Bea (privada, pendiente)
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.follows (following_id) values ('cccccccc-0000-0000-0000-000000000003'), ('bbbbbbbb-0000-0000-0000-000000000002');

select pg_temp.check(
  (select array_agg(username order by created_at desc) = array['carlos'] from public.home_feed()),
  'Inicio: solo cuentas seguidas con seguimiento aceptado');
select pg_temp.check(
  (select array_agg(username order by created_at desc) = array['dani_style'] from public.discover_feed()),
  'Descubrir: públicas que no sigo, sin mí, sin privadas');
select pg_temp.logout();

-- Bea acepta: ahora aparece en el Inicio de Ana, ordenado por fecha
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
update public.follows set status = 'accepted' where follower_id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.check(
  (select count(*) = 0 from public.discover_feed() where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  'Descubrir no muestra mi propio outfit');
select pg_temp.logout();

select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check(
  (select array_agg(username) = array['carlos', 'bea'] from public.home_feed()),
  'Inicio: aceptada aparece, más reciente primero');

-- Paginación por cursor
select pg_temp.check(
  (select array_agg(username) = array['carlos'] from public.home_feed(null, null, 1)),
  'Inicio: límite de página');
select pg_temp.check(
  (select array_agg(f.username) = array['bea']
   from public.home_feed(
     (select created_at from public.outfits where user_id = 'cccccccc-0000-0000-0000-000000000003'),
     (select id from public.outfits where user_id = 'cccccccc-0000-0000-0000-000000000003'),
     10) f),
  'Inicio: la página siguiente empieza tras el cursor');

-- Buscador
select pg_temp.check(
  (select array_agg(username) = array['carlos'] from public.search_profiles('car')),
  'buscar por username');
select pg_temp.check(
  (select array_agg(username) = array['bea'] from public.search_profiles('martín')),
  'buscar por nombre');
select pg_temp.check(
  (select array_agg(username) = array['dani_style'] from public.search_profiles('@DANI')),
  'buscar sin distinguir mayúsculas y con @');
select pg_temp.check(
  (select count(*) = 1 from public.search_profiles('_')),
  'el guion bajo se busca literal, no como comodín');
select pg_temp.check(
  (select count(*) = 0 from public.search_profiles('  ')),
  'búsqueda vacía no devuelve nada');
select pg_temp.logout();

-- Sin sesión no hay feeds
do $$ begin
  set local role anon;
  perform * from public.home_feed();
  raise exception 'FALLO: anon pudo leer el feed';
exception when insufficient_privilege then raise notice 'ok  sin sesión no hay feed';
end $$;

rollback;
