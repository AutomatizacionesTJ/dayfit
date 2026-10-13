import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { getConfigProblem, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

const PUBLIC_PATHS = ["/login", "/signup", "/auth"];

export async function updateSession(request: NextRequest) {
  const problem = getConfigProblem();
  if (problem) return configErrorPage(problem);

  try {
    return await refreshAndGuard(request);
  } catch (error) {
    console.error("[proxy]", error);
    return configErrorPage(
      `No se pudo conectar con Supabase: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function refreshAndGuard(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // No pongas código entre createServerClient y getClaims: refresca la sesión.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isLoggedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return redirectWithCookies(url, response);
  }

  if (isLoggedIn && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

function configErrorPage(problem: string) {
  const escaped = problem.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>dayfit · configuración</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;font-family:system-ui,sans-serif;background:#0c0c0c;color:#f4f2ee}main{max-width:440px}h1{font-family:Georgia,serif;font-style:italic;font-weight:400;font-size:40px;margin:0 0 12px}p{color:#9a958e;line-height:1.5}code{color:#fb923c}</style></head>
<body><main><h1>dayfit</h1><p>La app no está bien configurada:</p><p><code>${escaped}</code></p><p>Revísalo en Vercel → Settings → Environment Variables y vuelve a desplegar (Deployments → ⋯ → Redeploy).</p></main></body></html>`;
  return new NextResponse(html, { status: 500, headers: { "content-type": "text/html; charset=utf-8" } });
}
