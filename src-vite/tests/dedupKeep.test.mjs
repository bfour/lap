import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { ref } from 'vue';

const source = fs.readFileSync(new URL('../src/components/DedupPane.vue', import.meta.url), 'utf8');
const start = source.indexOf('async function setKeep(');
const end = source.indexOf('function duplicateActionTitle(', start);
assert.ok(start >= 0 && end > start);
const selection = source.slice(
  source.indexOf('function canSelectForDeletion('),
  source.indexOf('function isDupSelected('),
);
const code = ts.transpile(selection + source.slice(start, end), { target: ts.ScriptTarget.ES2022 });

function item(id, keep = false, overrides = {}) {
  return { file_id: id, is_keep: Number(keep), can_delete: !keep, can_set_keep: true, file: { id, name: `copy-${id}.jpg` }, ...overrides };
}

function keepFixture(items, detail, { save = async () => {} } = {}) {
  const calls = [];
  const selections = new Map([[7, new Set()]]);
  const rawGroups = ref([{ id: 7, items }]);
  const toast = { error: message => calls.push(['toast', message]) };
  const setKeep = new Function(
    'dedupSetKeep', 'dedupGetGroupItems', 'rawGroups', 'selectedDupIdsByGroup', 'isOriginalUnavailable',
    'emitDedupStatuses', 'refreshOverview', 'isChangingDuplicateKeep', 'duplicateAccessPending', 'toast', 't',
    `${code}; return setKeep;`,
  )(
    async (...args) => { calls.push(['setKeep', ...args]); await save(); },
    async () => (typeof detail === 'function' ? detail() : detail),
    rawGroups,
    ref(selections),
    file => file?.unavailable === true,
    () => calls.push(['statuses']),
    () => calls.push(['overview']),
    ref(false),
    ref(false),
    toast,
    key => key,
  );
  return { calls, rawGroups, setKeep, selected: () => Array.from(selections.get(7)).sort() };
}

test('locking another copy keeps both locked and checks every other unlocked copy', async () => {
  const f = keepFixture([item(1, true), item(2), item(3)], [item(1, true), item(2, true), item(3)]);
  await f.setKeep(7, 2);
  assert.deepEqual(f.calls[0], ['setKeep', 7, 2, true]);
  assert.deepEqual(f.rawGroups.value[0].items.map(row => [row.file_id, row.is_keep]), [[1, 1], [2, 1], [3, 0]]);
  assert.deepEqual(f.selected(), [3]);
});

test('unlocking a copy checks it for deletion, recomputing the whole set', async () => {
  const f = keepFixture([item(1, true), item(2, true), item(3)], [item(1), item(2, true), item(3)]);
  await f.setKeep(7, 1);
  assert.deepEqual(f.calls[0], ['setKeep', 7, 1, false]);
  assert.deepEqual(f.selected(), [1, 3]);
});

test('protected or unavailable unlocked copies stay unchecked and rows keep their order', async () => {
  const f = keepFixture([item(3, false, { file: { unavailable: true } }), item(1, true), item(2, true)], [
    item(1, true), item(2, false, { can_delete: false }), item(3), item(4),
  ]);
  await f.setKeep(7, 2);
  assert.deepEqual(f.rawGroups.value[0].items.map(row => row.file_id), [3, 1, 2, 4]);
  assert.deepEqual(f.selected(), [4]);
});

test('the last locked copy cannot be unlocked', async () => {
  const f = keepFixture([item(1, true, { can_set_keep: false }), item(2)], []);
  await f.setKeep(7, 1);
  assert.deepEqual(f.calls, []);
});

test('a failed lock change reports an error and leaves the set unchanged', async () => {
  const f = keepFixture([item(1, true), item(2)], [], { save: async () => { throw new Error('locked'); } });
  await f.setKeep(7, 2);
  assert.deepEqual(f.calls.at(-1), ['toast', 'info_panel.dedup.keep_update_failed']);
  assert.deepEqual(f.rawGroups.value[0].items.map(row => row.is_keep), [1, 0]);
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
