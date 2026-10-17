import assert from "node:assert/strict";
import { test } from "node:test";
import { applyIndentKey, detectIndentUnit } from "../src/utils/indent.ts";

const tab = { key: "Tab", shiftKey: false };
const shiftTab = { key: "Tab", shiftKey: true };
const enter = { key: "Enter", shiftKey: false };

test("the indent unit follows the existing text", () => {
  assert.equal(detectIndentUnit("allow if {\n\tinput.x\n}"), "\t");
  assert.equal(detectIndentUnit("allow if {\n    input.x\n}"), "    ");
  assert.equal(detectIndentUnit(""), "\t");
});

test("Tab inserts one indent unit at the cursor", () => {
  const out = applyIndentKey(
    { value: "ab", selectionStart: 1, selectionEnd: 1 },
    tab,
  );
  assert.deepEqual(out, { value: "a\tb", selectionStart: 2, selectionEnd: 2 });
});

test("Tab on a multi-line selection indents every selected line", () => {
  const out = applyIndentKey(
    { value: "a\nb\nc", selectionStart: 0, selectionEnd: 3 },
    tab,
  );
  assert.equal(out?.value, "\ta\n\tb\nc");
  assert.equal(out?.selectionEnd, 5);
});

test("Shift+Tab removes one level, tab or up to four spaces", () => {
  const tabs = applyIndentKey(
    { value: "\ta\n\tb", selectionStart: 0, selectionEnd: 5 },
    shiftTab,
  );
  assert.equal(tabs?.value, "a\nb");

  const spaces = applyIndentKey(
    { value: "    a\n  b", selectionStart: 0, selectionEnd: 9 },
    shiftTab,
  );
  assert.equal(spaces?.value, "a\nb");
});

test("Shift+Tab on an unindented line changes nothing", () => {
  const out = applyIndentKey(
    { value: "a", selectionStart: 1, selectionEnd: 1 },
    shiftTab,
  );
  assert.equal(out?.value, "a");
  assert.equal(out?.selectionStart, 1);
});

test("Enter keeps the current line's indentation", () => {
  const out = applyIndentKey(
    { value: "\tfoo", selectionStart: 4, selectionEnd: 4 },
    enter,
  );
  assert.deepEqual(out, {
    value: "\tfoo\n\t",
    selectionStart: 6,
    selectionEnd: 6,
  });
});

test("Enter after an opening brace adds one more level", () => {
  const out = applyIndentKey(
    { value: "allow if {", selectionStart: 10, selectionEnd: 10 },
    enter,
  );
  assert.equal(out?.value, "allow if {\n\t");
});

test("other keys are left to the browser", () => {
  const out = applyIndentKey(
    { value: "a", selectionStart: 1, selectionEnd: 1 },
    { key: "a", shiftKey: false },
  );
  assert.equal(out, null);
});
