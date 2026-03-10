"use client";
import { useState } from "react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

interface BillingRecord {
  id: number;
  clientId: number;
  monthlyAccountingFee: string | null;
  monthsBilled: number | null;
  taxPrepFee: string | null;
  num1099NecForms: number | null;
  amountReceived: string | null;
  billingNotes: string | null;
  client: {
    id: number;
    name: string;
    deadline: string | null;
  };
}

const FEE_PER_1099 = 25;

function calcTotals(b: BillingRecord) {
  const acct = parseFloat(b.monthlyAccountingFee || "0") * (b.monthsBilled || 1);
  const tax = parseFloat(b.taxPrepFee || "0");
  const nec = (b.num1099NecForms || 0) * FEE_PER_1099;
  const grand = acct + tax + nec;
  const received = parseFloat(b.amountReceived || "0");
  const balance = grand - received;
  return { acct, tax, nec, grand, received, balance };
}

export function BillingTable({ billingData }: { billingData: BillingRecord[] }) {
  const [data, setData] = useState(billingData);
  const [saving, setSaving] = useState<number | null>(null);

  const updateField = async (
    billingId: number,
    field: string,
    value: string | number
  ) => {
    setData((prev) =>
      prev.map((b) => (b.id === billingId ? { ...b, [field]: value } : b))
    );
    setSaving(billingId);
    try {
      const res = await fetch(`/api/billing/${billingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      toast.success("Billing updated");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const totals = data.reduce(
    (acc, b) => {
      const t = calcTotals(b);
      return {
        acct: acc.acct + t.acct,
        tax: acc.tax + t.tax,
        nec: acc.nec + t.nec,
        grand: acc.grand + t.grand,
        received: acc.received + t.received,
        balance: acc.balance + t.balance,
      };
    },
    { acct: 0, tax: 0, nec: 0, grand: 0, received: 0, balance: 0 }
  );

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <div className="text-xs text-green-600 font-medium">Total Billed</div>
          <div className="text-2xl font-bold text-green-800 mt-0.5">{fmt(totals.grand)}</div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="text-xs text-blue-600 font-medium">Received</div>
          <div className="text-2xl font-bold text-blue-800 mt-0.5">{fmt(totals.received)}</div>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <div className="text-xs text-orange-600 font-medium">Balance Owing</div>
          <div className="text-2xl font-bold text-orange-800 mt-0.5">{fmt(totals.balance)}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600 min-w-[180px]">Business</th>
                <th className="text-center px-3 py-3 font-medium text-slate-600">Deadline</th>
                <th className="text-center px-3 py-3 font-medium text-slate-600">Monthly Fee</th>
                <th className="text-center px-3 py-3 font-medium text-slate-600">Months</th>
                <th className="text-center px-3 py-3 font-medium text-slate-600">Acct Total</th>
                <th className="text-center px-3 py-3 font-medium text-slate-600">Tax Prep</th>
                <th className="text-center px-3 py-3 font-medium text-slate-600">1099-NEC #</th>
                <th className="text-center px-3 py-3 font-medium text-slate-600">1099 Total</th>
                <th className="text-center px-3 py-3 font-medium text-slate-600">Grand Total</th>
                <th className="text-center px-3 py-3 font-medium text-slate-600">Received</th>
                <th className="text-center px-3 py-3 font-medium text-slate-600">Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b, i) => {
                const t = calcTotals(b);
                const days = b.client.deadline
                  ? differenceInDays(new Date(b.client.deadline), new Date())
                  : null;
                const urgency =
                  days === null ? "" : days < 0 ? "text-red-600" : days <= 3 ? "text-red-500" : days <= 7 ? "text-yellow-600" : "text-slate-500";

                return (
                  <tr key={b.id} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{b.client.name}</td>
                    <td className={`px-3 py-2.5 text-center text-xs font-medium ${urgency}`}>
                      {b.client.deadline
                        ? format(new Date(b.client.deadline), "MM/dd/yy")
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="number"
                        defaultValue={b.monthlyAccountingFee || ""}
                        placeholder="0.00"
                        className="w-20 text-center border border-slate-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onBlur={(e) =>
                          updateField(b.id, "monthlyAccountingFee", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="number"
                        defaultValue={b.monthsBilled || 1}
                        min={1}
                        className="w-14 text-center border border-slate-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onBlur={(e) =>
                          updateField(b.id, "monthsBilled", parseInt(e.target.value))
                        }
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-700 font-medium">
                      {fmt(t.acct)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="number"
                        defaultValue={b.taxPrepFee || ""}
                        placeholder="0.00"
                        className="w-20 text-center border border-slate-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onBlur={(e) =>
                          updateField(b.id, "taxPrepFee", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="number"
                        defaultValue={b.num1099NecForms || 0}
                        min={0}
                        className="w-14 text-center border border-slate-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onBlur={(e) =>
                          updateField(b.id, "num1099NecForms", parseInt(e.target.value))
                        }
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-600">{fmt(t.nec)}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-slate-900">{fmt(t.grand)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="number"
                        defaultValue={b.amountReceived || ""}
                        placeholder="0.00"
                        className="w-20 text-center border border-slate-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        onBlur={(e) =>
                          updateField(b.id, "amountReceived", e.target.value)
                        }
                      />
                    </td>
                    <td className={`px-3 py-2.5 text-center font-semibold ${t.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                      {fmt(t.balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-sm">
                <td className="px-4 py-3 text-slate-800" colSpan={4}>TOTALS</td>
                <td className="px-3 py-3 text-center text-slate-800">{fmt(totals.acct)}</td>
                <td className="px-3 py-3 text-center text-slate-800">{fmt(totals.tax)}</td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-center text-slate-800">{fmt(totals.nec)}</td>
                <td className="px-3 py-3 text-center text-slate-900">{fmt(totals.grand)}</td>
                <td className="px-3 py-3 text-center text-green-700">{fmt(totals.received)}</td>
                <td className={`px-3 py-3 text-center ${totals.balance > 0 ? "text-red-700" : "text-green-700"}`}>
                  {fmt(totals.balance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <p className="text-xs text-slate-400 text-center">Yellow cells = editable · Auto-calculated: Acct Total, 1099 Total, Grand Total, Balance · $25 flat rate per 1099-NEC form</p>
    </div>
  );
}
