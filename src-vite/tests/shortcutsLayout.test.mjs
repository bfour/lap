import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(
  new URL("../src/common/shortcuts.ts", import.meta.url),
  "utf8",
);
const exports = {};
new Function(
  "exports",
  ts.transpile(source, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  }),
)(exports);
const {
  captureShortcut, findShortcutConflict, findShortcutMatches, findShortcutResetConflict,
  getShortcutAdvanceLabels, getShortcutLabel, isDedupPaneShortcut, isShortcutEditable, matchesShortcut,
  normalizeShortcutOverrides, shouldAdvanceShortcut,
} = exports;

const event = (overrides) => ({
  key: "",
  code: "",
  repeat: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...overrides,
});

const cmd = (key, code, extra = {}) => event({ key, code, metaKey: true, ...extra });

test("fullscreen follows the platform binding without intercepting Favorite", () => {
  for (const platform of ["mac", "windows", "linux"]) {
    const fullscreen = platform === "mac" ? cmd("f", "KeyF", { ctrlKey: true }) : event({ key: "F11" });
    for (const context of ["content", "image-viewer"]) {
      assert.deepEqual(findShortcutMatches(context, fullscreen, platform), ["view.toggleFullscreen"]);
      assert.deepEqual(findShortcutMatches(context, event({ key: "f", code: "KeyF" }), platform), ["meta.favorite"]);
    }
  }
});
test("trash and permanent delete use distinct bindings", () => {
  for (const platform of ["windows", "linux", "mac"]) {
    const trash = event({ key: "Delete" });
    const permanent = platform === "mac"
      ? cmd("Backspace", "Backspace", { altKey: true })
      : event({ key: "Delete", shiftKey: true });
    assert.equal(matchesShortcut("file.trash", trash, platform), true);
    assert.equal(matchesShortcut("file.deletePermanently", trash, platform), false);
    assert.equal(matchesShortcut("file.trash", permanent, platform), false);
    assert.equal(matchesShortcut("file.deletePermanently", permanent, platform), true);
  }
});

test("duplicate shortcuts match only in the Duplicates context", () => {
  const lock = event({ key: "l", code: "KeyL" });
  for (const platform of ["linux", "windows", "mac"]) {
    const deletion = platform === "mac" ? cmd("Backspace", "Backspace") : event({ key: "Delete", code: "Delete" });
    assert.deepEqual(findShortcutMatches("dedup", lock, platform), ["dedup.toggleKeep"]);
    assert.deepEqual(findShortcutMatches("content", lock, platform), []);
    assert.deepEqual(findShortcutMatches("dedup", deletion, platform), ["dedup.deleteSelected"]);
    assert.deepEqual(findShortcutMatches("content", deletion, platform), ["file.trash"]);
    assert.deepEqual(findShortcutMatches("dedup", { ...deletion, shiftKey: true }, platform), ["dedup.deleteSet"]);
  }
});

test("duplicate shortcuts are editable and the focused pane claims them", () => {
  const deletion = captureShortcut(event({ key: "Delete", code: "Delete" }), "linux");
  assert.equal(isShortcutEditable("dedup.toggleKeep", "linux"), true);
  assert.equal(isShortcutEditable("dedup.deleteSet", "mac"), true);
  assert.equal(findShortcutConflict("dedup.toggleKeep", deletion, "linux"), "dedup.deleteSelected");
  const inPane = { closest: (selector) => (selector === "[data-dedup-shortcuts]" ? {} : null) };
  const outside = { closest: () => null };
  assert.equal(isDedupPaneShortcut({ ...event({ key: "l", code: "KeyL" }), target: inPane }, "linux"), true);
  assert.equal(isDedupPaneShortcut({ ...event({ key: "ArrowDown" }), target: inPane }, "linux"), true);
  assert.equal(isDedupPaneShortcut({ ...event({ key: "b", code: "KeyB", ctrlKey: true }), target: inPane }, "linux"), false);
  assert.equal(isDedupPaneShortcut({ ...event({ key: "Delete" }), target: outside }, "linux"), false);
});

test("QWERTY: Cmd-A selects all", () => {
  assert.equal(matchesShortcut("file.selectAll", cmd("a", "KeyA"), "mac"), true);
});

test("AZERTY: Cmd-Q (physical KeyA slot) no longer triggers Select All", () => {
  // On AZERTY the key labelled "Q" sits at the physical KeyA position, so the
  // browser reports code KeyA with key "q". Matching by code made Cmd-Q fire
  // Select All and swallow the system quit accelerator.
  assert.equal(matchesShortcut("file.selectAll", cmd("q", "KeyA"), "mac"), false);
});

test("AZERTY: Cmd-A (physical KeyQ slot) selects all", () => {
  assert.equal(matchesShortcut("file.selectAll", cmd("a", "KeyQ"), "mac"), true);
});

test("Dvorak: the character decides the action, not the physical slot", () => {
  assert.equal(matchesShortcut("file.selectAll", cmd("a", "KeyS"), "mac"), true);
  assert.equal(matchesShortcut("file.selectAll", cmd("q", "KeyA"), "mac"), false);
});

test("Cyrillic layout: non-ASCII keys fall back to the physical slot", () => {
  // Russian layout: Cmd on the physical KeyC slot produces a Cyrillic char,
  // so copy must keep working through the physical code.
  const cyrillicC = event({ key: "\u0441", code: "KeyC", ctrlKey: true });
  assert.equal(matchesShortcut("file.copy", cyrillicC, "windows"), true);
  // The physical KeyA slot (Cyrillic "\u0444") still selects all, preserving
  // the pre-fix behaviour for non-Latin layouts.
  const cyrillicF = event({ key: "\u0444", code: "KeyA", metaKey: true });
  assert.equal(matchesShortcut("file.selectAll", cyrillicF, "mac"), true);
});

test("shifted letter bindings match by character (Shift+R rotates)", () => {
  assert.equal(
    matchesShortcut("meta.rotateCounterclockwise", event({ key: "R", code: "KeyR", shiftKey: true })),
    true,
  );
  assert.equal(
    matchesShortcut("meta.rotateCounterclockwise", event({ key: "r", code: "KeyR", shiftKey: true })),
    true,
  );
});

test("single-letter actions match by character and still allow shift", () => {
  assert.equal(matchesShortcut("meta.culling.pick", event({ key: "p", code: "KeyP" })), true);
  assert.equal(
    matchesShortcut("meta.culling.pick", event({ key: "P", code: "KeyP", shiftKey: true })),
    true,
  );
  assert.equal(matchesShortcut("meta.culling.pick", event({ key: "x", code: "KeyP" })), false);
});

test("non-letter codes: digits and numpad keep exact physical matching", () => {
  assert.equal(
    matchesShortcut("app.scale.increase", cmd("+", "NumpadAdd"), "mac"),
    true,
  );
  // Digit bindings stay physical so shifted digit slots keep working on both
  // layouts: QWERTY Shift+1 produces "!" and AZERTY Shift+1 produces "1",
  // and both reach the Digit1 binding through event.code.
  assert.equal(
    matchesShortcut("meta.rating.one", event({ key: "!", code: "Digit1", shiftKey: true })),
    true,
  );
  assert.equal(
    matchesShortcut("meta.rating.one", event({ key: "1", code: "Digit1", shiftKey: true })),
    true,
  );
});

test("an override replaces the default on its own platform and updates the label", () => {
  const custom = event({ key: "j", code: "KeyJ", ctrlKey: true });
  const overrides = { linux: { "app.sidebar.toggle": captureShortcut(custom, "linux") } };
  const old = event({ key: "b", code: "KeyB", ctrlKey: true });
  assert.equal(matchesShortcut("app.sidebar.toggle", old, "linux", overrides), false);
  assert.equal(matchesShortcut("app.sidebar.toggle", old, "windows", overrides), true);
  assert.equal(matchesShortcut("app.sidebar.toggle", custom, "linux", overrides), true);
  assert.equal(getShortcutLabel("app.sidebar.toggle", "linux", overrides), "Ctrl+J");
});

test("assignments detect overlapping scopes, secondary bindings, and implicit Shift variants", () => {
  const ctrlC = captureShortcut(event({ key: "c", code: "KeyC", ctrlKey: true }), "linux");
  assert.equal(findShortcutConflict("app.search", ctrlC, "linux"), "file.copy");
  const space = captureShortcut(event({ key: " ", code: "Space" }), "linux");
  assert.equal(findShortcutConflict("meta.tag", space, "linux"), "view.quickPreview");
  const b = captureShortcut(event({ key: "b", code: "KeyB" }), "linux");
  const overrides = { linux: { "meta.collection": captureShortcut(event({ key: "g", code: "KeyG" }), "linux") } };
  assert.equal(findShortcutConflict("meta.favorite", b, "linux", overrides), "view.cycleBackground");
  const shiftedDigit = captureShortcut(event({ key: "!", code: "Digit1", shiftKey: true }), "linux");
  assert.equal(findShortcutConflict("meta.tag", shiftedDigit, "linux"), "meta.rating.one");
  const modifiedDigit = captureShortcut(event({ key: "j", code: "KeyJ", shiftKey: true }), "linux");
  assert.equal(findShortcutConflict("meta.tag", modifiedDigit, "linux"), undefined);
});

test("restoring a default detects another action that now uses that binding", () => {
  const makeBinding = (key) => captureShortcut(event({ key, code: "Key" + key.toUpperCase() }), "linux");
  const overrides = { linux: { "meta.favorite": makeBinding("j"), "meta.tag": makeBinding("f") } };
  assert.equal(findShortcutResetConflict("meta.favorite", "linux", overrides), "meta.tag");
  assert.equal(findShortcutResetConflict("view.quickPreview", "linux", overrides), undefined);
});

test("an explicit Shift shortcut performs the base action while the automatic variant advances", () => {
  const press = event({ key: "J", code: "KeyJ", shiftKey: true });
  const explicit = { linux: { "meta.favorite": captureShortcut(press, "linux") } };
  assert.equal(matchesShortcut("meta.favorite", press, "linux", explicit), true);
  assert.equal(shouldAdvanceShortcut("meta.favorite", press, "linux", explicit), false);
  assert.deepEqual(getShortcutAdvanceLabels("meta.favorite", "linux", explicit), []);
  const automatic = { linux: { "meta.favorite": captureShortcut({ ...press, key: "j", shiftKey: false }, "linux") } };
  assert.equal(matchesShortcut("meta.favorite", press, "linux", automatic), true);
  assert.equal(shouldAdvanceShortcut("meta.favorite", press, "linux", automatic), true);
  assert.deepEqual(getShortcutAdvanceLabels("meta.favorite", "linux", automatic), ["Shift+J"]);
});

test("saved overrides are normalized and reserved keyboard controls stay available", () => {
  assert.equal(captureShortcut(cmd("q", "KeyA"), "mac"), null);
  assert.equal(captureShortcut(event({ key: "Tab", code: "Tab" }), "linux"), null);
  assert.equal(isShortcutEditable("view.close", "linux"), false);
  assert.equal(isShortcutEditable("app.preferences", "mac"), false);
  assert.equal(isShortcutEditable("app.preferences", "linux"), true);
  const valid = { key: "j", code: "KeyJ", modifiers: ["ctrl"] };
  assert.deepEqual(normalizeShortcutOverrides({
    mac: { "app.preferences": valid },
    linux: { "file.copy": null, "unknown.action": valid, "app.sidebar.toggle": valid },
  }), { linux: { "app.sidebar.toggle": valid } });
});

test("punctuation codes follow the layout character too", () => {
  // AZERTY places the comma on the physical Semicolon slot: Cmd-, must open
  // preferences, and the physical Comma slot (producing "m") must not.
  assert.equal(matchesShortcut("app.preferences", cmd(",", "Semicolon"), "mac"), true);
  assert.equal(matchesShortcut("app.preferences", cmd("m", "Comma"), "mac"), false);
  // Slash search: the AZERTY Slash slot produces ":" and must not match.
  assert.equal(matchesShortcut("app.search", cmd("/", "Slash"), "mac"), true);
  assert.equal(matchesShortcut("app.search", cmd(":", "Slash"), "mac"), false);
});

test("context scan: no letter shortcut fires for AZERTY Cmd-Q in content", () => {
  const matches = findShortcutMatches("content", cmd("q", "KeyA"), "mac");
  assert.equal(matches.includes("file.selectAll"), false);
});

test("modifier discipline is unchanged", () => {
  // Cmd-A without the modifier must not select all.
  assert.equal(matchesShortcut("file.selectAll", event({ key: "a", code: "KeyA" }), "mac"), false);
  // Ctrl-A is the non-mac binding.
  assert.equal(
    matchesShortcut("file.selectAll", event({ key: "a", code: "KeyA", ctrlKey: true }), "windows"),
    true,
  );
  // Alt must not be silently accepted.
  assert.equal(
    matchesShortcut("file.selectAll", cmd("a", "KeyA", { altKey: true }), "mac"),
    false,
  );
});

 test('copy path has distinct cross-platform bindings', () => {
   for (const platform of ['mac', 'windows', 'linux']) {
     const e = event({key:'c',code:'KeyC', ...(platform === 'mac' ? {metaKey:true,altKey:true} : {ctrlKey:true,shiftKey:true})});
     assert.equal(matchesShortcut('file.copyPath',e,platform),true);
     assert.equal(matchesShortcut('file.copy',e,platform),false);
     assert.deepEqual(findShortcutMatches('content',e,platform),['file.copyPath']);
   }
 });

test('macOS retains Shift-Cmd-C as copy while Windows and Linux reserve Ctrl-Shift-C for paths', () => {
  assert.equal(matchesShortcut('file.copy', cmd('C', 'KeyC', {shiftKey: true}), 'mac'), true);
  for (const platform of ['windows', 'linux']) {
    const e = event({key:'C',code:'KeyC',ctrlKey:true,shiftKey:true});
    assert.equal(matchesShortcut('file.copy',e,platform),false);
    assert.equal(matchesShortcut('file.copyPath',e,platform),true);
  }
});

test('editing, external opening and album moves have distinct bindings', () => {
  for (const platform of ['mac', 'windows', 'linux']) {
    const modifier = platform === 'mac' ? { metaKey: true } : { ctrlKey: true };
    for (const [letter, shiftKey, action] of [
      ['E', false, 'file.editImage'],
      ['E', true, 'file.openExternalApp'],
      ['M', true, 'file.moveTo'],
      ['I', false, 'file.invertSelection'],
    ]) {
      const input = event({ key: letter.toLowerCase(), code: 'Key' + letter, ...modifier, shiftKey });
      assert.deepEqual(findShortcutMatches('content', input, platform), [action]);
    }
    assert.deepEqual(findShortcutMatches('content', event({ key: 'i', code: 'KeyI' }), platform), ['meta.info']);
    for (const context of ['content', 'media-viewer', 'image-viewer']) {
      assert.deepEqual(findShortcutMatches(context, event({ key: 'm', code: 'KeyM' }), platform), ['meta.edit']);
    }
    for (const letter of ['A', 'D', 'E']) {
      const input = event({ key: letter.toLowerCase(), code: 'Key' + letter });
      assert.deepEqual(findShortcutMatches('content', input, platform), []);
    }
    for (const [letter, action] of [['A', 'view.toggleAfAreas'], ['R', 'view.cycleRawPreview']]) {
      const input = event({ code: 'Key' + letter, altKey: true, key: platform === 'mac' ? (letter === 'A' ? 'å' : '®') : letter.toLowerCase() });
      assert.deepEqual(findShortcutMatches('content', input, platform), [action]);
    }
  }
});
