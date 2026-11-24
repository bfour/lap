import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApp, computed, nextTick } from 'vue';
import { createPinia, defineStore } from 'pinia';
import { createPersistedState } from 'pinia-plugin-persistedstate';
import ts from 'typescript';

const fieldSource = readFileSync(new URL('../src/common/fileInfoFields.ts', import.meta.url), 'utf8');
const { defaultFileInfoFields } = await import(`data:text/javascript;base64,${Buffer.from(ts.transpile(fieldSource, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })).toString('base64')}`);
const shortcutSource = readFileSync(new URL('../src/common/shortcuts.ts', import.meta.url), 'utf8');
const { normalizeShortcutOverrides } = await import(`data:text/javascript;base64,${Buffer.from(ts.transpile(shortcutSource, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })).toString('base64')}`);
const storeSource = readFileSync(new URL('../src/stores/configStore.js', import.meta.url), 'utf8');
const loadStore = new Function('defineStore', 'SIDEBAR', 'MAP_MARKER_SIZES', 'defaultFileInfoFields', 'normalizeShortcutOverrides', 'emit',
  storeSource.replace(/^import .*;\n/gm, '').replace(/^export const /gm, 'const ')
  + ';return { useConfigStore, SHORTCUT_BINDINGS_CHANGED };');
const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
function extractListener(prefix) {
  const start = mainSource.indexOf(prefix);
  return mainSource.slice(start, mainSource.indexOf('\n})', start) + 3);
}
const afListener = extractListener("listen('af-area-display-changed'");
const shortcutListener = extractListener('listen(SHORTCUT_BINDINGS_CHANGED');
const viewerSource = readFileSync(new URL('../src/components/MediaViewer.vue', import.meta.url), 'utf8');
const preference = viewerSource.slice(viewerSource.indexOf('const showAfAreas = computed('), viewerSource.indexOf('const afAreaFeedbackRequest ='));

function fixture(legacy = false) {
  const data = new Map(legacy ? [['configStore', JSON.stringify({ mediaViewer: { isPinned: false } })]] : []);
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const listeners = new Map();
  const events = [];
  function listen(name, callback) {
    if (!listeners.has(name)) listeners.set(name, []);
    listeners.get(name).push(callback);
  }
  async function emit(name, payload) {
    events.push({ name, payload });
    for (const callback of listeners.get(name) ?? []) callback({ payload });
  }
  const { useConfigStore, SHORTCUT_BINDINGS_CHANGED } = loadStore(
    defineStore, { ALBUM: 1 }, [], defaultFileInfoFields, normalizeShortcutOverrides, emit,
  );
  function windowStore() {
    const pinia = createPinia();
    pinia.use(createPersistedState({ storage }));
    createApp({}).use(pinia);
    const config = useConfigStore(pinia);
    new Function('listen', 'config', afListener)(listen, config);
    new Function('listen', 'config', 'SHORTCUT_BINDINGS_CHANGED', shortcutListener)(listen, config, SHORTCUT_BINDINGS_CHANGED);
    const toggle = new Function('computed', 'config', 'tauriEmit', ts.transpile(preference, {target: ts.ScriptTarget.ES2022})
      + ';return showAfAreas;')(computed, config, emit);
    return { config, toggle };
  }
  return { windowStore, events };
}

test('AF display defaults to off for existing preferences and persists both toggle states', async () => {
  const f = fixture(true);
  const first = f.windowStore();
  assert.equal(first.toggle.value, false);
  assert.equal(first.config.mediaViewer.isPinned, false);
  first.toggle.value = true;
  await nextTick();
  const reopened = f.windowStore();
  assert.equal(reopened.toggle.value, true);
  reopened.toggle.value = false;
  await nextTick();
  assert.equal(f.windowStore().toggle.value, false);
});

test('shortcut changes sync to open windows and survive unrelated writes and reopening', async () => {
  const f = fixture(true);
  const settings = f.windowStore();
  const main = f.windowStore();
  const action = 'app.sidebar.toggle';
  const binding = { key: 'j', code: 'KeyJ', modifiers: ['ctrl'] };
  assert.deepEqual(settings.config.shortcutBindings, {});

  settings.config.setShortcutBinding(action, 'linux', binding);
  assert.deepEqual(main.config.shortcutBindings.linux[action], binding);
  main.config.mediaViewer.isPinned = true;
  await nextTick();
  assert.deepEqual(f.windowStore().config.shortcutBindings.linux[action], binding);
  assert.equal(f.events.length, 1);

  settings.config.resetShortcutBindings('linux');
  await nextTick();
  assert.deepEqual(main.config.shortcutBindings, {});
  assert.deepEqual(f.windowStore().config.shortcutBindings, {});
  assert.equal(f.events.length, 2);
});

test('all viewer panes and windows retain the preference across unrelated config writes without event loops', async () => {
  const f = fixture();
  const main = f.windowStore();
  const preview = f.windowStore();
  const settings = f.windowStore();
  preview.toggle.value = true;
  await nextTick();
  assert.equal(main.toggle.value, true);
  assert.equal(settings.toggle.value, true);
  assert.equal(f.events.length, 1);
  main.config.mediaViewer.isPinned = false;
  await nextTick();
  settings.config.settings.language = 'zh-CN';
  await nextTick();
  assert.equal(f.windowStore().toggle.value, true);
  main.toggle.value = false;
  await nextTick();
  assert.equal(preview.toggle.value, false);
  assert.equal(settings.toggle.value, false);
  assert.equal(f.events.length, 2);
  assert.equal(f.windowStore().toggle.value, false);
});
