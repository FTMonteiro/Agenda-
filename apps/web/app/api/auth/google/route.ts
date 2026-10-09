import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_OAUTH_COOKIE, googleApiFetch, googleErrorUrl, googleRedirectUri, type GoogleOAuthPending } from "@/lib/google-oauth";

// Step 1 of "Continuar com Google": remember what was asked, then send the browser to
// Google. The Google client id and secret live in apps/api, which builds the address.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("mode") === "register" ? "register" : "login";

  const pending: GoogleOAuthPending = { state: randomUUID(), mode };
  if (mode === "register") {
    pending.company = params.get("company")?.trim() ?? "";
    pending.category = params.get("category")?.trim() ?? "";
    if (pending.company.length < 2 || pending.company.length > 120) {
      return NextResponse.redirect(googleErrorUrl(request, mode, pending.company ? "company_invalid" : "company_required"));
    }
  }

  try {
    const query = new URLSearchParams({ redirectUri: googleRedirectUri(request), state: pending.state });
    const response = await googleApiFetch(`/auth/google/url?${query}`);
    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.success) {
      const notConfigured = json?.error?.code === "GOOGLE_NOT_CONFIGURED" || json?.error?.code === "GOOGLE_REDIRECT_NOT_ALLOWED";
      return NextResponse.redirect(googleErrorUrl(request, mode, notConfigured ? "google_config" : "google"));
    }

    const store = await cookies();
    store.set(GOOGLE_OAUTH_COOKIE, JSON.stringify(pending), {
      httpOnly: true,
      // "lax" still sends the cookie on the top-level redirect back from Google.
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth/google",
      maxAge: 60 * 10,
    });

    return NextResponse.redirect(json.data.url as string);
  } catch {
    // apps/api unreachable
    return NextResponse.redirect(googleErrorUrl(request, mode, "google"));
  }
}
