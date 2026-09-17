// Browser-fallback interaction smoke test using an already-running Chrome DevTools port.
// Start Vite, then headless Chrome with --remote-debugging-port=9229 before running.
import assert from "node:assert/strict";

const tabs = await fetch("http://127.0.0.1:9229/json/list").then((response) => response.json());
const page = tabs.find((tab) => tab.type === "page" && tab.url.includes("localhost:1420"));
assert(page, "Kata Vite page is not open");
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 1;
const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const callbacks = pending.get(message.id);
  if (!callbacks) return;
  pending.delete(message.id);
  if (message.error) callbacks.reject(new Error(message.error.message));
  else callbacks.resolve(message.result);
};

function send(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
assert.equal(await evaluate('document.querySelector(".go-board")?.getAttribute("aria-label")'), "19 by 19 Go board");
await evaluate('document.querySelector("button[aria-label=\\"New game\\"]").click()');
await pause();
assert.equal(await evaluate('document.querySelector(".new-game-window h2")?.textContent'), "New game");
await evaluate(`(() => { const select = document.querySelectorAll('.new-game-window select')[1];
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(select, '9'); select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await evaluate('document.querySelector(".new-game-window .primary-button").click()');
await pause();
assert.equal(await evaluate('document.querySelector(".go-board")?.getAttribute("aria-label")'), "9 by 9 Go board");
await evaluate(`(() => { const board = document.querySelector('.go-board'); const rect = board.getBoundingClientRect();
  board.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 })); })()`);
await pause();
assert.equal(await evaluate('document.querySelectorAll(".stones .stone").length'), 1);
assert.equal(await evaluate('document.querySelector(".document-title small")?.textContent'), "Move 1");
await evaluate('document.querySelector("button[aria-label=\\"Previous move\\"]").click()');
await pause();
assert.equal(await evaluate('document.querySelectorAll(".stones .stone").length'), 0);
await evaluate('document.querySelector("button[aria-label=\\"Settings\\"]").click()');
await pause();
assert.equal(await evaluate('document.querySelector(".settings-window h2")?.textContent'), "Settings");
socket.close();
console.log("UI smoke test passed: new game, 9×9 board, stone placement, navigation, settings");
