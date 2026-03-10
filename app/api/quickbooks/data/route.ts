import { NextRequest, NextResponse } from "next/server";
import {
  createOAuthClient,
  getTokens,
  isConnected,
  isTokenExpired,
  saveTokens,
} from "@/lib/quickbooks/client";
import QuickBooks from "node-quickbooks";

async function getQBClient() {
  if (!isConnected()) throw new Error("Not connected to QuickBooks");

  const tokens = getTokens();

  // Refresh token if expired
  if (isTokenExpired()) {
    const oauthClient = createOAuthClient();
    oauthClient.setToken({
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      realmId: tokens.realmId!,
    });
    const refreshed = await oauthClient.refresh();
    saveTokens(refreshed);
    return buildQBClient(getTokens());
  }

  return buildQBClient(tokens);
}

function buildQBClient(tokens: ReturnType<typeof getTokens>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (QuickBooks as any)(
    process.env.QB_CLIENT_ID!,
    process.env.QB_CLIENT_SECRET!,
    tokens.access_token!,
    false,
    tokens.realmId!,
    process.env.QB_ENVIRONMENT === "production" ? false : true,
    false,
    null,
    "2.0",
    tokens.refresh_token!
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function qbPromise<T>(qb: any, method: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    switch (type) {
      case "company": {
        const info = await qbPromise<Record<string, unknown>>(qb, "getCompanyInfo", getTokens().realmId!);
        return NextResponse.json({ type: "company", data: info });
      }

      case "pnl": {
        const startDate = searchParams.get("startDate") || "2025-01-01";
        const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0];
        const report = await qbPromise<Record<string, unknown>>(qb, "reportProfitAndLoss", {
          start_date: startDate,
          end_date: endDate,
          accounting_method: "Accrual",
        });
        return NextResponse.json({ type: "pnl", data: report });
      }

      case "balance_sheet": {
        const asOfDate = searchParams.get("date") || new Date().toISOString().split("T")[0];
        const report = await qbPromise<Record<string, unknown>>(qb, "reportBalanceSheet", {
          date_macro: "This Fiscal Year-to-date",
          as_of: asOfDate,
        });
        return NextResponse.json({ type: "balance_sheet", data: report });
      }

      case "accounts": {
        const accounts = await qbPromise<Record<string, unknown>>(qb, "findAccounts", [
          { field: "Active", value: "true", operator: "=" },
        ]);
        return NextResponse.json({ type: "accounts", data: accounts });
      }

      case "transactions": {
        const startDate = searchParams.get("startDate") || "2025-01-01";
        const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0];
        const txns = await qbPromise<Record<string, unknown>>(qb, "findTransactions", {
          startDate,
          endDate,
        });
        return NextResponse.json({ type: "transactions", data: txns });
      }

      case "invoices": {
        const invoices = await qbPromise<Record<string, unknown>>(qb, "findInvoices", [
          { field: "TxnDate", value: "2025-01-01", operator: ">=" },
        ]);
        return NextResponse.json({ type: "invoices", data: invoices });
      }

      case "vendors": {
        const vendors = await qbPromise<Record<string, unknown>>(qb, "findVendors", []);
        return NextResponse.json({ type: "vendors", data: vendors });
      }

      default:
        return NextResponse.json({ error: "Unknown data type" }, { status: 400 });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "QB error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
