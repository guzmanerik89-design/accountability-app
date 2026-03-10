export default function EULAPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-slate-700">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">End-User License Agreement</h1>
      <p className="text-sm text-slate-400 mb-8">Last updated: March 10, 2026</p>

      <p className="mb-4">
        This End-User License Agreement ("Agreement") is a legal agreement between you ("User") and
        Accountability App ("Company") for the use of the Accountability App software and services
        ("Service").
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-3">1. License Grant</h2>
      <p className="mb-4">
        The Company grants you a limited, non-exclusive, non-transferable, revocable license to
        access and use the Service solely for your internal business purposes.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-3">2. QuickBooks Integration</h2>
      <p className="mb-4">
        The Service integrates with Intuit QuickBooks Online via OAuth 2.0. By connecting your
        QuickBooks account, you authorize the Service to read financial data (profit & loss, balance
        sheet, invoices, accounts, customers, and vendors) solely to display it within your dashboard.
        The Service does not modify, create, or delete any data in your QuickBooks account.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-3">3. Data Use</h2>
      <p className="mb-4">
        Financial data retrieved from QuickBooks is stored securely and used only to provide the
        dashboard functionality. Your data is never sold or shared with third parties.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-3">4. Restrictions</h2>
      <p className="mb-4">You may not:</p>
      <ul className="list-disc ml-6 mb-4 space-y-1">
        <li>Reverse engineer, decompile, or disassemble the Service</li>
        <li>Use the Service for any unlawful purpose</li>
        <li>Transfer or sublicense your access to any third party</li>
      </ul>

      <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-3">5. Termination</h2>
      <p className="mb-4">
        This Agreement is effective until terminated. Your rights under this Agreement will terminate
        automatically if you fail to comply with its terms.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-3">6. Disclaimer of Warranties</h2>
      <p className="mb-4">
        The Service is provided "AS IS" without warranty of any kind. The Company does not warrant
        that the Service will be uninterrupted or error-free.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-3">7. Contact</h2>
      <p className="mb-4">
        For questions about this Agreement, contact us at{" "}
        <a href="mailto:admin@accountability.com" className="text-blue-600 underline">
          admin@accountability.com
        </a>
        .
      </p>
    </main>
  );
}
