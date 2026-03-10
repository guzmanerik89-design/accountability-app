import { NextResponse } from "next/server";
import { createOAuthClient, isConnected, getTokens } from "@/lib/quickbooks/client";
import OAuthClient from "intuit-oauth";

export async function GET() {
  const connected = await isConnected();
  if (connected) {
    const tokens = await getTokens();
    return NextResponse.json({ connected: true, realmId: tokens?.realmId });
  }

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
