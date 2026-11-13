"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { photoUrl } from "../utils/photoUrl";

const SIZES = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
};

// =====================================================
// STUDENT PHOTO
//
// A small round photo next to a student's name (the
// initial when there is no photo). Clicking it opens the
// photo large with the name and register number; click
// outside, × or Escape to close.
// =====================================================

export default function StudentPhoto({
  imageUrl,
  name,
  registerNumber,
  size = "md",
}) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);

  const hasPhoto = Boolean(imageUrl) && !broken;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <>
      {hasPhoto ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="View photo"
          className={`${sizeClass} shrink-0 overflow-hidden rounded-full border border-slate-200 transition hover:scale-110 hover:ring-2 hover:ring-indigo-400`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(imageUrl)} decoding="async"
            alt={name || "Student"}
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
          />
        </button>
      ) : (
        <span
          className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500`}
        >
          {String(name || "S").charAt(0).toUpperCase()}
        </span>
      )}

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div
              className="relative flex max-h-[95vh] max-w-[95vw] flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close photo"
                className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl font-bold text-slate-700 shadow-lg transition hover:bg-slate-100 hover:text-red-600"
              >
                ×
              </button>

              <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(imageUrl, "large")}
                  alt={name || "Student"}
                  className="max-h-[75vh] max-w-[90vw] rounded-xl object-contain"
                />
              </div>

              <div className="mt-3 rounded-xl bg-white px-5 py-3 text-center shadow-lg">
                <p className="text-sm font-bold text-slate-900">
                  {name}
                </p>

                {registerNumber && (
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {registerNumber}
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
