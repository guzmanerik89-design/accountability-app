import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient, saveTokens } from "@/lib/quickbooks/client";

export async function GET(req: NextRequest) {
  const url = req.url;
  const oauthClient = createOAuthClient();

  try {
    const authResponse = await oauthClient.createToken(url);
    saveTokens(authResponse);
    return NextResponse.redirect(new URL("/quickbooks", req.url));
  } catch (error) {
    console.error("QB OAuth error:", error);
    return NextResponse.redirect(
      new URL("/quickbooks?error=auth_failed", req.url)
    );
  }
}
