"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// The PDF is fetched from the server in parts of this size.
const CHUNK_SIZE = 1024 * 1024;

// The worker file in /public must be the one that came with
// the installed pdfjs-dist version:
// node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs
const PDF_WORKER_URL = "/pdf.worker.min.mjs";

// =====================================================
// ONE PAGE
//
// Drawn only when it is scrolled into view, with the
// viewer's identity stamped across it.
// =====================================================

function PdfPage({ pdf, pageNumber, aspectRatio, watermark }) {
  const holderRef = useRef(null);
  const canvasRef = useRef(null);

  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const holder = holderRef.current;

    if (!holder) {
      return;
    }

    let cancelled = false;
    let started = false;

    const render = async () => {
      if (started) {
        return;
      }

      started = true;

      try {
        const page = await pdf.getPage(pageNumber);

        const baseViewport = page.getViewport({ scale: 1 });

        // Sharp on phones, without very large canvases.
        const pixelRatio = Math.min(
          window.devicePixelRatio || 1,
          2
        );

        const viewport = page.getViewport({
          scale:
            (holder.clientWidth / baseViewport.width) *
            pixelRatio,
        });

        const canvas = canvasRef.current;

        if (cancelled || !canvas) {
          return;
        }

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const context = canvas.getContext("2d");

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        if (cancelled) {
          return;
        }

        // ---------------------------------------------
        // WATERMARK
        // ---------------------------------------------

        if (watermark) {
          const fontSize = Math.max(
            14,
            Math.floor(canvas.width / 38)
          );

          context.save();
          context.globalAlpha = 0.13;
          context.fillStyle = "#283618";
          context.font = `600 ${fontSize}px sans-serif`;
          context.textAlign = "center";

          context.translate(
            canvas.width / 2,
            canvas.height / 2
          );

          context.rotate(-Math.PI / 6);

          const stepX = canvas.width * 0.55;
          const stepY = canvas.height * 0.2;

          for (let row = -3; row <= 3; row++) {
            for (let column = -2; column <= 2; column++) {
              context.fillText(
                watermark,
                column * stepX +
                  (row % 2 ? stepX / 2 : 0),
                row * stepY
              );
            }
          }

          context.restore();
        }

        setRendered(true);
      } catch (error) {
        console.error(
          `Failed to draw page ${pageNumber}:`,
          error
        );
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          render();
        }
      },
      {
        // Start a little before the page is visible.
        rootMargin: "600px 0px",
      }
    );

    observer.observe(holder);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [pdf, pageNumber, watermark]);

  return (
    <div
      ref={holderRef}
      className="relative mx-auto mb-4 w-full max-w-4xl overflow-hidden bg-white shadow-md"
      style={{ aspectRatio }}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
      />

      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
          Page {pageNumber}
        </div>
      )}
    </div>
  );
}

// =====================================================
// PDF VIEWER
//
// Shows a study material PDF inside the website.
//
// The file is read from the server in parts and drawn
// page by page. There is no link to the file, no
// download or print button, and right-click is off.
//
// material: { _id, size }
// version:  "approved" | "pending"
// =====================================================

export default function PdfViewer({
  material,
  version = "approved",
  title,
  subtitle,
  watermark,
  onClose,
}) {
  const { getToken } = useAuth();

  const [progress, setProgress] = useState(0);
  const [pdf, setPdf] = useState(null);
  const [aspectRatio, setAspectRatio] = useState("1 / 1.414");
  const [error, setError] = useState("");

  // =====================================================
  // LOAD THE FILE
  // =====================================================

  useEffect(() => {
    let cancelled = false;
    let loadingTask = null;

    const load = async () => {
      try {
        const size = Number(material.size);

        const data = new Uint8Array(size);

        for (
          let start = 0;
          start < size;
          start += CHUNK_SIZE
        ) {
          const end = Math.min(
            start + CHUNK_SIZE,
            size
          ) - 1;

          // A new token for every part: a token
          // is valid only for a short time.
          const token = await getToken();

          const response = await axios.get(
            `${API_URL}/api/materials/${material._id}/chunk`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              params: {
                version,
                start,
                end,
              },
              responseType: "arraybuffer",
            }
          );

          if (cancelled) {
            return;
          }

          data.set(new Uint8Array(response.data), start);

          setProgress(
            Math.round(((end + 1) / size) * 100)
          );
        }

        const pdfjs = await import(
          "pdfjs-dist/legacy/build/pdf.mjs"
        );

        pdfjs.GlobalWorkerOptions.workerSrc =
          PDF_WORKER_URL;

        loadingTask = pdfjs.getDocument({ data });

        const document = await loadingTask.promise;

        if (cancelled) {
          return;
        }

        const firstPage = await document.getPage(1);

        const viewport = firstPage.getViewport({
          scale: 1,
        });

        setAspectRatio(
          `${viewport.width} / ${viewport.height}`
        );

        setPdf(document);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error("PDF viewer error:", err);

        let message = "";

        // The server's message arrives as bytes here.
        if (err.response?.data) {
          try {
            message = JSON.parse(
              new TextDecoder().decode(
                err.response.data
              )
            ).message;
          } catch {
            message = "";
          }
        }

        setError(
          message ||
            "Unable to open the study material. Please try again."
        );
      }
    };

    load();

    return () => {
      cancelled = true;

      if (loadingTask) {
        loadingTask.destroy();
      }
    };
  }, [material._id, material.size, version, getToken]);

  // =====================================================
  // CLOSE WITH ESCAPE, NO PAGE SCROLL BEHIND
  // =====================================================

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-slate-900 select-none"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >

      {/* Nothing of the material is printed. */}
      <style>{`@media print { body { display: none !important; } }`}</style>

      {/* HEADER */}

      <div className="flex items-center justify-between gap-4 border-b border-slate-700 bg-slate-950 px-4 py-3">

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {title}
          </p>

          <p className="truncate text-xs text-slate-400">
            {pdf
              ? `${pdf.numPages} pages`
              : "Opening..."}
            {subtitle ? ` · ${subtitle}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
        >
          <X size={16} />
          Close
        </button>

      </div>

      {/* PAGES */}

      <div className="flex-1 overflow-y-auto px-2 py-4 sm:px-4">

        {error && (
          <p className="mx-auto mt-16 max-w-md rounded-xl bg-white px-5 py-6 text-center text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {!error && !pdf && (
          <div className="mx-auto mt-16 max-w-xs text-center">
            <p className="text-sm text-slate-300">
              Loading study material... {progress}%
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {pdf &&
          Array.from(
            { length: pdf.numPages },
            (_, index) => (
              <PdfPage
                key={index + 1}
                pdf={pdf}
                pageNumber={index + 1}
                aspectRatio={aspectRatio}
                watermark={watermark}
              />
            )
          )}

      </div>

    </div>
  );
}
