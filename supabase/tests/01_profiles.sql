-- Fase 1: perfiles
begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@test.dev'),
  ('22222222-2222-2222-2222-222222222222', 'beto@test.dev');

-- Ana crea su perfil
select pg_temp.login('11111111-1111-1111-1111-111111111111');
insert into public.profiles (id, username, full_name, timezone)
values ('11111111-1111-1111-1111-111111111111', '  Ana.Moda ', 'Ana', 'Europe/Madrid');
select pg_temp.check((select username::text from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 'ana.moda',
  'el username se guarda en minúsculas y sin espacios');

-- Ana no puede crear el perfil de Beto
do $$ begin
  insert into public.profiles (id, username, full_name)
  values ('22222222-2222-2222-2222-222222222222', 'impostor', 'X');
  raise exception 'FALLO: Ana creó el perfil de otro';
exception when insufficient_privilege then raise notice 'ok  no se puede crear el perfil de otro';
end $$;

-- Zona horaria inválida
do $$ begin
  update public.profiles set timezone = 'Marte/Olympus' where id = '11111111-1111-1111-1111-111111111111';
  raise exception 'FALLO: aceptó una zona horaria inválida';
exception when invalid_parameter_value then raise notice 'ok  zona horaria inválida rechazada';
end $$;

-- Username inválido
do $$ begin
  update public.profiles set username = 'no vale' where id = '11111111-1111-1111-1111-111111111111';
  raise exception 'FALLO: aceptó un username inválido';
exception when check_violation then raise notice 'ok  username inválido rechazado';
end $$;

-- Beto crea su perfil; el username de Ana no está disponible (sin importar mayúsculas)
select pg_temp.logout();
select pg_temp.login('22222222-2222-2222-2222-222222222222');
select pg_temp.check(not public.username_available('ANA.moda'), 'username ocupado detectado');
select pg_temp.check(public.username_available('beto'), 'username libre detectado');
insert into public.profiles (id, username, full_name) values ('22222222-2222-2222-2222-222222222222', 'beto', 'Beto');
select pg_temp.check(public.username_available('beto'), 'tu propio username cuenta como disponible');

-- Beto ve el perfil de Ana pero no puede editarlo (0 filas afectadas)
select pg_temp.check((select count(*) from public.profiles) = 2, 'los perfiles son visibles');
update public.profiles set bio = 'hackeado' where id = '11111111-1111-1111-1111-111111111111';
select pg_temp.check((select bio from public.profiles where id = '11111111-1111-1111-1111-111111111111') is null,
  'no se puede editar el perfil de otro');

-- Columnas protegidas
do $$ begin
  update public.profiles set created_at = now() - interval '1 year' where id = '22222222-2222-2222-2222-222222222222';
  raise exception 'FALLO: pudo cambiar created_at';
exception when insufficient_privilege then raise notice 'ok  created_at no editable';
end $$;

-- Anónimos no ven perfiles
select pg_temp.logout();
set local role anon;
select pg_temp.check((select count(*) from public.profiles) = 0, 'anon no ve perfiles');
reset role;

-- Storage: solo en tu carpeta
select pg_temp.login('22222222-2222-2222-2222-222222222222');
insert into storage.objects (bucket_id, name) values ('avatars', '22222222-2222-2222-2222-222222222222/a.webp');
do $$ begin
  insert into storage.objects (bucket_id, name) values ('avatars', '11111111-1111-1111-1111-111111111111/a.webp');
  raise exception 'FALLO: subió un avatar en la carpeta de otro';
exception when insufficient_privilege then raise notice 'ok  no se puede subir avatar en carpeta ajena';
end $$;

rollback;
