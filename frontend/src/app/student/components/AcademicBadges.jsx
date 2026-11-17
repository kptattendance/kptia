// =====================================================
// STUDENT ACADEMIC BADGES
//
// Shared by the IA / Attendance page and the progress
// report, so the colours mean the same everywhere.
//
// Attendance:  85% or more       green
//              75% to below 85%  amber
//              below 75%         red (not eligible)
// Marks:       60% or more       green
//              40% to below 60%  amber
//              below 40% / below the subject minimum  red
// =====================================================

import { iaLabel } from "../../utils/iaLabels";

export const ATTENDANCE_MINIMUM = 75;

const TONES = {
  good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  fair: "bg-amber-50 text-amber-800 ring-amber-200",
  low: "bg-red-50 text-red-700 ring-red-200",
  none: "text-slate-300",
};

export const attendanceTone = (percent, minimum = ATTENDANCE_MINIMUM) => {
  if (percent === null || percent === undefined) return "none";
  if (percent < minimum) return "low";
  if (percent < 85) return "fair";
  return "good";
};

export const markTone = (marks, max, minimum = null) => {
  if (marks === null || marks === undefined || !max) return "none";
  if (minimum !== null && minimum !== undefined && marks < minimum) {
    return "low";
  }

  const share = marks / max;

  if (share < 0.4) return "low";
  if (share < 0.6) return "fair";
  return "good";
};

export const percentOf = (attended, eligible) =>
  eligible > 0 ? Math.round((attended / eligible) * 1000) / 10 : null;

const formatNumber = (value) =>
  Number.isInteger(value) ? String(value) : Number(value).toFixed(1);

// Header colour of each assessment column
export const assessmentHead = (iaNumber) => {
  const number = Number(iaNumber);

  if (number === 5) return "bg-violet-50 text-violet-700";
  if (number > 10) return "bg-teal-50 text-teal-700";
  return "bg-sky-50 text-sky-700";
};

export const assessmentName = (iaNumber) => {
  const number = Number(iaNumber);

  // "Improvement (IA 2)" is long for a column
  return number > 10 ? `Impr. IA ${number - 10}` : iaLabel(number);
};

// ---------------- attendance ----------------
export function AttendanceCell({ attended, eligible, minimum, large = false }) {
  if (!(eligible > 0)) {
    return <span className="text-sm text-slate-300">—</span>;
  }

  const percent = percentOf(attended, eligible);
  const tone = attendanceTone(percent, minimum);

  return (
    <span className="inline-flex flex-col items-center gap-1">
      <span
        className={`inline-flex min-w-[64px] justify-center rounded-lg px-2 py-0.5 font-bold tabular-nums ring-1 ring-inset ${
          large ? "text-sm" : "text-xs"
        } ${TONES[tone]}`}
      >
        {formatNumber(percent)}%
      </span>
      <span className="text-[11px] tabular-nums text-slate-500">
        {attended}/{eligible}
      </span>
    </span>
  );
}

// ---------------- marks ----------------
export function MarkCell({ marks, max, absent, minimum = null, large = false }) {
  if (absent) {
    return (
      <span
        className={`inline-flex justify-center rounded-lg px-2 py-0.5 font-bold ring-1 ring-inset ${TONES.low} ${
          large ? "text-sm" : "text-xs"
        }`}
      >
        AB
      </span>
    );
  }

  if (marks === null || marks === undefined || !max) {
    return <span className="text-sm text-slate-300">—</span>;
  }

  const tone = markTone(marks, max, minimum);

  return (
    <span
      className={`inline-flex items-baseline gap-0.5 whitespace-nowrap rounded-lg px-2 py-0.5 font-bold tabular-nums ring-1 ring-inset ${
        large ? "text-base" : "text-sm"
      } ${TONES[tone]}`}
    >
      {formatNumber(marks)}
      <span className="text-[11px] font-medium opacity-70">/{formatNumber(max)}</span>
    </span>
  );
}

// ---------------- legends ----------------
const Dot = ({ tone, label }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={`h-2.5 w-2.5 rounded-full ring-1 ring-inset ${TONES[tone]}`} />
    {label}
  </span>
);

export function AttendanceLegend({ minimum = ATTENDANCE_MINIMUM }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500">
      <Dot tone="good" label="85% and above" />
      <Dot tone="fair" label={`${minimum}% to 85%`} />
      <Dot tone="low" label={`Below ${minimum}%`} />
    </div>
  );
}

export function MarksLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-slate-500">
      <Dot tone="good" label="60% and above" />
      <Dot tone="fair" label="40% to 60%" />
      <Dot tone="low" label="Below 40% / below minimum · AB absent" />
    </div>
  );
}
