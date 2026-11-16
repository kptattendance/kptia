import { getCapturedEvents } from "./pdfCapture.js";

// =====================================================
// PDF -> EXCEL
//
// Writes what a PDF builder drew (headings and tables,
// recorded by pdfCapture.js) to one Excel sheet:
// - headings on one line of the PDF go on one row
// - tables keep their merged headings, colours and
//   bold text
// - marks and counts are real numbers, so the sheet
//   can be sorted and added up
//
// The Excel library is loaded only when this runs.
// =====================================================

const COLLEGE = "KARNATAKA (GOVT.) POLYTECHNIC, MANGALURU";

const HEAD_FILL = "D8E4BC";

const BORDER_COLOUR = { rgb: "94A3B8" };

const border = {
  top: { style: "thin", color: BORDER_COLOUR },
  bottom: { style: "thin", color: BORDER_COLOUR },
  left: { style: "thin", color: BORDER_COLOUR },
  right: { style: "thin", color: BORDER_COLOUR },
};

const toHex = (colour) => {
  if (Array.isArray(colour) && colour.length >= 3) {
    return colour
      .slice(0, 3)
      .map((part) =>
        Math.max(0, Math.min(255, Math.round(Number(part) || 0)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
      .toUpperCase();
  }

  if (typeof colour === "string" && /^#?[0-9a-f]{6}$/i.test(colour)) {
    return colour.replace("#", "").toUpperCase();
  }

  return null;
};

// "12" -> 12, "12.5" -> 12.5; register numbers,
// "12/15", "80.0%" and "0012" stay text
const toValue = (content) => {
  if (typeof content === "number") {
    return content;
  }

  const text = Array.isArray(content)
    ? content.join("\n")
    : String(content ?? "");

  const trimmed = text.trim();

  if (
    /^-?\d+(\.\d+)?$/.test(trimmed) &&
    !/^-?0\d/.test(trimmed) &&
    trimmed.length < 12
  ) {
    return Number(trimmed);
  }

  return text;
};

const readCell = (cell) => {
  if (
    cell !== null &&
    typeof cell === "object" &&
    !Array.isArray(cell)
  ) {
    return {
      value: toValue(cell.content ?? ""),
      colSpan: Math.max(1, Number(cell.colSpan) || 1),
      rowSpan: Math.max(1, Number(cell.rowSpan) || 1),
      styles: cell.styles || {},
    };
  }

  return {
    value: toValue(cell ?? ""),
    colSpan: 1,
    rowSpan: 1,
    styles: {},
  };
};

const sheetName = (name) =>
  String(name || "Report")
    .replace(/[[\]:*?/\\]/g, " ")
    .trim()
    .slice(0, 31) || "Report";

// =====================================================
// LAYOUT
// =====================================================

const layout = (events) => {
  // grid[r][c] = { v, s }
  const grid = [];
  const merges = [];

  const put = (r, c, v, s) => {
    if (!grid[r]) {
      grid[r] = [];
    }

    grid[r][c] = { v, s };
  };

  let row = 0;

  put(row, 0, COLLEGE, {
    font: { bold: true, sz: 13, color: { rgb: "991B34" } },
  });

  row += 2;

  let previousWasTable = false;

  for (let index = 0; index < events.length; index++) {
    const event = events[index];

    // ---------------- headings / notes ----------------
    if (event.type === "text") {
      // Texts on the same line of the PDF
      const line = [event];

      while (
        events[index + 1]?.type === "text" &&
        events[index + 1].page === event.page &&
        Math.abs(events[index + 1].y - event.y) < 0.6
      ) {
        index += 1;
        line.push(events[index]);
      }

      if (previousWasTable) {
        row += 1;
      }

      line
        .sort((a, b) => a.x - b.x)
        .forEach((item, column) => {
          put(row, column, toValue(item.value), {
            font: {
              bold: item.bold,
              sz: item.bold ? 11 : 10,
              color: { rgb: item.bold ? "0F172A" : "475569" },
            },
            alignment: { vertical: "center" },
          });
        });

      row += 1;
      previousWasTable = false;
      continue;
    }

    // ---------------- table ----------------
    row += previousWasTable ? 1 : 0;

    const taken = new Set();

    const writeRows = (rows, section) => {
      rows.forEach((cells) => {
        let column = 0;

        (cells || []).forEach((raw) => {
          while (taken.has(`${row},${column}`)) {
            column += 1;
          }

          const cell = readCell(raw);
          const styles = cell.styles;

          const fill =
            toHex(styles.fillColor) ||
            (section === "head" ? HEAD_FILL : null);

          const colour = toHex(styles.textColor);

          const bold =
            section === "head" ||
            String(styles.fontStyle || "").includes("bold");

          const isText = typeof cell.value === "string";

          put(row, column, cell.value, {
            font: {
              bold,
              sz: 10,
              ...(colour ? { color: { rgb: colour } } : {}),
            },
            ...(fill
              ? { fill: { patternType: "solid", fgColor: { rgb: fill } } }
              : {}),
            alignment: {
              horizontal:
                styles.halign ||
                (isText && cell.value.length > 24 ? "left" : "center"),
              vertical: "center",
              wrapText: true,
            },
            border,
          });

          for (let r = 0; r < cell.rowSpan; r++) {
            for (let c = 0; c < cell.colSpan; c++) {
              taken.add(`${row + r},${column + c}`);

              if (r > 0 || c > 0) {
                put(row + r, column + c, "", { border });
              }
            }
          }

          if (cell.rowSpan > 1 || cell.colSpan > 1) {
            merges.push({
              s: { r: row, c: column },
              e: {
                r: row + cell.rowSpan - 1,
                c: column + cell.colSpan - 1,
              },
            });
          }

          column += cell.colSpan;
        });

        row += 1;
      });
    };

    writeRows(event.head, "head");
    writeRows(event.body, "body");
    writeRows(event.foot, "foot");

    previousWasTable = true;
  }

  return { grid, merges };
};

// =====================================================
// DOWNLOAD
// =====================================================

export async function downloadPdfAsExcel(doc, fileName, name) {
  const loaded = await import("xlsx-js-style");
  const XLSX = loaded.utils ? loaded : loaded.default;

  const { grid, merges } = layout(getCapturedEvents(doc));

  // grid can have empty rows (holes), so a plain loop
  let columnCount = 1;

  for (let r = 0; r < grid.length; r++) {
    columnCount = Math.max(columnCount, grid[r]?.length || 0);
  }

  const values = [];

  for (let r = 0; r < grid.length; r++) {
    const cells = grid[r] || [];
    const line = [];

    for (let c = 0; c < columnCount; c++) {
      line.push(cells[c] ? cells[c].v : null);
    }

    values.push(line);
  }

  const sheet = XLSX.utils.aoa_to_sheet(values);

  grid.forEach((cells, r) => {
    (cells || []).forEach((cell, c) => {
      if (!cell) {
        return;
      }

      const address = XLSX.utils.encode_cell({ r, c });

      if (!sheet[address]) {
        sheet[address] = { t: "s", v: "" };
      }

      sheet[address].s = cell.s;
    });
  });

  // Column widths from the longest table entry; the
  // first rows (college name, headings) may spill over.
  const widths = Array(columnCount).fill(6);

  grid.forEach((cells, r) => {
    if (r < 2) {
      return;
    }

    (cells || []).forEach((cell, c) => {
      if (!cell || cell.v === null || cell.v === "") {
        return;
      }

      const longest = String(cell.v)
        .split("\n")
        .reduce((max, part) => Math.max(max, part.length), 0);

      // Loose headings are not used to size a column
      if (cell.s?.border) {
        widths[c] = Math.max(widths[c], Math.min(longest + 2, 42));
      }
    });
  });

  sheet["!cols"] = widths.map((wch) => ({ wch }));
  sheet["!merges"] = merges;

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, sheet, sheetName(name));

  XLSX.writeFile(
    workbook,
    String(fileName || "Report.xlsx").replace(/\.pdf$/i, ".xlsx")
  );
}
