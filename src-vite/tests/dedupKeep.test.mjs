import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { ref } from 'vue';

const source = fs.readFileSync(new URL('../src/components/DedupPane.vue', import.meta.url), 'utf8');
const start = source.indexOf('async function setKeep(');
const end = source.indexOf('function duplicateActionTitle(', start);
assert.ok(start >= 0 && end > start);
const navigation = source.slice(source.indexOf('function handleDuplicateSelection('), source.indexOf('function handleSimilarSelection('));
const code = ts.transpile(navigation + source.slice(start, end), { target: ts.ScriptTarget.ES2022 });

const reconciliation = ts.transpile(source.slice(
  source.indexOf('function canSelectForDeletion('),
  source.indexOf('function getSimilarSelectedSet('),
), { target: ts.ScriptTarget.ES2022 });

function duplicate(id, keep = false, overrides = {}) {
  return {
    file_id: id,
    is_keep: Number(keep),
    can_delete: !keep,
    file: { id, name: `copy-${id}.jpg` },
    ...overrides,
  };
}

function selectionFixture(initialSelection) {
  const selections = new Map();
  if (initialSelection) selections.set(7, new Set(initialSelection));
  const reconcile = new Function('selectedDupIdsByGroup', 'isOriginalUnavailable',
    `${reconciliation};return reconcileDuplicateSelection;`)(ref(selections), file => file?.unavailable === true);
  return { reconcile, selected: () => Array.from(selections.get(7)) };
}

test('untouched duplicate groups check all available, deletable non-keeps', () => {
  const { reconcile, selected } = selectionFixture();
  const items = [
    duplicate(1, true, { can_delete: true }),
    duplicate(2),
    duplicate(3, false, { can_delete: false }),
    duplicate(4, false, { file: { unavailable: true } }),
  ];
  reconcile(7, [], items);
  assert.deepEqual(selected(), [2]);
});

test('changing keep removes the locked selection and checks newly unlocked photos only', () => {
  const { reconcile, selected } = selectionFixture([2, 3]);
  const initial = [duplicate(1, true), duplicate(2), duplicate(3), duplicate(4)];
  const locked = [duplicate(1, true), duplicate(2, true), duplicate(3), duplicate(4)];
  reconcile(7, initial, locked);
  assert.deepEqual(selected(), [3]);
  reconcile(7, locked, [duplicate(1), duplicate(2, true), duplicate(3), duplicate(4)]);
  assert.deepEqual(selected(), [1, 3]);
});

test('an unlocked file protected by pair rules or unavailable stays unchecked', () => {
  const { reconcile, selected } = selectionFixture([3]);
  reconcile(7, [duplicate(1, true), duplicate(2, true), duplicate(3)], [
    duplicate(1, false, { can_delete: false }),
    duplicate(2, false, { file: { unavailable: true } }),
    duplicate(3, true),
  ]);
  assert.deepEqual(selected(), []);
});

function keepFixture(items, detail, { initialSelection = [], save = async () => {} } = {}) {
  const calls = [];
  const rawGroups = ref([{ id: 7, items }]);
  const selection = selectionFixture(initialSelection);
  const libConfig = { _libraryId: 'library-1' };
  const dependencies = {
    rawGroups,
    libConfig,
    props: { dedupScanKey: 'scan-1', selectedFileId: 1 },
    scanGeneration: ref(1),
    selectedGroupId: ref(7),
    isChangingDuplicateKeep: ref(false),
    duplicateAccessPending: ref(false),
    dedupSetKeep: async (...args) => { calls.push(['setKeep', ...args]); await save(); },
    dedupGetGroupItems: async () => detail,
    emitDedupStatuses: () => calls.push(['statuses']),
    refreshOverview: async () => calls.push(['overview']),
    emit: (...args) => calls.push(['emit', ...args]),
    reconcileDuplicateSelection: selection.reconcile,
  };
  const setKeep = new Function(...Object.keys(dependencies),
    `${code};return setKeep;`)(...Object.values(dependencies));
  return { calls, libConfig, rawGroups, setKeep, selected: selection.selected };
}

test('setKeep preserves both locks, existing row order and hydrated thumbnails', async () => {
  const first = duplicate(1, true, { file: { name: 'keep.raw', thumbnail: 'cached' } });
  const f = keepFixture(
    [first, duplicate(2), duplicate(3)],
    [duplicate(2, true), duplicate(1, true), duplicate(3)],
    { initialSelection: [2, 3] },
  );
  await f.setKeep(7, 2);
  assert.deepEqual(f.calls, [
    ['setKeep', 7, 2, true], ['statuses'], ['overview'], ['emit', 'select-file', 2, undefined],
  ]);
  assert.deepEqual(f.selected(), [3]);
  const items = f.rawGroups.value[0].items;
  assert.deepEqual(items.map(item => item.file_id), [1, 2, 3]);
  assert.deepEqual(items.map(item => [item.is_keep, item.can_delete]), [[1, false], [1, false], [0, true]]);
  assert.equal(items[0].file.thumbnail, 'cached');
});

test('unlocking uses the refreshed delete permission and keeps RAW navigation', async () => {
  const f = keepFixture(
    [duplicate(1, true), duplicate(2, true)],
    [duplicate(1, false, { can_delete: false, raw_pair_primary_id: 10 }), duplicate(2, true)],
  );
  await f.setKeep(7, 1);
  assert.deepEqual(f.calls[0], ['setKeep', 7, 1, false]);
  assert.deepEqual(f.calls.at(-1), ['emit', 'select-file', 1, 10]);
  assert.deepEqual(f.selected(), []);
  assert.equal(f.rawGroups.value[0].items[0].can_delete, false);
});

test('a protected keep issues no update and a library change discards an outstanding response', async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const f = keepFixture(
    [duplicate(1, true, { can_set_keep: false }), duplicate(2)],
    [duplicate(1, true), duplicate(2, true)],
    { save: () => pending },
  );
  await f.setKeep(7, 1);
  assert.deepEqual(f.calls, []);
  const update = f.setKeep(7, 2);
  f.libConfig._libraryId = 'library-2';
  finish();
  await update;
  assert.deepEqual(f.calls, [['setKeep', 7, 2, true]]);
  assert.equal(f.rawGroups.value[0].items[1].is_keep, 0);
});

test('folder priority can target ancestors up to the album root', () => {
  const utilities = fs.readFileSync(new URL('../src/common/utils.ts', import.meta.url), 'utf8');
  const pathHelpers = utilities.slice(utilities.indexOf('export function getFolderPath('),
    utilities.indexOf('export function buildFolderBreadcrumbs(')).replace(/^export /gm, '');
  const folderChoices = source.slice(source.indexOf('function folderAndAncestorPaths('),
    source.indexOf('function openKeepRules('));
  const choicesFor = new Function('separator', ts.transpile(pathHelpers + folderChoices)
    + '; return folderAndAncestorPaths;');

  const unix = choicesFor('/');
  assert.deepEqual(unix('/Photos/Archive/2025', '/Photos'), ['/Photos/Archive/2025', '/Photos/Archive', '/Photos']);
  assert.deepEqual(unix('/Photos backup/Archive', '/Photos'), ['/Photos backup/Archive']);
  assert.deepEqual(unix('/Photos/Archive', '/'), ['/Photos/Archive', '/Photos', '/']);
  assert.deepEqual(unix('/Photos', '/Photos'), ['/Photos']);

  const windows = choicesFor('\\');
  assert.deepEqual(windows('C:\\Photos\\Archive', 'c:\\'), ['C:\\Photos\\Archive', 'C:\\Photos', 'c:\\']);
});

test('Dedup navigation selects a standalone JPEG or falls back to its visible RAW', async () => {
  const content = fs.readFileSync(new URL('../src/components/Content.vue', import.meta.url), 'utf8');
  const start = content.indexOf('async function resolveFileIndexForDedup(');
  const end = content.indexOf('const handleDedupSelectFile', start);
  assert.ok(start >= 0 && end > start);
  const resolver = new Function('fileList', 'groupedModeActive', 'getCurrentQueryFilePosition',
    'totalFileCount', 'config', ts.transpile(content.slice(start, end)) + '; return resolveFileIndexForDedup;');
  const files = ref([{ id: 10 }]);
  const findIndex = resolver(files, ref(false), async () => -1, ref(1), { settings: { groupRawJpegPairs: true } });
  assert.equal(await findIndex(11, 10), 0);
  const findAfterMissingPosition = resolver(files, ref(false), async () => undefined, ref(1), { settings: { groupRawJpegPairs: true } });
  assert.equal(await findAfterMissingPosition(11, 10), 0);
  files.value = [{ id: 11 }];
  assert.equal(await findIndex(11), 0);
});
