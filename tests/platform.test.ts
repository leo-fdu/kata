import assert from "node:assert/strict";
import { test } from "node:test";
import { primaryModifierPressed, shortcutPrefix } from "../src/platform";

test("primary shortcuts accept Command on macOS and Control on Windows", () => {
  assert.equal(primaryModifierPressed({ metaKey: true, ctrlKey: false }), true);
  assert.equal(primaryModifierPressed({ metaKey: false, ctrlKey: true }), true);
  assert.equal(primaryModifierPressed({ metaKey: false, ctrlKey: false }), false);
});

test("shortcut labels match the host platform", () => {
  assert.equal(shortcutPrefix(true), "⌘");
  assert.equal(shortcutPrefix(false), "Ctrl+");
});
