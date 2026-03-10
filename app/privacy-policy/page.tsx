export default function PrivacyPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-slate-700">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-400 mb-8">Last updated: March 10, 2026</p>

      <p className="mb-4">
        Accountability App ("we", "us", or "our") is committed to protecting your privacy. This
        Privacy Policy explains how we collect, use, and safeguard your information when you use our
        Service.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-3">1. Information We Collect</h2>
      <p className="mb-4">When you connect your QuickBooks Online account, we access and store:</p>
      <ul className="list-disc ml-6 mb-4 space-y-1">
        <li>Company name and basic company information</li>
        <li>Profit & Loss reports</li>
        <li>Balance Sheet reports</li>
        <li>Invoice data</li>
        <li>Chart of Accounts</li>
        <li>Customer and vendor lists</li>
      </ul>
      <p className="mb-4">
        This data is retrieved read-only via the QuickBooks Online API and is used exclusively to
        populate your dashboard.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-3">2. How We Use Your Information</h2>
      <p className="mb-4">We use the information solely to:</p>
      <ul className="list-disc ml-6 mb-4 space-y-1">
        <li>Display your financial data in your personal dashboard</li>
        <li>Provide business analytics and reporting features</li>
      </ul>
      <p className="mb-4">
        We do not sell, trade, or share your financial data with any third parties.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-3">3. Data Storage & Security</h2>
      <p className="mb-4">
        Your data is stored in a secure, encrypted PostgreSQL database. OAuth tokens used to access
        QuickBooks are stored securely and never exposed publicly. We use industry-standard security
        practices to protect your information.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-3">4. Data Retention</h2>
      <p className="mb-4">
        We retain your QuickBooks data only as long as your account is active. You may disconnect
        your QuickBooks account at any time, after which your data will be removed from our systems.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-3">5. Third-Party Services</h2>
      <p className="mb-4">
        Our Service integrates with Intuit QuickBooks Online. Your use of QuickBooks is governed by
        Intuit's own Privacy Policy and Terms of Service.
      </p>

      <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-3">6. Your Rights</h2>
      <p className="mb-4">You have the right to:</p>
      <ul className="list-disc ml-6 mb-4 space-y-1">
        <li>Access the data we store about you</li>
        <li>Request deletion of your data</li>
        <li>Disconnect your QuickBooks account at any time</li>
      </ul>

      <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-3">7. Contact Us</h2>
      <p className="mb-4">
        For privacy-related questions or data deletion requests, contact us at{" "}
        <a href="mailto:admin@accountability.com" className="text-blue-600 underline">
          admin@accountability.com
        </a>
        .
      </p>
    </main>
  );
}
