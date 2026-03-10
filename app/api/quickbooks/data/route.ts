import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient, getTokens, isConnected, isTokenExpired, saveTokens } from "@/lib/quickbooks/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getQBClient(): Promise<any> {
  if (!(await isConnected())) throw new Error("Not connected to QuickBooks");

  let tokens = await getTokens();
  if (!tokens) throw new Error("No tokens found");

  if (isTokenExpired(tokens)) {
    const oauthClient = createOAuthClient();
    oauthClient.setToken({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      realmId: tokens.realmId,
    });
    const refreshed = await oauthClient.refresh();
    await saveTokens(refreshed);
    tokens = await getTokens();
  }

  const QuickBooks = (await import("node-quickbooks")).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (QuickBooks as any)(
    process.env.QB_CLIENT_ID!,
    process.env.QB_CLIENT_SECRET!,
    tokens!.accessToken,
    false,
    tokens!.realmId,
    process.env.QB_ENVIRONMENT === "production" ? false : true,
    false,
    null,
    "2.0",
    tokens!.refreshToken
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function qbCall<T>(qb: any, method: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    qb[method](...args, (err: Error, data: T) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    const qb = await getQBClient();
    const tokens = await getTokens();

    switch (type) {
      case "company":
        return NextResponse.json({ type, data: await qbCall(qb, "getCompanyInfo", tokens!.realmId) });
      case "pnl": {
        const data = await qbCall(qb, "reportProfitAndLoss", {
          start_date: searchParams.get("startDate") || "2025-01-01",
          end_date: searchParams.get("endDate") || new Date().toISOString().split("T")[0],
          accounting_method: "Accrual",
        });
        return NextResponse.json({ type, data });
      }
      case "balance_sheet":
        return NextResponse.json({ type, data: await qbCall(qb, "reportBalanceSheet", { date_macro: "This Fiscal Year-to-date" }) });
      case "accounts":
        return NextResponse.json({ type, data: await qbCall(qb, "findAccounts", [{ field: "Active", value: "true", operator: "=" }]) });
      case "invoices":
        return NextResponse.json({ type, data: await qbCall(qb, "findInvoices", [{ field: "TxnDate", value: "2025-01-01", operator: ">=" }]) });
      case "vendors":
        return NextResponse.json({ type, data: await qbCall(qb, "findVendors", []) });
      default:
        return NextResponse.json({ error: "Unknown data type" }, { status: 400 });
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "QB error" }, { status: 500 });
  }
}
