"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function QBSyncButton({ syncedAt }: { syncedAt?: string }) {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setSyncing(true);
    toast.info("Syncing QuickBooks data...");
    try {
      const res = await fetch("/api/quickbooks/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Synced: ${data.synced.join(", ")}${data.failed.length ? ` | Failed: ${data.failed.join(", ")}` : ""}`);
        router.refresh();
      } else {
        toast.error(data.error || "Sync failed");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setSyncing(false);
    }
  };

  const lastSync = syncedAt
    ? new Date(syncedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  const isStale = syncedAt ? Date.now() - new Date(syncedAt).getTime() > 24 * 60 * 60 * 1000 : true;

  return (
    <div className="flex items-center gap-3">
      {lastSync && (
        <span className={`text-xs ${isStale ? "text-orange-500" : "text-slate-400"}`}>
          {isStale ? "⚠ " : "✓ "}Last sync: {lastSync}
        </span>
      )}
      {!lastSync && <span className="text-xs text-orange-500">⚠ No data yet — sync to load</span>}
      <Button
        onClick={handleSync}
        disabled={syncing}
        className="bg-[#2CA01C] hover:bg-[#249016] text-white text-sm"
        size="sm"
      >
        {syncing ? (
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Syncing...
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Now
          </span>
        )}
      </Button>
    </div>
  );
}
