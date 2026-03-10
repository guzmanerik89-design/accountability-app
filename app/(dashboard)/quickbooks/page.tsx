"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QBStatus {
  connected: boolean;
  authUri?: string;
  realmId?: string;
}

interface QBData {
  type: string;
  data: Record<string, unknown>;
}

export default function QuickBooksPage() {
  const [status, setStatus] = useState<QBStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingData, setFetchingData] = useState<string | null>(null);
  const [reportData, setReportData] = useState<QBData | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quickbooks");
      const data = await res.json();
      setStatus(data);
    } catch {
      toast.error("Failed to check QuickBooks status");
    } finally {
      setLoading(false);
    }
  };

  const connect = () => {
    if (status?.authUri) {
      window.location.href = status.authUri;
    }
  };

  const fetchData = async (type: string, params: Record<string, string> = {}) => {
    setFetchingData(type);
    setReportData(null);
    try {
      const query = new URLSearchParams({ type, ...params }).toString();
      const res = await fetch(`/api/quickbooks/data?${query}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReportData(data);
      toast.success(`${type.replace("_", " ")} loaded`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to fetch data");
    } finally {
      setFetchingData(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Checking QuickBooks connection...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">QuickBooks Integration</h1>
        <p className="text-slate-500 mt-1">
          Sync financial data directly from QuickBooks Online
        </p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Connection Status</CardTitle>
            <Badge
              className={
                status?.connected
                  ? "bg-green-100 text-green-700 border-green-200"
                  : "bg-red-100 text-red-700 border-red-200"
              }
            >
              {status?.connected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {status?.connected ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Connected to QuickBooks Online — Realm ID:{" "}
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                  {status.realmId}
                </code>
              </p>
              <p className="text-xs text-slate-400">
                You can now fetch P&L reports, balance sheets, accounts, invoices, and more.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Connect your QuickBooks Online account to sync financial data,
                view P&L reports, and reconcile accounts automatically.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Setup Required</p>
                <p>
                  To connect QuickBooks, add these to your environment variables:
                </p>
                <ul className="mt-2 space-y-1 font-mono text-xs">
                  <li>QB_CLIENT_ID=your_client_id</li>
                  <li>QB_CLIENT_SECRET=your_client_secret</li>
                  <li>QB_REDIRECT_URI=https://your-domain.com/api/quickbooks/callback</li>
                  <li>QB_ENVIRONMENT=sandbox (or production)</li>
                </ul>
                <p className="mt-2 text-xs">
                  Get credentials at{" "}
                  <strong>developer.intuit.com</strong> → Create App → OAuth 2.0
                </p>
              </div>
              <Button
                onClick={connect}
                disabled={!status?.authUri}
                className="bg-[#2CA01C] hover:bg-[#249016] text-white"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
                Connect QuickBooks Online
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Actions */}
      {status?.connected && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { type: "company", label: "Company Info", icon: "🏢", desc: "Business details from QB" },
            {
              type: "pnl",
              label: "P&L Report",
              icon: "📊",
              desc: "Profit & Loss statement",
              params: { startDate: "2025-01-01" },
            },
            {
              type: "balance_sheet",
              label: "Balance Sheet",
              icon: "⚖️",
              desc: "Assets, liabilities & equity",
            },
            { type: "accounts", label: "Chart of Accounts", icon: "📋", desc: "All QB accounts" },
            { type: "invoices", label: "Invoices", icon: "🧾", desc: "Recent invoices" },
            { type: "vendors", label: "Vendors", icon: "🤝", desc: "Vendor list" },
          ].map((item) => (
            <button
              key={item.type}
              onClick={() => fetchData(item.type, item.params)}
              disabled={fetchingData === item.type}
              className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:bg-slate-50 hover:border-blue-300 transition-all disabled:opacity-50 shadow-sm"
            >
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="font-semibold text-sm text-slate-800">
                {fetchingData === item.type ? "Loading..." : item.label}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* Data Output */}
      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base capitalize">
              {reportData.type.replace("_", " ")} — Raw Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-auto max-h-96 text-slate-700">
              {JSON.stringify(reportData.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-600 space-y-2">
        <p className="font-semibold text-slate-800">QuickBooks OAuth 2.0 Setup Guide</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Go to <strong>developer.intuit.com</strong> and sign in with your Intuit account</li>
          <li>Create a new app → Choose <strong>QuickBooks Online and Payments</strong></li>
          <li>Under Keys & OAuth, copy your <strong>Client ID</strong> and <strong>Client Secret</strong></li>
          <li>Add <strong>Redirect URI</strong>: <code className="bg-slate-100 px-1 rounded">{`${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/quickbooks/callback`}</code></li>
          <li>Add the 4 QB environment variables to your <code>.env.local</code> and Vercel</li>
          <li>Click &quot;Connect QuickBooks Online&quot; to authenticate</li>
        </ol>
      </div>
    </div>
  );
}
