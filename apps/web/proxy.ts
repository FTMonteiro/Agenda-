import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  accessTokenClaims,
  accessTokenExpiresSoon,
  parseSession,
  refreshSession,
} from "@/lib/session";
import { clientIpFrom } from "@/lib/internal-proxy";

// Páginas do painel: sem sessão, vão para o login.
const DASHBOARD_PREFIXES = [
  "/dashboard",
  "/appointments",
  "/clientes",
  "/configuracoes",
  "/equipe",
  "/financeiro",
  "/galeria",
  "/pagamentos",
  "/services",
];

// Com sessão, estas vão direto para o painel (ex.: o login guardado nos favoritos).
const GUEST_ONLY = ["/", "/login"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/*
 * Renova a sessão UMA vez, antes de a página abrir. Sem isto, ao abrir o painel depois de
 * o token expirar (15 min), o header e os dados disparavam vários pedidos em paralelo,
 * todos tentavam renovar com o mesmo refresh token, a API só aceitava o primeiro e os
 * outros falhavam — o header ficava em "Utilizador" e os dados só vinham depois de F5.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let session = parseSession(request.cookies.get(SESSION_COOKIE)?.value);
  let renewedCookie: string | null = null;
  let clearCookie = false;

  if (session && accessTokenExpiresSoon(session.accessToken)) {
    const renewed = await refreshSession(session, clientIpFrom(request.headers));

    if (renewed === "unavailable") {
      // The API couldn't answer (busy, rate limited, down): keep the session as it is. The
      // page's own requests retry the refresh; nobody is signed out for the API's sake.
    } else if (renewed !== "invalid") {
      session = renewed;
      renewedCookie = JSON.stringify(renewed);
      // Os pedidos que esta navegação gerar no servidor já levam a sessão nova.
      request.cookies.set(SESSION_COOKIE, renewedCookie);
    } else {
      session = null;
      clearCookie = true;
      request.cookies.delete(SESSION_COOKIE);
    }
  }

  const role = session ? accessTokenClaims(session.accessToken)?.role : undefined;
  const isStaff = role === "OWNER" || role === "EMPLOYEE";

  let response: NextResponse;

  if (!session && matches(pathname, DASHBOARD_PREFIXES)) {
    response = NextResponse.redirect(new URL("/login", request.url));
  } else if (isStaff && matches(pathname, GUEST_ONLY)) {
    response = NextResponse.redirect(new URL("/dashboard", request.url));
  } else {
    response = NextResponse.next({ request: { headers: request.headers } });
  }

  if (renewedCookie) response.cookies.set(SESSION_COOKIE, renewedCookie, SESSION_COOKIE_OPTIONS);
  else if (clearCookie) response.cookies.delete(SESSION_COOKIE);

  return response;
}

export const config = {
  // Só páginas: as rotas /api tratam a sessão sozinhas, e ficheiros estáticos não precisam.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
