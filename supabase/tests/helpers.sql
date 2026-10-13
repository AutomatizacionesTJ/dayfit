-- Utilidades para los tests de RLS (se ejecutan dentro de una transacción con rollback).
-- Uso: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/helpers.sql -f supabase/tests/01_profiles.sql

create or replace function pg_temp.login(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.logout()
returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

create or replace function pg_temp.check(ok boolean, label text)
returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FALLO: %', label; end if;
  raise notice 'ok  %', label;
end $$;
