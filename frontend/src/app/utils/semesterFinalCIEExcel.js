// =====================================================
// FINAL IA OF EVERY SUBJECT (Excel)
//
// HOD download: one row per student, the final CIE of
// every subject of the semester, then the total of all
// subjects.
//
// data comes from /api/hod/ia/semester-final:
//   subjects: [{ _id, code, name, cieMax, cieMin, parts }]
//   students: [{ registerNumber, name, batchNumber,
//                finals: { [subjectId]: { final, improved } } }]
//
// Red = below the subject minimum. Green = an
// improvement test was used. "-" = the student has no
// marks in that subject (an elective or bridge course
// not taken, or no IA entered).
// =====================================================

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

export const semesterFinalCIEFileName = ({
  department,
  semester,
  academicYear,
}) =>
  `Final_IA_${String(department || "").toUpperCase()}_Sem${semester}_${academicYear}.xlsx`;

export function exportSemesterFinalCIEExcel(
  XLSX,
  { departmentLabel, semester, academicYear, data, fileName }
) {
  const { subjects, students } = data;

  const width = 4 + subjects.length + 3;

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
  titleRow("FINAL IA MARKS - ALL SUBJECTS", { bold: true, size: 12 });
  titleRow(
    `${departmentLabel}  |  Semester ${semester}  |  Academic Year ${academicYear}  |  ${students.length} students`,
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
    ...subjects.map((subject) => ({
      v: `${subject.code}\n${subject.name}`,
      s: head,
    })),
    { v: "Total", s: head },
    { v: "Out of", s: head },
    { v: "Subjects below minimum", s: head },
  ]);

  const sub = style({ colour: "475569", fill: "F1F5F9", size: 9 });

  rows.push([
    { v: "", s: sub },
    { v: "", s: sub },
    { v: "", s: sub },
    { v: "", s: sub },
    ...subjects.map((subject) => ({
      v: `/${subject.cieMax} · min ${subject.cieMin}`,
      s: sub,
    })),
    { v: "", s: sub },
    { v: "", s: sub },
    { v: "", s: sub },
  ]);

  // ---------------- students ----------------
  students.forEach((student, index) => {
    let total = 0;
    let outOf = 0;
    let below = 0;

    const cells = subjects.map((subject) => {
      const entry = student.finals?.[subject._id];

      if (!entry || entry.final === null || entry.final === undefined) {
        return { v: "-", s: style({ colour: "94A3B8" }) };
      }

      const low = entry.final < subject.cieMin;

      total += entry.final;
      outOf += subject.cieMax;

      if (low) {
        below += 1;
      }

      return {
        v: entry.final,
        s: style({
          bold: low,
          colour: low ? "991B1B" : "0F172A",
          fill: low ? "FECACA" : entry.improved ? "DCFCE7" : null,
        }),
      };
    });

    rows.push([
      { v: index + 1, s: style() },
      { v: student.registerNumber, s: style() },
      { v: student.name, s: style({ align: "left" }) },
      { v: student.batchNumber || "", s: style() },
      ...cells,
      { v: total, s: style({ bold: true, fill: "F1F5F9" }) },
      { v: outOf, s: style({ colour: "475569" }) },
      {
        v: below,
        s: style({
          bold: below > 0,
          colour: below > 0 ? "991B1B" : "0F172A",
        }),
      },
    ]);
  });

  rows.push([]);

  rows.push([
    {
      v: "Final IA = average of IA 1 to 4 and CIE 5 entered for the subject, each scaled to the subject maximum, with the improvement test when higher; rounded up to a whole number. Red = below the subject minimum. Green = improvement test used. - = no marks in that subject (elective or bridge course not taken, or no IA entered). Total and Out of count only the subjects the student has marks in.",
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
    });
  });

  sheet["!merges"] = merges;
  sheet["!cols"] = [
    { wch: 7 },
    { wch: 15 },
    { wch: 28 },
    { wch: 7 },
    ...subjects.map(() => ({ wch: 14 })),
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
  ];
  sheet["!rows"] = [{}, {}, {}, {}, { hpt: 54 }];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, sheet, "Final IA");

  XLSX.writeFile(workbook, fileName);
}
