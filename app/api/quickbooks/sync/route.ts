import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient, getTokens, saveTokens, isTokenExpired } from "@/lib/quickbooks/client";
import { db } from "@/lib/db";
import { qbCache } from "@/lib/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildQBClient(tokens: any) {
  const QuickBooks = (await import("node-quickbooks")).default;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (QuickBooks as any)(
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

const today = () => new Date().toISOString().split("T")[0];
const fiscalStart = () => `${new Date().getFullYear()}-01-01`;

export async function POST(req: NextRequest) {
  try {
    let body: { realmId?: string } = {};
    try { body = await req.json(); } catch { /* no body */ }

    let tokens = await getTokens(body.realmId);
    if (!tokens) return NextResponse.json({ error: "Not connected to QuickBooks" }, { status: 401 });

    // Refresh token if expired
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

    const qb = await buildQBClient(tokens!);
    const realmId = tokens!.realmId;
    const synced: string[] = [];
    const failed: string[] = [];

    const dataKeys: Array<{ key: string; fetch: () => Promise<unknown> }> = [
      { key: "company", fetch: () => qbCall(qb, "getCompanyInfo", realmId) },
      {
        key: "pnl",
        fetch: () =>
          qbCall(qb, "reportProfitAndLoss", {
            start_date: fiscalStart(),
            end_date: today(),
            accounting_method: "Accrual",
          }),
      },
      {
        key: "pnl_monthly",
        fetch: () =>
          qbCall(qb, "reportProfitAndLoss", {
            start_date: fiscalStart(),
            end_date: today(),
            accounting_method: "Accrual",
            summarize_column_by: "Month",
          }),
      },
      {
        key: "balance_sheet",
        fetch: () =>
          qbCall(qb, "reportBalanceSheet", {
            date_macro: "This Fiscal Year-to-date",
          }),
      },
      { key: "accounts", fetch: () => qbCall(qb, "findAccounts", [{ field: "Active", value: "true", operator: "=" }]) },
      {
        key: "invoices",
        fetch: () =>
          qbCall(qb, "findInvoices", [
            { field: "TxnDate", value: fiscalStart(), operator: ">=" },
            { field: "limit", value: "100", operator: "=" },
          ]),
      },
      { key: "vendors", fetch: () => qbCall(qb, "findVendors", [{ field: "Active", value: "true", operator: "=" }]) },
      { key: "customers", fetch: () => qbCall(qb, "findCustomers", [{ field: "Active", value: "true", operator: "=" }]) },
      {
        key: "trial_balance",
        fetch: () =>
          qbCall(qb, "reportTrialBalance", {
            start_date: fiscalStart(),
            end_date: today(),
            accounting_method: "Accrual",
          }),
      },
      {
        key: "vendor_expenses",
        fetch: () =>
          qbCall(qb, "reportVendorExpenses", {
            start_date: fiscalStart(),
            end_date: today(),
          }),
      },
      {
        key: "aged_receivables",
        fetch: () =>
          qbCall(qb, "reportAgedReceivableDetail", {
            date_macro: "Today",
          }),
      },
      {
        key: "aged_payables",
        fetch: () =>
          qbCall(qb, "reportAgedPayableDetail", {
            date_macro: "Today",
          }),
      },
    ];

    const results = await Promise.allSettled(dataKeys.map((d) => d.fetch()));

    for (let i = 0; i < dataKeys.length; i++) {
      const { key } = dataKeys[i];
      const result = results[i];
      if (result.status === "fulfilled") {
        await db
          .insert(qbCache)
          .values({ realmId, dataKey: key, payload: result.value as Record<string, unknown>, syncedAt: new Date() })
          .onConflictDoUpdate({
            target: [qbCache.realmId, qbCache.dataKey],
            set: { payload: result.value as Record<string, unknown>, syncedAt: new Date() },
          });
        synced.push(key);
      } else {
        console.error(`QB sync failed for ${key}:`, result.reason);
        failed.push(key);
      }
    }

    return NextResponse.json({ success: true, synced, failed, syncedAt: new Date().toISOString() });
  } catch (err) {
    console.error("QB sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
