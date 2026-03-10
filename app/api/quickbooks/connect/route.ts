import { NextResponse } from "next/server";
import { createOAuthClient } from "@/lib/quickbooks/client";
import OAuthClient from "intuit-oauth";

// Always starts a new QB OAuth flow (connect additional companies)
export async function GET() {
  const oauthClient = createOAuthClient();
  const authUri = oauthClient.authorizeUri({
    scope: [
      OAuthClient.scopes.Accounting,
      OAuthClient.scopes.OpenId,
      OAuthClient.scopes.Profile,
      OAuthClient.scopes.Email,
    ],
    state: "qb-connect",
  });
  return NextResponse.redirect(authUri);
}
