import { NextResponse } from "next/server";
import { createOAuthClient, isConnected, getTokens } from "@/lib/quickbooks/client";

// GET /api/quickbooks — get auth URL or connection status
export async function GET() {
  const connected = isConnected();
  if (connected) {
    const tokens = getTokens();
    return NextResponse.json({ connected: true, realmId: tokens.realmId });
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

  return NextResponse.json({ connected: false, authUri });
}

// Import OAuthClient for scopes
import OAuthClient from "intuit-oauth";
