import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GoBoard } from "../src/board/GoBoard";
import { App } from "../src/App";
import { NewGamePane } from "../src/game/NewGamePane";
import { ConfirmDiscardPane } from "../src/game/ConfirmDiscardPane";
import { SettingsPane } from "../src/settings/SettingsPane";
import { defaultSettings } from "../src/settings/types";

test("candidate overlay shows current-player winrate in green and outlines the best move", () => {
  const markup = renderToStaticMarkup(createElement(GoBoard, {
    size: 9, stones: [], nextPlayer: "white", occupiedPoints: new Set(), onPlayMove() {},
    candidates: [
      { move: "D4", order: 0, visits: 20, scoreLead: 0, winrate: 0.2, pv: [] },
      { move: "E4", order: 1, visits: 10, scoreLead: 0, winrate: 0.4, pv: [] },
    ],
  }));
  assert.match(markup, /candidate-best-outline/);
  assert.match(markup, />80%<\/text>/);
  assert.match(markup, />60%<\/text>/);
  assert.match(markup, /fill="hsl\(146 50% 40%\)"/);
  assert.match(markup, /fill="hsl\(146 50% 49%\)"/);
});

test("main board has no bottom chart and keeps Pass above the board", () => {
  const markup = renderToStaticMarkup(createElement(App));
  const context = markup.indexOf('class="board-context"');
  const pass = markup.indexOf('class="pass-button"');
  const board = markup.indexOf('class="board-stage"');
  assert.ok(context >= 0 && context < pass && pass < board);
  assert.doesNotMatch(markup, /evaluation-strip|Score history|Analyze whole game/);
});

test("new game dialog exposes all requested modes and handicap choices", () => {
  const markup = renderToStaticMarkup(createElement(NewGamePane, { onCreate() {}, onClose() {} }));
  assert.match(markup, /Human vs Human/);
  assert.match(markup, /Human vs KataGo/);
  assert.match(markup, /Black first · no komi/);
  assert.match(markup, /9 handicap stones/);
});

test("unsaved games use a visible in-app confirmation instead of a silent browser dialog", () => {
  const markup = renderToStaticMarkup(createElement(ConfirmDiscardPane, {
    action: "new", onCancel() {}, onConfirm() {},
  }));
  assert.match(markup, /aria-label="Unsaved game"/);
  assert.match(markup, /Keep playing/);
  assert.match(markup, /Discard and continue/);
});

test("engine settings explain that KataGo must be supplied separately", () => {
  const markup = renderToStaticMarkup(createElement(SettingsPane, {
    settings: defaultSettings, onSave: async () => {}, onClose() {},
    onRestart: async () => {}, engineLog: [],
  }));
  assert.match(markup, /Kata does not include KataGo/);
  assert.match(markup, /analysis configuration \(not a GTP configuration\)/);
  assert.match(markup, /Choose kataGo executable/i);
});
