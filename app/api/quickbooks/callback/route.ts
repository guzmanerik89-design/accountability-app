import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient, saveTokens, getTokens } from "@/lib/quickbooks/client";
import { db } from "@/lib/db";
import { qbCache } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const url = req.url;
  const oauthClient = createOAuthClient();

  try {
    const authResponse = await oauthClient.createToken(url);
    await saveTokens(authResponse);

    // Auto-fetch company info right after connecting so the name shows immediately
    try {
      const tokens = await getTokens(authResponse.token.realmId);
      if (tokens) {
        const QuickBooks = (await import("node-quickbooks")).default;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const qb = new (QuickBooks as any)(
          process.env.QB_CLIENT_ID!,
          process.env.QB_CLIENT_SECRET!,
          tokens.accessToken,
          false,
          tokens.realmId,
          process.env.QB_ENVIRONMENT === "production" ? false : true,
          false,
          null,
          "2.0",
          tokens.refreshToken
        );

        const companyInfo = await new Promise((resolve, reject) => {
          qb.getCompanyInfo(tokens.realmId, (err: Error, data: unknown) => {
            if (err) reject(err);
            else resolve(data);
          });
        });

        await db
          .insert(qbCache)
          .values({ realmId: tokens.realmId, dataKey: "company", payload: companyInfo as Record<string, unknown>, syncedAt: new Date() })
          .onConflictDoUpdate({
            target: [qbCache.realmId, qbCache.dataKey],
            set: { payload: companyInfo as Record<string, unknown>, syncedAt: new Date() },
          });
      }
    } catch (e) {
      // Non-fatal — company name will show after first full sync
      console.warn("QB auto company fetch failed:", e);
    }

    return NextResponse.redirect(new URL("/quickbooks", req.url));
  } catch (error) {
    console.error("QB OAuth error:", error);
    return NextResponse.redirect(new URL("/quickbooks?error=auth_failed", req.url));
  }
}
