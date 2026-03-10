import OAuthClient from "intuit-oauth";

export function createOAuthClient() {
  return new OAuthClient({
    clientId: process.env.QB_CLIENT_ID!,
    clientSecret: process.env.QB_CLIENT_SECRET!,
    environment: (process.env.QB_ENVIRONMENT as "sandbox" | "production") || "sandbox",
    redirectUri: process.env.QB_REDIRECT_URI!,
  });
}

// Token storage — in production use DB
let tokenStore: {
  access_token?: string;
  refresh_token?: string;
  realmId?: string;
  expires_at?: number;
} = {};

export function saveTokens(tokenResponse: {
  token: {
    access_token: string;
    refresh_token: string;
    realmId: string;
    expires_in: number;
  };
}) {
  tokenStore = {
    access_token: tokenResponse.token.access_token,
    refresh_token: tokenResponse.token.refresh_token,
    realmId: tokenResponse.token.realmId,
    expires_at: Date.now() + tokenResponse.token.expires_in * 1000,
  };
}

export function getTokens() {
  return tokenStore;
}

export function isConnected() {
  return !!(tokenStore.access_token && tokenStore.realmId);
}

export function isTokenExpired() {
  if (!tokenStore.expires_at) return true;
  return Date.now() >= tokenStore.expires_at - 60_000;
}
