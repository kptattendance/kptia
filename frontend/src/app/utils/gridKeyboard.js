// =====================================================
// SPREADSHEET-STYLE KEYBOARD MOVEMENT
//
// For mark and attendance entry tables. Each input
// carries its place in the table:
//
//   data-grid="ia"   which table
//   data-row="3"     student row
//   data-col="7"     column
//
// Keys:
//   Right arrow / Left arrow   next / previous cell in the row
//   Down arrow / Enter         same column, next student
//   Up arrow / Shift + Enter   same column, previous student
//   Tab / Shift + Tab          the browser's own order
//
// Cells that are disabled (for example a CO with no marks
// in that test, or an absent student) are skipped.
// =====================================================

const cellsOf = (grid) =>
  Array.from(
    document.querySelectorAll(
      `input[data-grid="${grid}"]:not(:disabled)`
    )
  ).map((element) => ({
    element,
    row: Number(element.dataset.row),
    col: Number(element.dataset.col),
  }));

const focusCell = (element) => {
  element.focus();

  // Typing replaces the old value.
  element.select();

  element.scrollIntoView({
    block: "nearest",
    inline: "nearest",
  });
};

export const handleGridKeyDown = (event) => {
  const input = event.currentTarget;

  const grid = input.dataset.grid;
  const row = Number(input.dataset.row);
  const col = Number(input.dataset.col);

  let direction = null;

  switch (event.key) {
    case "ArrowRight":
      direction = "right";
      break;
    case "ArrowLeft":
      direction = "left";
      break;
    case "ArrowDown":
      direction = "down";
      break;
    case "ArrowUp":
      direction = "up";
      break;
    case "Enter":
      direction = event.shiftKey ? "up" : "down";
      break;
    default:
      return;
  }

  const cells = cellsOf(grid);

  let target = null;

  if (direction === "right" || direction === "left") {
    const rowCells = cells
      .filter((cell) => cell.row === row)
      .sort((a, b) => a.col - b.col);

    target =
      direction === "right"
        ? rowCells.find((cell) => cell.col > col)
        : rowCells
            .reverse()
            .find((cell) => cell.col < col);
  } else {
    // Same column; skips students whose cell is
    // disabled (for example marked absent).
    const columnCells = cells
      .filter((cell) => cell.col === col)
      .sort((a, b) => a.row - b.row);

    target =
      direction === "down"
        ? columnCells.find((cell) => cell.row > row)
        : columnCells
            .reverse()
            .find((cell) => cell.row < row);
  }

  // Enter never submits anything here.
  if (event.key === "Enter") {
    event.preventDefault();
  }

  if (target) {
    event.preventDefault();
    focusCell(target.element);
  }
};

// Keeps only digits, and one decimal point when
// decimals are allowed. Used instead of number inputs,
// whose arrows and mouse wheel change the value by
// accident.
export const cleanNumberInput = (
  value,
  allowDecimal = false
) => {
  if (!allowDecimal) {
    return String(value).replace(/\D/g, "");
  }

  const [whole, ...rest] = String(value)
    .replace(/[^\d.]/g, "")
    .split(".");

  return rest.length > 0
    ? `${whole}.${rest.join("").slice(0, 2)}`
    : whole;
};

// Selects the whole value when a cell is entered,
// so that typing replaces it.
export const selectOnFocus = (event) => {
  event.currentTarget.select();
};
