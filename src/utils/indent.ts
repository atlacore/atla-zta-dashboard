// Code-editor style indentation for a plain textarea: Tab / Shift+Tab and indent-keeping Enter.
// Pure on purpose so it can be tested without a DOM (`yarn test`).

export type EditState = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export type KeyInput = {
  key: string;
  shiftKey: boolean;
};

const SPACE_UNIT = "    ";
const OPENERS = new Set(["{", "[", "("]);

// Follows what the text already uses (tabs as `opa fmt` writes them, or 4 spaces); tabs when empty.
export function detectIndentUnit(value: string): string {
  if (/^\t/m.test(value)) return "\t";
  if (/^ {2,}\S/m.test(value)) return SPACE_UNIT;
  return "\t";
}

function lineStart(value: string, index: number): number {
  return value.lastIndexOf("\n", index - 1) + 1;
}

function indentLines(state: EditState, unit: string): EditState {
  const { value, selectionStart, selectionEnd } = state;
  const first = lineStart(value, selectionStart);
  // A selection ending right after a newline does not include the following line.
  const end =
    selectionEnd > selectionStart && value[selectionEnd - 1] === "\n"
      ? selectionEnd - 1
      : selectionEnd;
  const block = value.slice(first, end);
  const lines = block.split("\n");
  const indented = lines.map((line) => unit + line).join("\n");
  return {
    value: value.slice(0, first) + indented + value.slice(end),
    selectionStart: selectionStart + unit.length,
    selectionEnd: selectionEnd + unit.length * lines.length,
  };
}

function outdentLines(state: EditState, unit: string): EditState {
  const { value, selectionStart, selectionEnd } = state;
  const first = lineStart(value, selectionStart);
  const end =
    selectionEnd > selectionStart && value[selectionEnd - 1] === "\n"
      ? selectionEnd - 1
      : selectionEnd;
  const lines = value.slice(first, end).split("\n");

  const removed: number[] = [];
  const outdented = lines.map((line) => {
    let cut = 0;
    if (line.startsWith("\t")) cut = 1;
    else {
      while (cut < unit.length && line[cut] === " ") cut++;
    }
    removed.push(cut);
    return line.slice(cut);
  });

  const total = removed.reduce((sum, n) => sum + n, 0);
  return {
    value: value.slice(0, first) + outdented.join("\n") + value.slice(end),
    selectionStart: Math.max(first, selectionStart - removed[0]),
    selectionEnd: Math.max(first, selectionEnd - total),
  };
}

function insertNewline(state: EditState, unit: string): EditState {
  const { value, selectionStart, selectionEnd } = state;
  const start = lineStart(value, selectionStart);
  const currentIndent = /^[\t ]*/.exec(value.slice(start, selectionStart))![0];
  const extra = OPENERS.has(value[selectionStart - 1] ?? "") ? unit : "";
  const insert = "\n" + currentIndent + extra;
  return {
    value: value.slice(0, selectionStart) + insert + value.slice(selectionEnd),
    selectionStart: selectionStart + insert.length,
    selectionEnd: selectionStart + insert.length,
  };
}

// Returns the new text and selection, or null when the key is not ours and should behave as usual.
export function applyIndentKey(
  state: EditState,
  input: KeyInput,
): EditState | null {
  const unit = detectIndentUnit(state.value);
  const multiLine = state.value
    .slice(state.selectionStart, state.selectionEnd)
    .includes("\n");

  if (input.key === "Tab" && input.shiftKey) return outdentLines(state, unit);
  if (input.key === "Tab" && multiLine) return indentLines(state, unit);
  if (input.key === "Tab") {
    const { value, selectionStart, selectionEnd } = state;
    return {
      value: value.slice(0, selectionStart) + unit + value.slice(selectionEnd),
      selectionStart: selectionStart + unit.length,
      selectionEnd: selectionStart + unit.length,
    };
  }
  if (input.key === "Enter" && !input.shiftKey) {
    return insertNewline(state, unit);
  }
  return null;
}
