"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface Company {
  realmId: string;
  name: string;
}

interface AgentProgress {
  status: "pending" | "running" | "completed" | "failed";
  message?: string;
  startedAt?: string;
  completedAt?: string;
}

interface AgentReportData {
  agentName: string;
  status: string;
  output: string;
  createdAt: string;
}

interface RunData {
  id: number;
  realmId: string;
  clientName: string;
  status: string;
  progress: Record<string, AgentProgress>;
  error?: string;
  startedAt: string;
  completedAt?: string;
  reports?: AgentReportData[];
  finalReport?: string;
}

interface Props {
  companies: Company[];
  initialRuns: Array<{
    id: number;
    realmId: string;
    clientName: string;
    status: string;
    progress: unknown;
    startedAt: Date;
    completedAt: Date | null;
  }>;
}

const AGENTS = [
  { key: "bookkeeping", label: "Bookkeeping", icon: "\u{1F4D2}", description: "Categorize & reconcile" },
  { key: "tax_strategy", label: "Tax Strategy", icon: "\u{1F4B0}", description: "Deductions & savings" },
  { key: "audit", label: "Audit", icon: "\u{1F50D}", description: "Compliance check" },
  { key: "financial_reports", label: "Financial Reports", icon: "\u{1F4CA}", description: "P&L, Balance Sheet, KPIs" },
  { key: "client_advisory", label: "Client Advisory", icon: "\u{1F4CB}", description: "Final advisory report" },
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-500",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export function AgentsDashboard({ companies, initialRuns }: Props) {
  const [selectedRealm, setSelectedRealm] = useState(companies[0]?.realmId || "");
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [runData, setRunData] = useState<RunData | null>(null);
  const [starting, setStarting] = useState(false);
  const [viewingReport, setViewingReport] = useState<string | null>(null);
  const [history, setHistory] = useState(initialRuns);

  // Poll for status when a run is active
  useEffect(() => {
    if (!activeRunId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/agents/status/${activeRunId}`);
        const data: RunData = await res.json();
        setRunData(data);
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(interval);
          if (data.status === "completed") toast.success("Analysis complete!");
          if (data.status === "failed") toast.error(`Analysis failed: ${data.error}`);
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeRunId]);

  const handleRun = useCallback(async () => {
    if (!selectedRealm) return;
    setStarting(true);
    setViewingReport(null);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realmId: selectedRealm }),
      });
      const data = await res.json();
      if (data.runId) {
        setActiveRunId(data.runId);
        setRunData(null);
        toast.info("Agent analysis started...");
      } else {
        toast.error(data.error || "Failed to start");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setStarting(false);
    }
  }, [selectedRealm]);

  const loadRun = useCallback(async (runId: number) => {
    try {
      const res = await fetch(`/api/agents/status/${runId}`);
      const data: RunData = await res.json();
      setRunData(data);
      setActiveRunId(runId);
      setSelectedRealm(data.realmId);
    } catch {
      toast.error("Failed to load run");
    }
  }, []);

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700 block mb-1">Select a client</label>
            <select
              value={selectedRealm}
              onChange={(e) => setSelectedRealm(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {companies.map((c) => (
                <option key={c.realmId} value={c.realmId}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleRun}
            disabled={starting || !selectedRealm || (runData?.status === "running")}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {starting || runData?.status === "running" ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running Analysis...
              </>
            ) : (
              "Run Full Analysis"
            )}
          </button>
        </div>
      </div>

      {/* Agent Progress */}
      {runData && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">{runData.clientName}</h3>
              <p className="text-xs text-slate-400">
                Run #{runData.id} — Started {new Date(runData.startedAt).toLocaleString()}
                {runData.completedAt && ` — Completed ${new Date(runData.completedAt).toLocaleString()}`}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[runData.status] || STATUS_STYLES.pending}`}>
              {runData.status}
            </span>
          </div>

          <div className="space-y-3">
            {AGENTS.map((agent) => {
              const progress = runData.progress?.[agent.key];
              const status = progress?.status || "pending";
              const report = runData.reports?.find((r) => r.agentName === agent.key);
              return (
                <div key={agent.key} className={`border rounded-xl p-4 transition-all ${
                  status === "running" ? "border-blue-300 bg-blue-50" :
                  status === "completed" ? "border-green-200 bg-green-50" :
                  status === "failed" ? "border-red-200 bg-red-50" :
                  "border-slate-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{agent.icon}</span>
                      <div>
                        <div className="font-semibold text-sm text-slate-800">{agent.label}</div>
                        <div className="text-xs text-slate-500">{progress?.message || agent.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {status === "running" && (
                        <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[status]}`}>
                        {status}
                      </span>
                      {report && report.status === "completed" && (
                        <button
                          onClick={() => setViewingReport(viewingReport === agent.key ? null : agent.key)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                        >
                          {viewingReport === agent.key ? "Hide" : "View Report"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded report */}
                  {viewingReport === agent.key && report && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap text-xs leading-relaxed bg-white rounded-lg p-4 max-h-[500px] overflow-y-auto">
                        {report.output}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Final Report */}
          {runData.status === "completed" && runData.finalReport && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => setViewingReport(viewingReport === "final" ? null : "final")}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
              >
                {viewingReport === "final" ? "Hide Final Advisory Report" : "View Final Advisory Report"}
              </button>
              {viewingReport === "final" && (
                <div className="mt-3 prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap text-xs leading-relaxed bg-slate-50 rounded-lg p-5 max-h-[600px] overflow-y-auto border">
                  {runData.finalReport}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Run History */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="font-bold text-slate-800 mb-3">Analysis History</h3>
        {history.length === 0 && !runData ? (
          <p className="text-sm text-slate-400 text-center py-4">No previous analyses. Select a client and run the first analysis.</p>
        ) : (
          <div className="space-y-2">
            {history.map((run) => (
              <button
                key={run.id}
                onClick={() => loadRun(run.id)}
                className={`w-full text-left flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-slate-50 ${
                  activeRunId === run.id ? "border-blue-300 bg-blue-50" : "border-slate-200"
                }`}
              >
                <div>
                  <div className="text-sm font-medium text-slate-800">{run.clientName}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(run.startedAt).toLocaleString()}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[run.status] || STATUS_STYLES.pending}`}>
                  {run.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
