import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Titlebar } from "../src/components/Titlebar";

test("the title and its non-interactive children can start a native window drag", () => {
  const markup = renderToStaticMarkup(createElement(Titlebar, {
    title: "Untitled Game", dirty: false, moveNumber: 0,
    analysisEnabled: true, canUndo: false, canRedo: false, browserOpen: false,
    onToggleBrowser() {}, onOpen() {}, onSave() {}, onNewGame() {},
    onUndo() {}, onRedo() {}, onSettings() {}, onToggleAnalysis() {},
  }));
  const header = markup.match(/^<header[^>]*>/)?.[0] ?? "";
  const title = markup.match(/<div class="document-title"[^>]*>/)?.[0] ?? "";
  assert.match(header, /data-tauri-drag-region="deep"/);
  assert.match(title, /data-tauri-drag-region="deep"/);
  assert.doesNotMatch(markup, /<button[^>]*data-tauri-drag-region/);
});

test("the main window is permitted to start a native drag", () => {
  const capability = JSON.parse(readFileSync("src-tauri/capabilities/default.json", "utf8"));
  assert(capability.windows.includes("main"));
  assert(capability.permissions.includes("core:window:allow-start-dragging"));
});
