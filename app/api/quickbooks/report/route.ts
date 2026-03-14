import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient, getTokens, isTokenExpired, saveTokens } from "@/lib/quickbooks/client";

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const report = searchParams.get("report");
  const realmId = searchParams.get("realmId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const method = searchParams.get("method") || "Accrual";

  // Input validation
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const allowedReports = ["pnl", "pnl_monthly", "balance_sheet", "trial_balance", "cash_flow"];
  const allowedMethods = ["Accrual", "Cash"];

  if (!report || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }
  if (!allowedReports.includes(report)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return NextResponse.json({ error: "Invalid date format (use YYYY-MM-DD)" }, { status: 400 });
  }
  if (realmId && !/^\d+$/.test(realmId)) {
    return NextResponse.json({ error: "Invalid realmId" }, { status: 400 });
  }
  if (!allowedMethods.includes(method)) {
    return NextResponse.json({ error: "Invalid accounting method" }, { status: 400 });
  }

  try {
    let tokens = await getTokens(realmId || undefined);
    if (!tokens) return NextResponse.json({ error: "Not connected" }, { status: 401 });

    if (isTokenExpired(tokens)) {
      const oauthClient = createOAuthClient();
      oauthClient.setToken({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        realmId: tokens.realmId,
      });
      const refreshed = await oauthClient.refresh();
      await saveTokens(refreshed);
      tokens = await getTokens(realmId || undefined);
    }

    const qb = await buildQBClient(tokens!);

    switch (report) {
      case "pnl": {
        const data = await qbCall(qb, "reportProfitAndLoss", {
          start_date: startDate,
          end_date: endDate,
          accounting_method: method,
        });
        return NextResponse.json({ report, data });
      }
      case "pnl_monthly": {
        const data = await qbCall(qb, "reportProfitAndLoss", {
          start_date: startDate,
          end_date: endDate,
          accounting_method: method,
          summarize_column_by: "Month",
        });
        return NextResponse.json({ report, data });
      }
      case "balance_sheet": {
        const data = await qbCall(qb, "reportBalanceSheet", {
          start_date: startDate,
          end_date: endDate,
          accounting_method: method,
        });
        return NextResponse.json({ report, data });
      }
      case "trial_balance": {
        const data = await qbCall(qb, "reportTrialBalance", {
          start_date: startDate,
          end_date: endDate,
          accounting_method: method,
        });
        return NextResponse.json({ report, data });
      }
      case "cash_flow": {
        const data = await qbCall(qb, "reportCashFlow", {
          start_date: startDate,
          end_date: endDate,
        });
        return NextResponse.json({ report, data });
      }
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
