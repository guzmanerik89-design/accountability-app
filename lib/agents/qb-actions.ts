import { createOAuthClient, getTokens, saveTokens, isTokenExpired } from "@/lib/quickbooks/client";

// ─── QB Client Builder ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getQBClient(realmId: string): Promise<any> {
  let tokens = await getTokens(realmId);
  if (!tokens) throw new Error(`No QuickBooks tokens found for realmId: ${realmId}`);

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
    tokens = await getTokens(realmId);
    if (!tokens) throw new Error("Failed to refresh QuickBooks tokens");
  }

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

// ─── QB Callback Promisifier ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function qbCall<T>(qb: any, method: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    qb[method](...args, (err: Error, data: T) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

// ─── Categorize a Purchase ───────────────────────────────────────────

export async function categorizePurchase(
  realmId: string,
  purchaseId: string,
  accountId: string,
  accountName: string
): Promise<void> {
  const qb = await getQBClient(realmId);

  // 1. Get the existing purchase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const purchase = await qbCall<any>(qb, "getPurchase", purchaseId);

  // 2. Update the Line[0].AccountBasedExpenseLineDetail.AccountRef
  if (purchase.Line && purchase.Line.length > 0) {
    for (const line of purchase.Line) {
      if (line.DetailType === "AccountBasedExpenseLineDetail" && line.AccountBasedExpenseLineDetail) {
        line.AccountBasedExpenseLineDetail.AccountRef = {
          value: accountId,
          name: accountName,
        };
      }
    }
  }

  // 3. Save — must include Id and SyncToken
  await qbCall(qb, "updatePurchase", purchase);
}

// ─── Categorize a Deposit ────────────────────────────────────────────

export async function categorizeDeposit(
  realmId: string,
  depositId: string,
  accountId: string,
  accountName: string
): Promise<void> {
  const qb = await getQBClient(realmId);

  // 1. Get the existing deposit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deposit = await qbCall<any>(qb, "getDeposit", depositId);

  // 2. Update the line item account
  if (deposit.Line && deposit.Line.length > 0) {
    for (const line of deposit.Line) {
      if (line.DetailType === "DepositLineDetail" && line.DepositLineDetail) {
        line.DepositLineDetail.AccountRef = {
          value: accountId,
          name: accountName,
        };
      }
    }
  }

  // 3. Save
  await qbCall(qb, "updateDeposit", deposit);
}

// ─── Create Journal Entry ────────────────────────────────────────────

export async function createJournalEntry(
  realmId: string,
  entry: {
    date: string;
    memo: string;
    lines: Array<{
      accountId: string;
      accountName: string;
      amount: number;
      type: "Debit" | "Credit";
    }>;
    isAdjusting?: boolean;
  }
): Promise<{ id: string }> {
  const qb = await getQBClient(realmId);

  const journalEntry = {
    TxnDate: entry.date,
    PrivateNote: entry.memo,
    Adjustment: entry.isAdjusting ?? true,
    Line: entry.lines.map((line) => ({
      DetailType: "JournalEntryLineDetail",
      Amount: Math.abs(line.amount),
      Description: entry.memo,
      JournalEntryLineDetail: {
        PostingType: line.type,
        AccountRef: {
          value: line.accountId,
          name: line.accountName,
        },
      },
    })),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await qbCall<any>(qb, "createJournalEntry", journalEntry);
  return { id: result.Id || result.id || "unknown" };
}

// ─── Update Vendor 1099 Tracking ─────────────────────────────────────

export async function updateVendor1099(
  realmId: string,
  vendorId: string,
  track1099: boolean
): Promise<void> {
  const qb = await getQBClient(realmId);

  // 1. Get vendor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vendor = await qbCall<any>(qb, "getVendor", vendorId);

  // 2. Set Vendor1099
  vendor.Vendor1099 = track1099;

  // 3. Update
  await qbCall(qb, "updateVendor", vendor);
}

// ─── Get Uncategorized Transactions ──────────────────────────────────

export interface UncategorizedTransaction {
  id: string;
  type: "Purchase" | "Deposit";
  date: string;
  amount: number;
  vendorName: string;
  description: string;
  currentAccount: string;
}

export async function getUncategorizedTransactions(
  realmId: string
): Promise<UncategorizedTransaction[]> {
  const qb = await getQBClient(realmId);
  const results: UncategorizedTransaction[] = [];

  // 1. Find "Uncategorized Expense", "Uncategorized Income", "Ask My Accountant" account IDs
  const uncatNames = ["Uncategorized Expense", "Uncategorized Income", "Ask My Accountant"];
  const uncatAccountIds: Array<{ id: string; name: string }> = [];

  for (const name of uncatNames) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accountResult = await qbCall<any>(qb, "findAccounts", [
        { field: "Name", value: name, operator: "=" },
      ]);
      const accounts = accountResult?.QueryResponse?.Account ?? [];
      for (const acct of accounts) {
        uncatAccountIds.push({ id: acct.Id, name: acct.Name });
      }
    } catch {
      // Account may not exist — skip
    }
  }

  if (uncatAccountIds.length === 0) {
    return results;
  }

  // 2. Query purchases referencing those accounts
  for (const acct of uncatAccountIds) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const purchaseResult = await qbCall<any>(qb, "findPurchases", [
        { field: "AccountRef", value: acct.id, operator: "=" },
        { field: "limit", value: "100" },
      ]);
      const purchases = purchaseResult?.QueryResponse?.Purchase ?? [];
      for (const p of purchases) {
        // Check if any line references an uncategorized account
        const hasUncatLine = (p.Line ?? []).some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (line: any) =>
            line.AccountBasedExpenseLineDetail?.AccountRef?.value &&
            uncatAccountIds.some((u) => u.id === line.AccountBasedExpenseLineDetail.AccountRef.value)
        );

        if (hasUncatLine || true) {
          // The purchase itself is linked to an uncategorized account
          results.push({
            id: p.Id,
            type: "Purchase",
            date: p.TxnDate || "",
            amount: parseFloat(p.TotalAmt ?? "0"),
            vendorName: p.EntityRef?.name || "Unknown Vendor",
            description:
              p.Line?.[0]?.Description ||
              p.PrivateNote ||
              `${p.PaymentType || "Payment"} - ${p.EntityRef?.name || "Unknown"}`,
            currentAccount: acct.name,
          });
        }
      }
    } catch (err) {
      console.error(`Failed to query purchases for account ${acct.name}:`, err);
    }
  }

  // 3. Query deposits referencing uncategorized income
  for (const acct of uncatAccountIds) {
    if (!acct.name.toLowerCase().includes("income")) continue;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const depositResult = await qbCall<any>(qb, "findDeposits", [
        { field: "limit", value: "100" },
      ]);
      const deposits = depositResult?.QueryResponse?.Deposit ?? [];
      for (const d of deposits) {
        const hasUncatLine = (d.Line ?? []).some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (line: any) =>
            line.DepositLineDetail?.AccountRef?.value &&
            uncatAccountIds.some((u) => u.id === line.DepositLineDetail.AccountRef.value)
        );

        if (hasUncatLine) {
          results.push({
            id: d.Id,
            type: "Deposit",
            date: d.TxnDate || "",
            amount: parseFloat(d.TotalAmt ?? "0"),
            vendorName: d.Line?.[0]?.DepositLineDetail?.Entity?.name || "Unknown",
            description: d.PrivateNote || d.Line?.[0]?.Description || "Deposit",
            currentAccount: acct.name,
          });
        }
      }
    } catch (err) {
      console.error(`Failed to query deposits for account ${acct.name}:`, err);
    }
  }

  return results;
}

// ─── Get Chart of Accounts ───────────────────────────────────────────

export interface ChartOfAccountsEntry {
  id: string;
  name: string;
  type: string;
  subType: string;
  active: boolean;
}

export async function getChartOfAccounts(
  realmId: string
): Promise<ChartOfAccountsEntry[]> {
  const qb = await getQBClient(realmId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await qbCall<any>(qb, "findAccounts", [
    { field: "Active", value: "true", operator: "=" },
  ]);

  const accounts = result?.QueryResponse?.Account ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return accounts.map((a: any) => ({
    id: a.Id,
    name: a.Name,
    type: a.AccountType || "",
    subType: a.AccountSubType || "",
    active: a.Active !== false,
  }));
}
