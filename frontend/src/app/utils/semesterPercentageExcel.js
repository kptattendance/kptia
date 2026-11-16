// =====================================================
// SEMESTER ATTENDANCE PERCENTAGE (Excel)
//
// HOD download: one row per student, the attendance
// percentage of every subject at the end of the
// semester, and the overall percentage. Nothing else.
//
// data comes from /api/attendance/semester-percentage:
//   { [subjectId]: { latest: {month, year},
//     students: [{ studentId, registerNumber, name,
//     batchNumber, attended, eligible }] } }
//
// Overall = classes attended in all subjects / classes
// eligible in all subjects (same as the PDF report).
// =====================================================

const MINIMUM = 75;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const BORDER_COLOUR = { rgb: "94A3B8" };

const border = {
  top: { style: "thin", color: BORDER_COLOUR },
  bottom: { style: "thin", color: BORDER_COLOUR },
  left: { style: "thin", color: BORDER_COLOUR },
  right: { style: "thin", color: BORDER_COLOUR },
};

const style = ({
  bold = false,
  fill = null,
  colour = "0F172A",
  size = 10,
  align = "center",
  withBorder = true,
} = {}) => ({
  font: { bold, sz: size, color: { rgb: colour } },
  alignment: { horizontal: align, vertical: "center", wrapText: true },
  ...(fill ? { fill: { patternType: "solid", fgColor: { rgb: fill } } } : {}),
  ...(withBorder ? { border } : {}),
});

const round1 = (value) => Math.round(value * 10) / 10;

const percent = (attended, eligible) =>
  eligible > 0 ? round1((attended / eligible) * 100) : null;

export const semesterPercentageFileName = ({
  department,
  semester,
  monthLabel,
  year,
}) =>
  `Attendance_Percentage_${String(department || "").toUpperCase()}_Sem${semester}_upto_${String(
    monthLabel || ""
  ).replace(/\s+/g, "_")}_${year}.xlsx`;

export function exportSemesterPercentageExcel(
  XLSX,
  {
    departmentLabel,
    semester,
    monthLabel,
    year,
    batchLabel,
    subjects,
    data,
    fileName,
  }
) {
  // Only subjects that have attendance
  const withData = subjects.filter(
    (subject) => data[String(subject._id)]
  );

  // Every student of any subject
  const students = new Map();

  withData.forEach((subject) => {
    data[String(subject._id)].students.forEach((entry) => {
      if (!students.has(entry.studentId)) {
        students.set(entry.studentId, {
          registerNumber: entry.registerNumber,
          name: entry.name,
          batchNumber: entry.batchNumber,
          subjects: {},
        });
      }

      students.get(entry.studentId).subjects[String(subject._id)] = entry;
    });
  });

  const list = [...students.values()].sort((a, b) =>
    String(a.registerNumber).localeCompare(
      String(b.registerNumber),
      undefined,
      { numeric: true }
    )
  );

  const width = 4 + withData.length + 1;

  const rows = [];
  const merges = [];

  const titleRow = (text, options) => {
    merges.push({
      s: { r: rows.length, c: 0 },
      e: { r: rows.length, c: width - 1 },
    });

    rows.push([
      { v: text, s: style({ ...options, withBorder: false }) },
      ...Array(width - 1).fill(null),
    ]);
  };

  titleRow("KARNATAKA (GOVT.) POLYTECHNIC, MANGALURU", {
    bold: true,
    size: 13,
    colour: "991B34",
  });
  titleRow("SEMESTER ATTENDANCE PERCENTAGE", { bold: true, size: 12 });
  titleRow(
    `${departmentLabel}  |  Semester ${semester}  |  ${batchLabel}  |  Up to ${monthLabel} ${year}`,
    { colour: "475569" }
  );

  rows.push([]);

  // ---------------- header ----------------
  const head = style({ bold: true, fill: "D8E4BC" });

  rows.push([
    { v: "Sl. No.", s: head },
    { v: "Register No.", s: head },
    { v: "Student Name", s: head },
    { v: "Batch", s: head },
    ...withData.map((subject) => ({
      v: `${subject.code}\n${subject.name}`,
      s: head,
    })),
    { v: "Overall %", s: head },
  ]);

  // Month each subject's attendance is counted up to
  const sub = style({ colour: "475569", fill: "F1F5F9", size: 9 });
  const latestOf = (subject) => {
    const latest = data[String(subject._id)].latest;
    return `up to ${MONTHS[latest.month - 1]} ${latest.year}`;
  };

  rows.push([
    { v: "", s: sub },
    { v: "", s: sub },
    { v: "", s: sub },
    { v: "", s: sub },
    ...withData.map((subject) => ({ v: latestOf(subject), s: sub })),
    { v: "", s: sub },
  ]);

  // ---------------- students ----------------
  const cellOf = (value) => {
    if (value === null) {
      return { v: "-", s: style({ colour: "94A3B8" }) };
    }

    const low = value < MINIMUM;

    return {
      v: value,
      t: "n",
      z: "0.0",
      s: style({
        bold: low,
        colour: low ? "991B1B" : "0F172A",
        fill: low ? "FECACA" : null,
      }),
    };
  };

  list.forEach((student, index) => {
    let attended = 0;
    let eligible = 0;

    const subjectCells = withData.map((subject) => {
      const entry = student.subjects[String(subject._id)];

      if (!entry || !(entry.eligible > 0)) {
        return cellOf(null);
      }

      attended += Number(entry.attended || 0);
      eligible += Number(entry.eligible || 0);

      return cellOf(percent(entry.attended, entry.eligible));
    });

    rows.push([
      { v: index + 1, s: style() },
      { v: student.registerNumber, s: style() },
      { v: student.name, s: style({ align: "left" }) },
      { v: student.batchNumber || "", s: style() },
      ...subjectCells,
      cellOf(percent(attended, eligible)),
    ]);
  });

  rows.push([]);

  rows.push([
    {
      v: `Percentage = classes attended / classes the student was eligible for, at the end of the semester (the latest month entered for each subject). Overall = all subjects together. Red = below ${MINIMUM}%.  - = no attendance entered.`,
      s: style({ colour: "475569", size: 9, align: "left", withBorder: false }),
    },
  ]);

  merges.push({
    s: { r: rows.length - 1, c: 0 },
    e: { r: rows.length - 1, c: width - 1 },
  });

  // ---------------- sheet ----------------
  const sheet = XLSX.utils.aoa_to_sheet(
    rows.map((row) =>
      row.map((cell) => (cell && typeof cell === "object" ? cell.v : cell))
    )
  );

  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (!cell || typeof cell !== "object") {
        return;
      }

      const address = XLSX.utils.encode_cell({ r, c });

      if (!sheet[address]) {
        sheet[address] = { t: "s", v: "" };
      }

      sheet[address].s = cell.s;

      if (cell.z) {
        sheet[address].z = cell.z;
      }
    });
  });

  sheet["!merges"] = merges;
  sheet["!cols"] = [
    { wch: 7 },
    { wch: 15 },
    { wch: 28 },
    { wch: 7 },
    ...withData.map(() => ({ wch: 14 })),
    { wch: 11 },
  ];
  sheet["!rows"] = [{}, {}, {}, {}, { hpt: 42 }];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, sheet, "Attendance %");

  XLSX.writeFile(workbook, fileName);

  return { students: list.length, subjects: withData.length };
}
