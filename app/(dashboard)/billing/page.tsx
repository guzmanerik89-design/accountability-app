import { db } from "@/lib/db";
import { BillingTable } from "@/components/dashboard/BillingTable";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const billingData = await db.query.billing.findMany({
    with: { client: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing Tracker</h1>
        <p className="text-slate-500 mt-1">Monthly accounting fees · Tax prep · 1099-NEC forms ($25/ea)</p>
      </div>
      <BillingTable billingData={billingData} />
    </div>
  );
}
