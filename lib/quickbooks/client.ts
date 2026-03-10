import OAuthClient from "intuit-oauth";
import { db } from "@/lib/db";
import { qbTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export function createOAuthClient() {
  return new OAuthClient({
    clientId: process.env.QB_CLIENT_ID!,
    clientSecret: process.env.QB_CLIENT_SECRET!,
    environment: (process.env.QB_ENVIRONMENT as "sandbox" | "production") || "sandbox",
    redirectUri: process.env.QB_REDIRECT_URI!,
  });
}

export async function saveTokens(tokenResponse: {
  token: {
    access_token: string;
    refresh_token: string;
    realmId: string;
    expires_in: number;
  };
}) {
  const { access_token, refresh_token, realmId, expires_in } = tokenResponse.token;
  const expiresAt = Date.now() + expires_in * 1000;

  await db
    .insert(qbTokens)
    .values({ realmId, accessToken: access_token, refreshToken: refresh_token, expiresAt })
    .onConflictDoUpdate({
      target: qbTokens.realmId,
      set: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        updatedAt: new Date(),
      },
    });
}

export async function getTokens(realmId?: string) {
  if (realmId) {
    const rows = await db.select().from(qbTokens).where(eq(qbTokens.realmId, realmId)).limit(1);
    return rows[0] ?? null;
  }
  const rows = await db.select().from(qbTokens).limit(1);
  return rows[0] ?? null;
}

export async function getAllTokens() {
  return db.select().from(qbTokens);
}

export async function isConnected() {
  const token = await getTokens();
  return !!token;
}

export function isTokenExpired(token: { expiresAt: number }) {
  return Date.now() >= token.expiresAt - 60_000;
}
