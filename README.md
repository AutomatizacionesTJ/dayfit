# dayfit

Red social mobile-first de outfits diarios: un outfit por día, rachas 🔥, cuentas públicas y privadas, feeds y chat 1:1. Se instala como PWA.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth, Postgres + RLS, Storage, Realtime) · Vercel.

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Auth (email + Google), onboarding, perfil, ajustes, modo claro/oscuro, PWA | ✅ |
| 2 | Subir outfit del día y racha | ✅ |
| 3 | Seguir, solicitudes y cuentas privadas | ✅ |
| 4 | Feeds Inicio y Descubrir, buscador de usuarios | ✅ |
| 5 | Chat 1:1 en tiempo real con no leídos | ✅ |

## Puesta en marcha en local

Requisitos: Node 20+, Docker (para Supabase local).

```bash
npm install
npx supabase start            # levanta Postgres, Auth, Storage y Realtime y aplica las migraciones
cp .env.example .env.local    # rellena con la "API URL" y la "Publishable key" que imprime el comando anterior
npm run dev                   # http://localhost:3000
```

- En local la confirmación por email está desactivada: al registrarte entras directamente al onboarding.
- Para ver los emails que envía Supabase local, abre Mailpit en http://127.0.0.1:54324.
- Si cambias las migraciones: `npx supabase db reset`.

### Tests de base de datos (RLS)

Los tests de `supabase/tests/` comprueban las políticas de seguridad. Con Supabase local arrancado:

```bash
for f in supabase/tests/0*.sql; do
  psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -q -o /dev/null \
    -f supabase/tests/helpers.sql -f "$f" || exit 1
done
```

Cada test corre en una transacción que se deshace al final; imprime `ok …` por cada comprobación y se detiene en el primer `FALLO`.

### Tipos de la base de datos

`src/lib/supabase/database.types.ts` se regenera con:

```bash
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

## Despliegue (Supabase + Vercel)

1. **Crea el proyecto en Supabase** (https://supabase.com/dashboard) y aplica las migraciones:
   ```bash
   npx supabase login
   npx supabase link --project-ref <tu-project-ref>
   npx supabase db push
   ```
2. **Auth → URL Configuration** en Supabase:
   - *Site URL*: `https://tu-app.vercel.app`
   - *Redirect URLs*: `https://tu-app.vercel.app/auth/callback` (y `https://*-tu-usuario.vercel.app/auth/callback` si quieres que funcionen las previews).
3. **Importa el repo en Vercel** (https://vercel.com/new) y añade las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Supabase → Project Settings → API Keys)
   - `NEXT_PUBLIC_SITE_URL` = `https://tu-app.vercel.app`
   - `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` = `true` si activas Google
4. Despliega. Cada push a `main` vuelve a desplegar.

### Login con Google (opcional)

1. En Google Cloud Console → *APIs & Services → Credentials*, crea un **OAuth client ID** de tipo *Web application*.
   - *Authorized redirect URI*: `https://<tu-project-ref>.supabase.co/auth/v1/callback`
2. En Supabase → *Authentication → Sign In / Providers → Google*, actívalo y pega el Client ID y el Secret.
3. Pon `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` en Vercel (y en `.env.local` si lo pruebas en local).

En local, además, rellena `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` y `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, pon `enabled = true` en `[auth.external.google]` de `supabase/config.toml` y añade `http://127.0.0.1:54321/auth/v1/callback` como redirect URI en Google.

### Instalar como app (PWA)

Abre la URL de producción en el móvil: en Android, Chrome ofrece *Instalar aplicación*; en iPhone, Safari → Compartir → *Añadir a pantalla de inicio*. El service worker solo se registra en producción (`npm run build && npm start` en local).

## Estructura

```
supabase/
  migrations/        Tablas, funciones, políticas RLS y buckets de Storage (una migración por fase)
  tests/             Tests SQL de las políticas RLS
src/
  app/
    (auth)/          Login, registro y sus server actions
    auth/callback/   Vuelta de los enlaces de email y de Google
    onboarding/      Crear perfil tras registrarse
    (app)/           Pantallas con barra inferior: Inicio, Descubrir, Subir, Mensajes, Perfil (/u/[username]), Ajustes
    manifest.ts      Manifest de la PWA
  components/        UI compartida
  lib/
    supabase/        Clientes de Supabase (navegador, servidor, proxy) y tipos
    auth.ts          Sesión y perfil del usuario actual
    image.ts         Compresión y redimensionado en el navegador
  proxy.ts           Refresca la sesión y protege las rutas
public/sw.js         Service worker (instalable + página sin conexión)
```

## Seguridad

- Todas las tablas tienen RLS activado; los usuarios solo pueden escribir sus propias filas.
- Las columnas sensibles (fechas, y más adelante rachas) no son editables desde el cliente: los permisos se conceden columna a columna.
- Los avatares se suben a `avatars/{user_id}/…` y Storage rechaza subidas a carpetas ajenas.
- Las fotos de outfits van a un bucket **privado** (`outfits/{user_id}/…`) y se sirven con URLs firmadas de 1 hora; la política de lectura usa la misma función `can_view_outfits` que la tabla, así que una foto que no puedes ver tampoco se puede descargar.
- La fecha de cada outfit (`post_date`) la pone un trigger según la zona horaria del usuario, y la racha se recalcula en la base de datos a partir de esas fechas: el cliente no puede falsear ninguna de las dos.
- Seguir: el estado (`accepted` o `pending`) lo decide un trigger según si la cuenta es pública o privada; el cliente no puede elegirlo. Solo la persona seguida puede aceptar una solicitud, y una aceptada no vuelve a pendiente. Las solicitudes pendientes solo las ven sus dos implicados.
- `can_view_outfits` deja ver los outfits de una cuenta privada solo a sus seguidores aceptados; al rechazar o eliminar a un seguidor, deja de ver las fotos al instante. Al pasar una cuenta a pública, sus solicitudes pendientes se aceptan solas.
- Los feeds (`home_feed`, `discover_feed`) y el buscador (`search_profiles`) son funciones SQL *security invoker*: se ejecutan con los permisos de quien mira, así que las políticas RLS se siguen aplicando y un feed nunca incluye outfits que no puedes ver.
- Chat: solo puedes escribir a una cuenta pública, o a una privada si hay un seguimiento aceptado en cualquier dirección (`can_message`). Se comprueba al crear la conversación y en cada mensaje, así que si te dejan de seguir ya no puedes escribir (el historial se conserva). Las conversaciones solo se crean con `get_or_create_conversation` y nadie ve mensajes de conversaciones ajenas.
- El tiempo real usa Supabase Realtime sobre la tabla `messages`, que respeta RLS: cada persona solo recibe los mensajes de sus propias conversaciones. La migración de la fase 5 añade la tabla a la publicación `supabase_realtime`; si los mensajes no llegan solos, comprueba en Supabase → **Database → Publications → supabase_realtime** que `messages` está marcada.

## Aplicar migraciones sin la CLI

Si prefieres no instalar la CLI de Supabase, pega cada archivo de `supabase/migrations/` (en orden, una sola vez cada uno) en Supabase → **SQL Editor** → **Run**.
