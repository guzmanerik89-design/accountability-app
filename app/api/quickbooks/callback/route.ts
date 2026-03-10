import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qbTokens, qbCache } from "@/lib/db/schema";

// Manually exchange auth code for tokens — avoids intuit-oauth CSRF state issues in serverless
async function exchangeCodeForTokens(code: string) {
  const clientId = process.env.QB_CLIENT_ID!;
  const clientSecret = process.env.QB_CLIENT_SECRET!;
  const redirectUri = process.env.QB_REDIRECT_URI!;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QB token exchange failed ${res.status}: ${text}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }>;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");
  const error = searchParams.get("error");

  // Intuit returned an error (user denied access, etc.)
  if (error || !code || !realmId) {
    console.error("QB OAuth callback error:", error ?? "missing code/realmId");
    return NextResponse.redirect(new URL(`/quickbooks?error=${encodeURIComponent(error ?? "missing_params")}`, req.url));
  }

  try {
    const tokenData = await exchangeCodeForTokens(code);
    const expiresAt = Date.now() + tokenData.expires_in * 1000;

    // Save tokens to DB
    await db
      .insert(qbTokens)
      .values({
        realmId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: qbTokens.realmId,
        set: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
          updatedAt: new Date(),
        },
      });

    // Auto-fetch company name so it shows immediately in the selector
    try {
      const QuickBooks = (await import("node-quickbooks")).default;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb = new (QuickBooks as any)(
        process.env.QB_CLIENT_ID!,
        process.env.QB_CLIENT_SECRET!,
        tokenData.access_token,
        false,
        realmId,
        process.env.QB_ENVIRONMENT === "production" ? false : true,
        false,
        null,
        "2.0",
        tokenData.refresh_token
      );

      const companyInfo = await new Promise((resolve, reject) => {
        qb.getCompanyInfo(realmId, (err: Error, data: unknown) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      await db
        .insert(qbCache)
        .values({ realmId, dataKey: "company", payload: companyInfo as Record<string, unknown>, syncedAt: new Date() })
        .onConflictDoUpdate({
          target: [qbCache.realmId, qbCache.dataKey],
          set: { payload: companyInfo as Record<string, unknown>, syncedAt: new Date() },
        });
    } catch (e) {
      // Non-fatal — company name will show after first full sync
      console.warn("QB auto company fetch failed:", e);
    }

    return NextResponse.redirect(new URL("/quickbooks", req.url));
  } catch (error) {
    console.error("QB OAuth error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(new URL(`/quickbooks?error=${encodeURIComponent(msg)}`, req.url));
  }
}
