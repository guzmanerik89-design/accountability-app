import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient } from "@/lib/quickbooks/client";
import OAuthClient from "intuit-oauth";
import { cookies } from "next/headers";

// Always starts a new QB OAuth flow (connect additional companies)
export async function GET(req: NextRequest) {
  // Generate cryptographic random state for CSRF protection
  const stateBytes = new Uint8Array(32);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes, (b) => b.toString(16).padStart(2, "0")).join("");

  // Store state in httpOnly cookie for validation in callback
  const cookieStore = await cookies();
  cookieStore.set("qb_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const oauthClient = createOAuthClient();
  const authUri = oauthClient.authorizeUri({
    scope: [
      OAuthClient.scopes.Accounting,
      OAuthClient.scopes.OpenId,
      OAuthClient.scopes.Profile,
      OAuthClient.scopes.Email,
    ],
    state,
  });
  return NextResponse.redirect(authUri);
}
