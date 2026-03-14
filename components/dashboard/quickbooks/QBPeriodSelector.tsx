"use client";
import { useState, useCallback } from "react";

export interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

interface Props {
  onPeriodChange: (range: DateRange) => void;
  loading?: boolean;
}

function getPresets(): Array<DateRange & { key: string }> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.toISOString().split("T")[0];

  const fmt = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const lastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

  return [
    {
      key: "ytd",
      label: `YTD ${year}`,
      startDate: `${year}-01-01`,
      endDate: today,
    },
    {
      key: "this_month",
      label: "Este Mes",
      startDate: fmt(year, month, 1),
      endDate: today,
    },
    {
      key: "last_month",
      label: "Mes Anterior",
      startDate: fmt(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, 1),
      endDate: fmt(
        month === 0 ? year - 1 : year,
        month === 0 ? 11 : month - 1,
        lastDayOfMonth(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1)
      ),
    },
    {
      key: "q1",
      label: `Q1 ${year}`,
      startDate: `${year}-01-01`,
      endDate: `${year}-03-31`,
    },
    {
      key: "q2",
      label: `Q2 ${year}`,
      startDate: `${year}-04-01`,
      endDate: `${year}-06-30`,
    },
    {
      key: "q3",
      label: `Q3 ${year}`,
      startDate: `${year}-07-01`,
      endDate: `${year}-09-30`,
    },
    {
      key: "q4",
      label: `Q4 ${year}`,
      startDate: `${year}-10-01`,
      endDate: `${year}-12-31`,
    },
    {
      key: "last_year",
      label: `${year - 1}`,
      startDate: `${year - 1}-01-01`,
      endDate: `${year - 1}-12-31`,
    },
    {
      key: "last_year_q4",
      label: `Q4 ${year - 1}`,
      startDate: `${year - 1}-10-01`,
      endDate: `${year - 1}-12-31`,
    },
  ];
}

export function QBPeriodSelector({ onPeriodChange, loading }: Props) {
  const presets = getPresets();
  const [activePreset, setActivePreset] = useState("ytd");
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const handlePreset = useCallback(
    (preset: (typeof presets)[0]) => {
      setActivePreset(preset.key);
      setShowCustom(false);
      onPeriodChange({ startDate: preset.startDate, endDate: preset.endDate, label: preset.label });
    },
    [onPeriodChange]
  );

  const handleCustom = useCallback(() => {
    if (customStart && customEnd) {
      setActivePreset("custom");
      onPeriodChange({ startDate: customStart, endDate: customEnd, label: `${customStart} → ${customEnd}` });
    }
  }, [customStart, customEnd, onPeriodChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePreset(p)}
            disabled={loading}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
              activePreset === p.key
                ? "bg-[#2CA01C] text-white border-[#2CA01C]"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
            activePreset === "custom"
              ? "bg-[#2CA01C] text-white border-[#2CA01C]"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Personalizado
        </button>
        {loading && (
          <svg className="w-4 h-4 animate-spin text-[#2CA01C]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>
      {showCustom && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2CA01C]"
          />
          <span className="text-xs text-slate-400">→</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2CA01C]"
          />
          <button
            onClick={handleCustom}
            disabled={!customStart || !customEnd || loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#2CA01C] text-white font-medium disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
