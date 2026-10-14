-- Fase 6: armario y límite de IA
begin;

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana@test.dev'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bea@test.dev');
insert into public.profiles (id, username, full_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ana', 'Ana'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bea', 'Bea');

-- Ana añade prendas a su armario
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
insert into public.wardrobe_items (image_path, category, color, brand)
values ('aaaaaaaa-0000-0000-0000-000000000001/1.webp', ' Camiseta ', 'Blanco', '  ');
select pg_temp.check(
  (select category = 'Camiseta' and brand is null from public.wardrobe_items),
  'la prenda se guarda limpia');

do $$ begin
  insert into public.wardrobe_items (user_id, category) values ('bbbbbbbb-0000-0000-0000-000000000002', 'Falda');
  raise exception 'FALLO: añadió una prenda a otro armario';
exception when insufficient_privilege then raise notice 'ok  no se añade al armario de otro';
end $$;

do $$ begin
  insert into public.wardrobe_items (image_path, category) values ('bbbbbbbb-0000-0000-0000-000000000002/x.webp', 'Falda');
  raise exception 'FALLO: usó una foto de otra carpeta';
exception when insufficient_privilege then raise notice 'ok  la foto debe ser de su carpeta';
end $$;

update public.wardrobe_items set brand = 'Nike';
select pg_temp.check((select brand = 'Nike' from public.wardrobe_items), 'editar su prenda');
select pg_temp.logout();

-- Bea no ve ni toca el armario de Ana
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check((select count(*) = 0 from public.wardrobe_items), 'el armario es privado');
update public.wardrobe_items set brand = 'Hack';
delete from public.wardrobe_items;
select pg_temp.logout();
select pg_temp.check(
  (select brand = 'Nike' from public.wardrobe_items),
  'nadie más puede editar ni borrar tus prendas');

-- Límite diario de IA: 2 análisis
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check(public.ai_quota_remaining() = 2, 'empieza con 2 análisis');
select pg_temp.check(public.consume_ai_quota() = 1, 'primer análisis: queda 1');
select pg_temp.check(public.consume_ai_quota() = 0, 'segundo análisis: quedan 0');
select pg_temp.check(public.consume_ai_quota() = -1, 'tercer análisis: rechazado');
select pg_temp.check(public.ai_quota_remaining() = 0, 'no quedan análisis hoy');

do $$ begin
  update public.ai_usage set count = 0;
  raise exception 'FALLO: reinició su contador';
exception when insufficient_privilege then raise notice 'ok  el contador no se puede tocar';
end $$;
select pg_temp.logout();

-- El límite es por usuario
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
select pg_temp.check(public.ai_quota_remaining() = 2, 'el límite es por usuario');
select pg_temp.logout();

-- Al día siguiente vuelve a haber análisis
update public.ai_usage set day = day - 1;
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check(public.ai_quota_remaining() = 2, 'el límite se renueva cada día');
select pg_temp.logout();

rollback;
