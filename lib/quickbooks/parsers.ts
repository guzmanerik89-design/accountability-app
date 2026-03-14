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

// ─── Entity Type Detection ───────────────────────────────────────────

export type EntityType = "Sole Proprietorship" | "S-Corp" | "C-Corp" | "Partnership" | "LLC" | "Nonprofit" | "Unknown";
export type TaxForm = "Schedule C" | "Form 1120-S" | "Form 1120" | "Form 1065" | "Form 990" | "Unknown";

export interface CompanyProfile {
  companyName: string;
  legalName: string;
  entityType: EntityType;
  taxForm: TaxForm;
  industry: string;
  ein: string;
  fiscalYearStart: string;
  city: string;
  state: string;
  country: string;
  companyStartDate: string;
}

const ENTITY_MAP: Record<string, EntityType> = {
  "sole proprietor": "Sole Proprietorship",
  "sole proprietorship": "Sole Proprietorship",
  "sole prop": "Sole Proprietorship",
  "s corporation": "S-Corp",
  "s-corp": "S-Corp",
  "s corp": "S-Corp",
  "c corporation": "C-Corp",
  "c-corp": "C-Corp",
  "c corp": "C-Corp",
  "partnership": "Partnership",
  "business partnership": "Partnership",
  "limited liability": "LLC",
  "llc": "LLC",
  "nonprofit": "Nonprofit",
  "non-profit": "Nonprofit",
  "nonprofit organization": "Nonprofit",
  "tax-exempt": "Nonprofit",
};

const TAX_FORM_MAP: Record<EntityType, TaxForm> = {
  "Sole Proprietorship": "Schedule C",
  "S-Corp": "Form 1120-S",
  "C-Corp": "Form 1120",
  "Partnership": "Form 1065",
  "LLC": "Unknown", // depends on election
  "Nonprofit": "Form 990",
  "Unknown": "Unknown",
};

export function parseCompanyProfile(companyInfo: AnyObj | undefined | null): CompanyProfile {
  if (!companyInfo) {
    return {
      companyName: "", legalName: "", entityType: "Unknown", taxForm: "Unknown",
      industry: "", ein: "", fiscalYearStart: "", city: "", state: "", country: "",
      companyStartDate: "",
    };
  }

  // Extract entity type from NameValue pairs
  const nameValues: AnyObj[] = companyInfo.NameValue ?? [];
  let companyType = "";
  let industryType = "";
  for (const nv of nameValues) {
    if (nv.Name === "CompanyType") companyType = nv.Value ?? "";
    if (nv.Name === "QBOIndustryType") industryType = nv.Value ?? "";
  }

  let entityType: EntityType = "Unknown";
  const lowerType = companyType.toLowerCase();
  for (const [key, value] of Object.entries(ENTITY_MAP)) {
    if (lowerType.includes(key)) {
      entityType = value;
      break;
    }
  }

  const taxForm = TAX_FORM_MAP[entityType];

  return {
    companyName: companyInfo.CompanyName ?? "",
    legalName: companyInfo.LegalName ?? "",
    entityType,
    taxForm,
    industry: industryType || companyType,
    ein: companyInfo.EIN ?? "",
    fiscalYearStart: companyInfo.FiscalYearStartMonth ?? "",
    city: companyInfo.LegalAddr?.City ?? "",
    state: companyInfo.LegalAddr?.CountrySubDivisionCode ?? "",
    country: companyInfo.Country ?? companyInfo.LegalAddr?.Country ?? "",
    companyStartDate: companyInfo.CompanyStartDate ?? "",
  };
}

// ─── P&L Summary ────────────────────────────────────────────────────

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
    revenue, cogs, grossProfit, grossMarginPct, expenses, netIncome,
    startDate: header.StartPeriod ?? "",
    endDate: header.EndPeriod ?? "",
  };
}

// ─── P&L Entity-Aware Line Items ─────────────────────────────────────

export interface PnLEntityInsights {
  officerCompensation: number | null;  // S-Corp
  ownerDraws: number | null;           // Sole Prop
  guaranteedPayments: number | null;   // Partnership
  dividendsPaid: number | null;        // C-Corp
  payrollExpenses: number | null;
}

export function parsePnLEntityInsights(pnlPayload: AnyObj | null, accountsPayload: AnyObj | null, entityType: EntityType): PnLEntityInsights {
  const result: PnLEntityInsights = {
    officerCompensation: null,
    ownerDraws: null,
    guaranteedPayments: null,
    dividendsPaid: null,
    payrollExpenses: null,
  };

  // Search P&L rows for specific line items
  const rows: AnyObj[] = pnlPayload?.Rows?.Row ?? [];

  const officerRow = findRowByType(rows, "Officer Compensation") || findRowByType(rows, "Officers Compensation");
  if (officerRow) result.officerCompensation = extractValue(officerRow);

  const payrollRow = findRowByType(rows, "Payroll Expenses") || findRowByType(rows, "Payroll");
  if (payrollRow) result.payrollExpenses = extractValue(payrollRow);

  const guaranteedRow = findRowByType(rows, "Guaranteed Payments");
  if (guaranteedRow) result.guaranteedPayments = extractValue(guaranteedRow);

  // For draws/distributions, look at accounts (equity accounts)
  const accounts: AnyObj[] = accountsPayload?.QueryResponse?.Account ?? [];
  const equityAccounts = accounts.filter((a: AnyObj) => a.AccountType === "Equity");

  if (entityType === "Sole Proprietorship") {
    const drawAccounts = equityAccounts.filter((a: AnyObj) =>
      /draw|personal|owner.*withdraw/i.test(a.Name ?? "")
    );
    if (drawAccounts.length > 0) {
      result.ownerDraws = drawAccounts.reduce((sum: number, a: AnyObj) =>
        sum + Math.abs(parseFloat(a.CurrentBalance ?? "0")), 0);
    }
  }

  return result;
}

// ─── Balance Sheet ──────────────────────────────────────────────────

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

// ─── Equity Analysis by Entity Type ─────────────────────────────────

export interface EquityBreakdown {
  label: string;
  accounts: Array<{ name: string; subType: string; balance: number }>;
}

const EQUITY_LABELS: Record<EntityType, Record<string, string>> = {
  "Sole Proprietorship": {
    OwnersEquity: "Capital del Propietario",
    RetainedEarnings: "Utilidades Retenidas",
    OpeningBalanceEquity: "Equity de Apertura",
  },
  "S-Corp": {
    CommonStock: "Capital Social",
    PaidInCapitalOrSurplus: "Capital Pagado Adicional",
    AccumulatedAdjustment: "AAA (Ajustes Acumulados)",
    RetainedEarnings: "Utilidades Retenidas",
    OpeningBalanceEquity: "Equity de Apertura",
  },
  "C-Corp": {
    CommonStock: "Acciones Comunes",
    PreferredStock: "Acciones Preferentes",
    PaidInCapitalOrSurplus: "Capital Pagado Adicional",
    TreasuryStock: "Acciones en Tesorería",
    RetainedEarnings: "Utilidades Retenidas",
    OpeningBalanceEquity: "Equity de Apertura",
  },
  "Partnership": {
    PartnersEquity: "Capital de Socios",
    PartnerContributions: "Aportaciones de Socios",
    PartnerDistributions: "Distribuciones a Socios",
    RetainedEarnings: "Utilidades Retenidas",
    OpeningBalanceEquity: "Equity de Apertura",
  },
  "LLC": {
    OwnersEquity: "Capital de Miembros",
    RetainedEarnings: "Utilidades Retenidas",
    OpeningBalanceEquity: "Equity de Apertura",
  },
  "Nonprofit": {
    RetainedEarnings: "Activos Netos",
    OpeningBalanceEquity: "Equity de Apertura",
  },
  "Unknown": {
    RetainedEarnings: "Utilidades Retenidas",
    OpeningBalanceEquity: "Equity de Apertura",
  },
};

export function parseEquityBreakdown(accountsPayload: AnyObj | null, entityType: EntityType): EquityBreakdown {
  const accounts: AnyObj[] = accountsPayload?.QueryResponse?.Account ?? [];
  const equityAccounts = accounts.filter((a: AnyObj) => a.AccountType === "Equity");
  const labels = EQUITY_LABELS[entityType] || EQUITY_LABELS["Unknown"];

  const mapped = equityAccounts.map((a: AnyObj) => ({
    name: a.Name ?? "Unknown",
    subType: labels[a.AccountSubType] ?? a.AccountSubType ?? "Otro",
    balance: parseFloat(a.CurrentBalance ?? "0"),
  }));

  const entityLabels: Record<EntityType, string> = {
    "Sole Proprietorship": "Equity del Propietario",
    "S-Corp": "Equity de Accionistas",
    "C-Corp": "Equity de Accionistas",
    "Partnership": "Equity de Socios",
    "LLC": "Equity de Miembros",
    "Nonprofit": "Activos Netos",
    "Unknown": "Equity",
  };

  return { label: entityLabels[entityType], accounts: mapped };
}

// ─── 1099-NEC Analysis ──────────────────────────────────────────────

export interface Vendor1099 {
  id: string;
  name: string;
  totalPaid: number;
  hasTIN: boolean;
  hasAddress: boolean;
  needs1099: boolean;  // >= $600 and flagged
  address: string;
}

export function parse1099Vendors(
  vendorsPayload: AnyObj | null,
  vendorExpensesPayload: AnyObj | null
): Vendor1099[] {
  const vendors: AnyObj[] = vendorsPayload?.QueryResponse?.Vendor ?? [];
  const flaggedVendors = vendors.filter((v: AnyObj) => v.Vendor1099 === true);

  // Parse vendor expenses report to get totals
  const expenseTotals: Record<string, number> = {};
  if (vendorExpensesPayload?.Rows?.Row) {
    for (const row of vendorExpensesPayload.Rows.Row) {
      if (row.type === "Section" && row.Header?.ColData?.[0]?.value) {
        const vendorName = row.Header.ColData[0].value;
        const summaryValue = row.Summary?.ColData;
        if (summaryValue) {
          // Last column is usually total
          const total = parseFloat(summaryValue[summaryValue.length - 1]?.value ?? "0");
          expenseTotals[vendorName] = Math.abs(total);
        }
      }
      if (row.type === "Data" && row.ColData?.[0]?.value) {
        const vendorName = row.ColData[0].value;
        const total = parseFloat(row.ColData[row.ColData.length - 1]?.value ?? "0");
        expenseTotals[vendorName] = Math.abs(total);
      }
    }
  }

  return flaggedVendors.map((v: AnyObj) => {
    const displayName: string = v.DisplayName ?? v.CompanyName ?? v.GivenName ?? "Unknown";
    const totalPaid = expenseTotals[displayName] ?? 0;
    const addr = v.BillAddr;
    const hasAddress = !!(addr && (addr.Line1 || addr.City));
    const addressStr = addr
      ? [addr.Line1, addr.City, addr.CountrySubDivisionCode, addr.PostalCode].filter(Boolean).join(", ")
      : "";

    return {
      id: v.Id ?? "",
      name: displayName,
      totalPaid,
      hasTIN: !!(v.TaxIdentifier && v.TaxIdentifier.length > 0),
      hasAddress,
      needs1099: totalPaid >= 600,
      address: addressStr,
    };
  });
}

// ─── Tax Readiness ──────────────────────────────────────────────────

export interface TaxReadinessCheck {
  id: string;
  label: string;
  description: string;
  status: "pass" | "warning" | "fail" | "info";
  detail?: string;
}

export function assessTaxReadiness(
  cache: Record<string, { payload: AnyObj; syncedAt: string }>,
  entityType: EntityType
): TaxReadinessCheck[] {
  const checks: TaxReadinessCheck[] = [];

  // 1. Check for uncategorized income/expense accounts
  const accounts: AnyObj[] = cache.accounts?.payload?.QueryResponse?.Account ?? [];
  const uncategorizedAccounts = accounts.filter((a: AnyObj) =>
    /uncategorized|uncat|ask my accountant/i.test(a.Name ?? "")
  );
  const uncatWithBalance = uncategorizedAccounts.filter(
    (a: AnyObj) => Math.abs(parseFloat(a.CurrentBalance ?? "0")) > 0
  );
  checks.push({
    id: "uncategorized",
    label: "Transacciones sin categorizar",
    description: "Cuentas como 'Uncategorized Income/Expense' o 'Ask My Accountant' deben tener balance $0",
    status: uncatWithBalance.length > 0 ? "fail" : "pass",
    detail: uncatWithBalance.length > 0
      ? `${uncatWithBalance.length} cuenta(s) con balance: ${uncatWithBalance.map((a: AnyObj) => `${a.Name}: ${formatCurrency(a.CurrentBalance)}`).join(", ")}`
      : "Todas las transacciones están categorizadas",
  });

  // 2. Check Opening Balance Equity
  const obeAccount = accounts.find(
    (a: AnyObj) => a.AccountSubType === "OpeningBalanceEquity" || /opening balance/i.test(a.Name ?? "")
  );
  const obeBalance = parseFloat(obeAccount?.CurrentBalance ?? "0");
  checks.push({
    id: "opening_balance",
    label: "Opening Balance Equity",
    description: "Esta cuenta debe tener balance $0 antes de cerrar el año",
    status: Math.abs(obeBalance) > 0.01 ? "warning" : "pass",
    detail: Math.abs(obeBalance) > 0.01
      ? `Balance actual: ${formatCurrency(obeBalance)} — necesita reclasificarse`
      : "Balance en $0",
  });

  // 3. Check unapplied payments (from invoices)
  const invoices: AnyObj[] = cache.invoices?.payload?.QueryResponse?.Invoice ?? [];
  const overdueInvoices = invoices.filter((i: AnyObj) => {
    const bal = parseFloat(i.Balance ?? "0");
    return bal > 0 && i.DueDate && new Date(i.DueDate) < new Date();
  });
  checks.push({
    id: "overdue_invoices",
    label: "Facturas vencidas",
    description: "Facturas pasadas de fecha que podrían necesitar write-off o seguimiento",
    status: overdueInvoices.length > 5 ? "fail" : overdueInvoices.length > 0 ? "warning" : "pass",
    detail: overdueInvoices.length > 0
      ? `${overdueInvoices.length} factura(s) vencida(s) por ${formatCurrency(overdueInvoices.reduce((s: number, i: AnyObj) => s + parseFloat(i.Balance ?? "0"), 0))}`
      : "No hay facturas vencidas",
  });

  // 4. 1099 vendor readiness
  const vendors: AnyObj[] = cache.vendors?.payload?.QueryResponse?.Vendor ?? [];
  const flagged1099 = vendors.filter((v: AnyObj) => v.Vendor1099 === true);
  const missingTIN = flagged1099.filter((v: AnyObj) => !v.TaxIdentifier || v.TaxIdentifier.length === 0);
  const missingAddr = flagged1099.filter(
    (v: AnyObj) => !v.BillAddr || (!v.BillAddr.Line1 && !v.BillAddr.City)
  );
  checks.push({
    id: "1099_tin",
    label: "W-9 / TIN de vendors 1099",
    description: "Todos los vendors marcados para 1099 necesitan TIN en archivo",
    status: missingTIN.length > 0 ? "fail" : flagged1099.length === 0 ? "info" : "pass",
    detail: missingTIN.length > 0
      ? `${missingTIN.length} vendor(s) sin TIN: ${missingTIN.map((v: AnyObj) => v.DisplayName).join(", ")}`
      : flagged1099.length === 0 ? "No hay vendors marcados para 1099" : `${flagged1099.length} vendor(s) con TIN completo`,
  });

  if (missingAddr.length > 0) {
    checks.push({
      id: "1099_address",
      label: "Dirección de vendors 1099",
      description: "Se necesita dirección para enviar 1099-NEC",
      status: "warning",
      detail: `${missingAddr.length} vendor(s) sin dirección: ${missingAddr.map((v: AnyObj) => v.DisplayName).join(", ")}`,
    });
  }

  // 5. Entity-specific checks
  if (entityType === "S-Corp") {
    // Check for officer compensation
    const pnlRows: AnyObj[] = cache.pnl?.payload?.Rows?.Row ?? [];
    const officerRow = findRowByType(pnlRows, "Officer Compensation") || findRowByType(pnlRows, "Officers Compensation");
    const officerComp = extractValue(officerRow);
    checks.push({
      id: "scorp_officer_comp",
      label: "Compensación de Oficial (S-Corp)",
      description: "S-Corp requiere salario razonable para accionistas-empleados",
      status: officerComp > 0 ? "pass" : "fail",
      detail: officerComp > 0
        ? `Compensación de oficial: ${formatCurrency(officerComp)}`
        : "No se encontró compensación de oficial — IRS requiere salario razonable",
    });

    // Check shareholder distributions vs salary
    const equityAccounts = accounts.filter((a: AnyObj) => a.AccountType === "Equity");
    const distAccounts = equityAccounts.filter((a: AnyObj) =>
      /distribution|shareholder.*draw/i.test(a.Name ?? "")
    );
    const totalDist = distAccounts.reduce(
      (s: number, a: AnyObj) => s + Math.abs(parseFloat(a.CurrentBalance ?? "0")), 0
    );
    if (totalDist > 0 && officerComp > 0) {
      const ratio = totalDist / officerComp;
      checks.push({
        id: "scorp_dist_ratio",
        label: "Ratio Distribuciones vs Salario",
        description: "Las distribuciones desproporcionadas respecto al salario son señal roja del IRS",
        status: ratio > 3 ? "warning" : "pass",
        detail: `Distribuciones: ${formatCurrency(totalDist)} / Salario: ${formatCurrency(officerComp)} (ratio: ${ratio.toFixed(1)}x)`,
      });
    }
  }

  if (entityType === "Partnership") {
    const equityAccounts = accounts.filter((a: AnyObj) => a.AccountType === "Equity");
    const partnerAccounts = equityAccounts.filter((a: AnyObj) =>
      /partner/i.test(a.Name ?? "") || /partner/i.test(a.AccountSubType ?? "")
    );
    checks.push({
      id: "partnership_equity",
      label: "Cuentas de capital por socio",
      description: "Cada socio debe tener cuentas de equity separadas para K-1",
      status: partnerAccounts.length > 0 ? "pass" : "warning",
      detail: partnerAccounts.length > 0
        ? `${partnerAccounts.length} cuenta(s) de socio encontrada(s)`
        : "No se encontraron cuentas de capital por socio — necesario para K-1s",
    });
  }

  if (entityType === "Sole Proprietorship") {
    const equityAccounts = accounts.filter((a: AnyObj) => a.AccountType === "Equity");
    const drawAccounts = equityAccounts.filter((a: AnyObj) =>
      /draw|personal|withdraw/i.test(a.Name ?? "")
    );
    checks.push({
      id: "sole_prop_draws",
      label: "Owner's Draws",
      description: "Retiros del propietario (no son gastos deducibles, van en Schedule C como draws)",
      status: "info",
      detail: drawAccounts.length > 0
        ? `${drawAccounts.length} cuenta(s) de retiro: ${drawAccounts.map((a: AnyObj) => `${a.Name}: ${formatCurrency(a.CurrentBalance)}`).join(", ")}`
        : "No se encontraron cuentas de Owner's Draw",
    });
  }

  // 6. Balance sheet check - Assets = Liabilities + Equity
  if (cache.balance_sheet?.payload) {
    const bs = parseBalanceSheet(cache.balance_sheet.payload);
    const diff = Math.abs(bs.totalAssets - (bs.totalLiabilities + bs.totalEquity));
    checks.push({
      id: "bs_equation",
      label: "Ecuación contable (A = L + E)",
      description: "El balance general debe cuadrar",
      status: diff > 1 ? "fail" : "pass",
      detail: diff > 1
        ? `Descuadre de ${formatCurrency(diff)} — Activos: ${formatCurrency(bs.totalAssets)}, L+E: ${formatCurrency(bs.totalLiabilities + bs.totalEquity)}`
        : `Cuadrado: ${formatCurrency(bs.totalAssets)}`,
    });
  }

  // 7. Check for negative bank balances
  const bankAccounts = accounts.filter((a: AnyObj) =>
    a.AccountType === "Bank" || a.AccountSubType === "Checking" || a.AccountSubType === "Savings"
  );
  const negativeBank = bankAccounts.filter((a: AnyObj) => parseFloat(a.CurrentBalance ?? "0") < 0);
  if (negativeBank.length > 0) {
    checks.push({
      id: "negative_bank",
      label: "Cuentas bancarias con balance negativo",
      description: "Indica transacciones no reconciliadas o errores",
      status: "fail",
      detail: negativeBank.map((a: AnyObj) => `${a.Name}: ${formatCurrency(a.CurrentBalance)}`).join(", "),
    });
  }

  return checks;
}

// ─── Industry KPIs ──────────────────────────────────────────────────

export interface IndustryKPI {
  label: string;
  value: string;
  status: "good" | "warning" | "bad" | "neutral";
  description: string;
}

export function getIndustryKPIs(
  industry: string,
  pnlSummary: PnLSummary | null,
  bsSummary: BalanceSheetSummary | null,
): IndustryKPI[] {
  const kpis: IndustryKPI[] = [];

  if (!pnlSummary) return kpis;

  // Universal KPIs
  const netMargin = pnlSummary.revenue !== 0
    ? (pnlSummary.netIncome / pnlSummary.revenue) * 100 : 0;
  kpis.push({
    label: "Margen Neto",
    value: `${netMargin.toFixed(1)}%`,
    status: netMargin > 10 ? "good" : netMargin > 0 ? "warning" : "bad",
    description: "Ingreso neto / Ingresos totales",
  });

  kpis.push({
    label: "Margen Bruto",
    value: `${pnlSummary.grossMarginPct.toFixed(1)}%`,
    status: pnlSummary.grossMarginPct > 40 ? "good" : pnlSummary.grossMarginPct > 20 ? "warning" : "bad",
    description: "Utilidad bruta / Ingresos totales",
  });

  if (bsSummary) {
    const currentRatio = bsSummary.currentLiabilities !== 0
      ? bsSummary.currentAssets / bsSummary.currentLiabilities : 0;
    kpis.push({
      label: "Ratio Corriente",
      value: currentRatio.toFixed(2),
      status: currentRatio >= 1.5 ? "good" : currentRatio >= 1 ? "warning" : "bad",
      description: "Activos corrientes / Pasivos corrientes",
    });

    const debtRatio = bsSummary.totalAssets !== 0
      ? (bsSummary.totalLiabilities / bsSummary.totalAssets) * 100 : 0;
    kpis.push({
      label: "Ratio de Deuda",
      value: `${debtRatio.toFixed(1)}%`,
      status: debtRatio < 50 ? "good" : debtRatio < 70 ? "warning" : "bad",
      description: "Pasivos totales / Activos totales",
    });
  }

  // Industry-specific KPIs
  const lowerIndustry = industry.toLowerCase();

  if (/construc|contrat|build|plumb|hvac|electric|roofing/i.test(lowerIndustry)) {
    // Construction: highlight COGS breakdown importance
    const cogsPercent = pnlSummary.revenue !== 0
      ? (pnlSummary.cogs / pnlSummary.revenue) * 100 : 0;
    kpis.push({
      label: "Costo Directo %",
      value: `${cogsPercent.toFixed(1)}%`,
      status: cogsPercent < 70 ? "good" : cogsPercent < 80 ? "warning" : "bad",
      description: "Costos directos (labor + materiales + subs) / Ingresos",
    });
  }

  if (/restaurant|food|cafe|bar|catering/i.test(lowerIndustry)) {
    // Restaurant: Prime cost target 60-65%
    const primeCost = pnlSummary.revenue !== 0
      ? ((pnlSummary.cogs + pnlSummary.expenses * 0.4) / pnlSummary.revenue) * 100 : 0;
    kpis.push({
      label: "Prime Cost (est.)",
      value: `${primeCost.toFixed(1)}%`,
      status: primeCost < 65 ? "good" : primeCost < 70 ? "warning" : "bad",
      description: "COGS + Labor (est.) / Ingresos — Meta: < 65%",
    });
  }

  if (/retail|store|shop|sales|ecommerce|e-commerce/i.test(lowerIndustry)) {
    // Retail: inventory turnover context
    kpis.push({
      label: "Food/Merch Cost %",
      value: `${(pnlSummary.revenue !== 0 ? (pnlSummary.cogs / pnlSummary.revenue) * 100 : 0).toFixed(1)}%`,
      status: (pnlSummary.cogs / (pnlSummary.revenue || 1)) * 100 < 40 ? "good" : "warning",
      description: "COGS / Revenue — retail target < 40%",
    });
  }

  if (/transport|truck|freight|logist/i.test(lowerIndustry)) {
    const opRatio = pnlSummary.revenue !== 0
      ? ((pnlSummary.cogs + pnlSummary.expenses) / pnlSummary.revenue) * 100 : 0;
    kpis.push({
      label: "Operating Ratio",
      value: `${opRatio.toFixed(1)}%`,
      status: opRatio < 93 ? "good" : opRatio < 97 ? "warning" : "bad",
      description: "Gastos operativos / Ingresos — Meta: < 95%",
    });
  }

  return kpis;
}

// ─── Invoice Status (existing) ───────────────────────────────────────

export function deriveInvoiceStatus(
  balance: number,
  dueDate: string
): "Paid" | "Open" | "Overdue" {
  if (balance === 0) return "Paid";
  if (dueDate && new Date(dueDate) < new Date()) return "Overdue";
  return "Open";
}
