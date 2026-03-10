// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

export function formatCurrency(value: number | string | undefined | null): string {
  const n = parseFloat(String(value ?? 0));
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Walk QB report rows to find a row by summary type
function findRowByType(rows: AnyObj[], type: string): AnyObj | null {
  for (const row of rows) {
    if (row.type === "Section" && row.Summary?.ColData) {
      if (row.Summary.ColData[0]?.value === type) return row;
    }
    if (row.type === "Data" && row.ColData) {
      if (row.ColData[0]?.value === type) return row;
    }
    if (row.Rows?.Row) {
      const found = findRowByType(row.Rows.Row, type);
      if (found) return found;
    }
  }
  return null;
}

function extractValue(row: AnyObj | null, colIndex = 1): number {
  if (!row) return 0;
  const colData = row.Summary?.ColData || row.ColData || [];
  return parseFloat(colData[colIndex]?.value ?? "0") || 0;
}

export interface PnLSummary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  expenses: number;
  netIncome: number;
  startDate: string;
  endDate: string;
}

export function parsePnLSummary(payload: AnyObj): PnLSummary {
  const rows: AnyObj[] = payload?.Rows?.Row ?? [];
  const header = payload?.Header ?? {};

  const revenueRow = findRowByType(rows, "Income") || findRowByType(rows, "Revenue");
  const cogsRow = findRowByType(rows, "Cost of Goods Sold");
  const grossRow = findRowByType(rows, "GrossProfit");
  const expensesRow = findRowByType(rows, "Expenses");
  const netRow = findRowByType(rows, "NetIncome");

  const revenue = extractValue(revenueRow);
  const cogs = extractValue(cogsRow);
  const grossProfit = extractValue(grossRow) || revenue - cogs;
  const expenses = extractValue(expensesRow);
  const netIncome = extractValue(netRow) || grossProfit - expenses;
  const grossMarginPct = revenue !== 0 ? (grossProfit / revenue) * 100 : 0;

  return {
    revenue,
    cogs,
    grossProfit,
    grossMarginPct,
    expenses,
    netIncome,
    startDate: header.StartPeriod ?? "",
    endDate: header.EndPeriod ?? "",
  };
}

export interface BalanceSheetSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  currentAssets: number;
  currentLiabilities: number;
  asOf: string;
}

export function parseBalanceSheet(payload: AnyObj): BalanceSheetSummary {
  const rows: AnyObj[] = payload?.Rows?.Row ?? [];
  const header = payload?.Header ?? {};

  const assetsRow = findRowByType(rows, "TotalAssets") || findRowByType(rows, "Total Assets");
  const liabRow = findRowByType(rows, "TotalLiabilities") || findRowByType(rows, "Total Liabilities");
  const equityRow = findRowByType(rows, "TotalEquity") || findRowByType(rows, "Total Equity");
  const curAssetsRow = findRowByType(rows, "CurrentAssets") || findRowByType(rows, "Total Current Assets");
  const curLiabRow = findRowByType(rows, "TotalCurrentLiabilities") || findRowByType(rows, "Total Current Liabilities");

  return {
    totalAssets: extractValue(assetsRow),
    totalLiabilities: extractValue(liabRow),
    totalEquity: extractValue(equityRow),
    currentAssets: extractValue(curAssetsRow),
    currentLiabilities: extractValue(curLiabRow),
    asOf: header.ReportName ? (header.EndPeriod ?? "") : "",
  };
}

export function deriveInvoiceStatus(
  balance: number,
  dueDate: string
): "Paid" | "Open" | "Overdue" {
  if (balance === 0) return "Paid";
  if (dueDate && new Date(dueDate) < new Date()) return "Overdue";
  return "Open";
}
