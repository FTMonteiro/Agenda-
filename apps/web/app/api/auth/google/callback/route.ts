import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { writeSession } from "@/lib/api-proxy";
import { GOOGLE_OAUTH_COOKIE, googleApiFetch, googleErrorUrl, googleRedirectUri, type GoogleOAuthPending } from "@/lib/google-oauth";

// The API's error codes, as the ?error= values the login and cadastro pages already show.
const ERROR_BY_API_CODE: Record<string, string> = {
  GOOGLE_NOT_CONFIGURED: "google_config",
  GOOGLE_REDIRECT_NOT_ALLOWED: "google_config",
  SOCIAL_NOT_REGISTERED: "google_not_registered",
  GOOGLE_EMAIL_NOT_VERIFIED: "google_email_not_verified",
  EMAIL_ALREADY_REGISTERED: "email_already_registered",
  COMPANY_REQUIRED: "company_required",
  CATEGORY_REQUIRED: "company_invalid",
};

// Step 2: Google sends the browser back here with a one-time code. apps/api trades it for
// the account and answers with the same tokens as an email login.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const store = await cookies();

  let pending: GoogleOAuthPending | null = null;
  try {
    pending = JSON.parse(store.get(GOOGLE_OAUTH_COOKIE)?.value ?? "null") as GoogleOAuthPending | null;
  } catch {
    pending = null;
  }
  store.delete({ name: GOOGLE_OAUTH_COOKIE, path: "/api/auth/google" });

  const mode = pending?.mode === "register" ? "register" : "login";
  const fail = (error: string) => NextResponse.redirect(googleErrorUrl(request, mode, error));

  // The user closed or refused Google's consent screen.
  if (params.get("error")) return fail("google_cancelled");

  // A callback that doesn't answer a request this browser started is refused outright.
  const state = params.get("state");
  if (!pending || !state || state !== pending.state) return fail("google_invalid_state");

  const code = params.get("code");
  if (!code) return fail("google_code_missing");

  try {
    const response = await googleApiFetch(request, "/auth/google", {
      method: "POST",
      body: JSON.stringify({
        code,
        redirectUri: googleRedirectUri(request),
        mode,
        ...(mode === "register" ? { company: pending.company, category: pending.category } : {}),
      }),
    });
    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.success) {
      return fail(ERROR_BY_API_CODE[json?.error?.code as string] ?? "google");
    }

    await writeSession({ accessToken: json.data.accessToken, refreshToken: json.data.refreshToken });
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));
  } catch {
    return fail("google");
  }
}
