<template>
  <ModalDialog :title="$t('info_panel.dedup.keep_rules.title')" :width="520" position-key="dedup-keep-rules" @cancel="emit('cancel')">
    <div class="space-y-2 max-h-[65vh] overflow-y-auto select-none">
      <section aria-labelledby="keep-rules-priority-heading" class="rounded-box p-2 space-y-2 bg-base-300/30 border border-base-content/5 shadow-sm">
        <h2 id="keep-rules-priority-heading" class="flex items-center font-bold uppercase text-[10px] tracking-widest text-base-content/30">{{ $t('info_panel.dedup.keep_rules.priority_order') }}</h2>
        <div class="space-y-2 px-1">
          <div class="min-w-0 flex items-start gap-1.5 text-sm leading-5">
            <span class="shrink-0 text-base-content/30" aria-hidden="true">①</span>
            <span class="min-w-0 flex flex-col gap-0.5">
              <span>{{ $t('info_panel.dedup.keep_rules.folders') }}</span>
              <span class="text-xs text-base-content/30">{{ $t('info_panel.dedup.keep_rules.subfolders') }}</span>
            </span>
          </div>
          <div v-if="photoFolder" class="flex flex-wrap items-end gap-2">
            <label class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-base-content/70">
              {{ $t('info_panel.dedup.keep_rules.folder_to_prioritize') }}
              <select
                v-model="photoFolderPath"
                class="select select-bordered select-sm w-full"
                :disabled="prioritizingFolder"
                :title="photoFolderPath"
              >
                <option v-for="path in photoFolder.paths" :key="path" :value="path">{{ path }}</option>
              </select>
            </label>
            <button
              type="button"
              class="t-button-default shrink-0"
              :disabled="!canPrioritizeFolder"
              @click="prioritizeFolder"
            >
              {{ $t(photoFolderIsFirst ? 'info_panel.dedup.keep_rules.top_priority' : 'info_panel.dedup.keep_rules.set_top_priority') }}
            </button>
          </div>
          <p v-if="priorityFailed" class="px-1 text-xs text-error" role="alert">
            {{ $t('msgbox.select_folder.error') }}
          </p>
          <div class="rounded-box border border-base-content/10 text-sm">
            <div class="relative flex shrink-0 items-center px-2 py-2 pr-9">
              <span class="min-w-0 flex-1 truncate font-bold uppercase text-[10px] tracking-widest text-base-content/30">
                {{ $t('msgbox.manage_libraries.current') }}<template v-if="folderPathsReady && preferredFolderIds.length"> ({{ preferredFolderIds.length.toLocaleString() }})</template>
              </span>
              <div class="absolute right-2 top-1/2 flex -translate-y-1/2">
                <TButton
                  :icon="IconAdd"
                  buttonSize="small"
                  :tooltip="$t('info_panel.dedup.keep_rules.add_folder')"
                  :disabled="!folderPathsReady || prioritizingFolder"
                  @click="showFolderPicker = true"
                />
              </div>
            </div>
            <div class="mx-1 mb-1 min-h-8 transform-gpu overflow-hidden rounded-box">
              <VueDraggable
                v-if="folderPathsReady && preferredFolderIds.length"
                :key="libConfig._libraryId"
                v-model="preferredFolderIds"
                tag="ul"
                class="max-h-64 overflow-x-hidden overflow-y-auto"
                handle=".preferred-folder-drag-handle"
                direction="vertical"
                :group="{ name: 'preferred-folders', pull: false, put: false }"
                :force-fallback="true"
                ghost-class="preferred-folder-reorder-placeholder"
                :revertOnSpill="true"
                :bubble-scroll="false"
                :animation="150"
              >
                <li
                  v-for="(folderId, index) in preferredFolderIds"
                  :key="folderId"
                  class="group/preferred-folder flex h-8 cursor-pointer items-center rounded-box border-2 border-transparent p-1 gap-1"
                  :class="selectedFolder === folderId ? 'bg-base-100 text-base-content' : 'hover:bg-base-100/30 hover:text-base-content'"
                  :aria-current="selectedFolder === folderId ? 'true' : undefined"
                  tabindex="0"
                  @click="selectedFolder = folderId"
                  @keydown.enter.self.prevent="selectedFolder = folderId"
                  @keydown.space.self.prevent="selectedFolder = folderId"
                >
                  <IconDragHandle
                    class="preferred-folder-drag-handle size-4 shrink-0 cursor-grab text-base-content/30"
                    :class="selectedFolder !== folderId && folderActionVisibility"
                    aria-hidden="true"
                  />
                  <IconFolder class="size-4 shrink-0" aria-hidden="true" />
                  <span class="text-xs min-w-0 flex-1 truncate" :title="folderPaths.get(folderId)">
                    {{ folderPaths.get(folderId) }}
                  </span>
                  <TButton
                    class="shrink-0"
                    :class="selectedFolder !== folderId && folderActionVisibility"
                    :icon="IconTrash"
                    buttonSize="small"
                    :tooltip="$t('menu.album.remove')"
                    @click.stop="removeFolder(index)"
                  />
                </li>
              </VueDraggable>
              <p v-else-if="folderPathsReady || folderPathsFailed" class="flex min-h-8 items-center justify-center px-2 text-center text-xs text-base-content/50">
                {{ folderPathsFailed ? $t('msgbox.select_folder.error') : $t('info_panel.dedup.keep_rules.folders_skipped') }}
              </p>
            </div>
          </div>
        </div>
        <label class="flex items-center justify-between gap-3 px-1 rounded-box hover:bg-base-100/10 transition-colors duration-200">
          <span class="min-w-0 flex items-center gap-1.5 text-sm leading-5">
            <span class="shrink-0 text-base-content/30" aria-hidden="true">②</span>
            <span class="min-w-0 flex flex-wrap items-center gap-x-2">
              <span>{{ $t('info_panel.dedup.keep_rules.format') }}</span>
              <span class="rounded-box border border-base-content/5 px-1.5 text-[10px] font-bold uppercase leading-normal tracking-wide text-base-content/30">{{ $t('info_panel.dedup.keep_rules.similar_only') }}</span>
            </span>
          </span>
          <select v-model="rules.preferFormat" class="select select-bordered select-sm w-auto max-w-[65%] shrink-0">
            <option value="ignore">{{ $t('info_panel.dedup.keep_rules.ignore') }}</option>
            <option value="raw">{{ $t('info_panel.dedup.keep_rules.raw_first') }}</option>
            <option value="jpegHeic">{{ $t('info_panel.dedup.keep_rules.jpeg_heic_first') }}</option>
          </select>
        </label>
        <label class="flex items-center justify-between gap-3 px-1 rounded-box hover:bg-base-100/10 transition-colors duration-200">
          <span class="min-w-0 flex items-center gap-1.5 text-sm leading-5">
            <span class="shrink-0 text-base-content/30" aria-hidden="true">③</span>
            <span class="min-w-0 flex flex-wrap items-center gap-x-2">
              <span>{{ $t('info_panel.dedup.keep_rules.size') }}</span>
              <span class="rounded-box border border-base-content/5 px-1.5 text-[10px] font-bold uppercase leading-normal tracking-wide text-base-content/30">{{ $t('info_panel.dedup.keep_rules.similar_only') }}</span>
            </span>
          </span>
          <select v-model="rules.preferredSize" class="select select-bordered select-sm w-auto max-w-[65%] shrink-0">
            <option value="ignore">{{ $t('info_panel.dedup.keep_rules.ignore') }}</option>
            <option value="largestDimensions">{{ $t('info_panel.dedup.keep_rules.largest_dimensions') }}</option>
            <option value="smallestDimensions">{{ $t('info_panel.dedup.keep_rules.smallest_dimensions') }}</option>
            <option value="largestFileSize">{{ $t('info_panel.dedup.keep_rules.largest_file_size') }}</option>
            <option value="smallestFileSize">{{ $t('info_panel.dedup.keep_rules.smallest_file_size') }}</option>
          </select>
        </label>
        <label class="flex items-center justify-between gap-3 px-1 rounded-box hover:bg-base-100/10 transition-colors duration-200">
          <span class="min-w-0 flex items-center gap-1.5 text-sm leading-5">
            <span class="shrink-0 text-base-content/30" aria-hidden="true">④</span>
            {{ $t('info_panel.dedup.keep_rules.time') }}
          </span>
          <select v-model="rules.preferredDate" class="select select-bordered select-sm w-auto max-w-[65%] shrink-0">
            <option value="createdEarliest">{{ $t('info_panel.dedup.keep_rules.created_earliest') }}</option>
            <option value="createdLatest">{{ $t('info_panel.dedup.keep_rules.created_latest') }}</option>
            <option value="modifiedEarliest">{{ $t('info_panel.dedup.keep_rules.modified_earliest') }}</option>
            <option value="modifiedLatest">{{ $t('info_panel.dedup.keep_rules.modified_latest') }}</option>
          </select>
        </label>
      </section>
    </div>
    <div class="space-y-2 pt-4 select-none">
      <p v-if="canRescan" class="text-xs text-base-content/60">
        {{ $t('info_panel.dedup.keep_rules.rescan_hint') }}
      </p>
      <div class="flex flex-wrap justify-end gap-2">
        <button type="button" :class="canRescan ? 't-button-default' : 't-button-primary'" @click="emit('cancel')">
          {{ $t('msgbox.close') }}
        </button>
        <button v-if="canRescan" type="button" class="t-button-primary" :disabled="prioritizingFolder || !folderPathsReady" @click="emit('rescan')">
          {{ $t('info_panel.dedup.keep_rules.rescan_with_rules') }}
        </button>
      </div>
    </div>
  </ModalDialog>
  <PreferredFolderDialog
    v-if="showFolderPicker"
    :folders="preferredFolderIds.map(id => folderPaths.get(id))"
    @add="addFolder"
    @cancel="showFolderPicker = false"
  />
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { getAllAlbumFoldersIncludingExcluded, selectFolder } from '@/common/api';
import { config, libConfig } from '@/common/config';
import { IconAdd, IconDragHandle, IconFolder, IconTrash } from '@/common/icons';
import { normalizePathForCompare } from '@/common/utils';
import { useUIStore } from '@/stores/uiStore';
import ModalDialog from './ModalDialog.vue';
import PreferredFolderDialog from './PreferredFolderDialog.vue';
import TButton from './TButton.vue';

const props = defineProps<{
  photoFolder?: { albumId: number; paths: string[] } | null;
  canRescan?: boolean;
}>();
const emit = defineEmits<{ cancel: []; rescan: [] }>();
const uiStore = useUIStore();
const rules = computed(() => config.dedup.keepRules);
const showFolderPicker = ref(false);
const selectedFolder = ref<number | null>(null);
const folderPaths = ref(new Map<number, string>());
const folderPathsReady = ref(false);
const folderPathsFailed = ref(false);
const preferredFolderIds = computed<number[]>({
  get: () => libConfig.dedupPreferredFolderIds,
  set: ids => { libConfig.dedupPreferredFolderIds = ids; },
});
const photoFolderPath = ref(props.photoFolder?.paths[0] ?? '');
const prioritizingFolder = ref(false);
const priorityFailed = ref(false);
const photoFolderIsFirst = computed(() => {
  const firstPath = folderPaths.value.get(preferredFolderIds.value[0]);
  return !!firstPath && normalizePathForCompare(firstPath) === normalizePathForCompare(photoFolderPath.value);
});
const canPrioritizeFolder = computed(() => folderPathsReady.value && !!photoFolderPath.value
  && !photoFolderIsFirst.value && !prioritizingFolder.value);
const folderActionVisibility = 'opacity-0 pointer-events-none group-hover/preferred-folder:opacity-100 group-hover/preferred-folder:pointer-events-auto group-focus-within/preferred-folder:opacity-100 group-focus-within/preferred-folder:pointer-events-auto';
let disposed = false;

watch(photoFolderPath, () => { priorityFailed.value = false; });

watch([() => libConfig._libraryId, () => libConfig._initialized], async ([libraryId, initialized], _, onCleanup) => {
  selectedFolder.value = null;
  showFolderPicker.value = false;
  folderPaths.value.clear();
  folderPathsReady.value = false;
  folderPathsFailed.value = false;
  if (!libraryId || !initialized) return;

  const ids = new Set(preferredFolderIds.value);
  if (!ids.size) {
    folderPathsReady.value = true;
    return;
  }

  let active = true;
  onCleanup(() => { active = false; });
  try {
    const folders: { id: number; path: string }[] = await getAllAlbumFoldersIncludingExcluded();
    if (!active || libraryId !== libConfig._libraryId) return;
    for (const folder of folders) {
      if (ids.has(folder.id)) folderPaths.value.set(folder.id, folder.path);
    }
    const remainingIds = preferredFolderIds.value.filter(id => folderPaths.value.has(id));
    if (remainingIds.length !== preferredFolderIds.value.length) preferredFolderIds.value = remainingIds;
    folderPathsReady.value = true;
  } catch (error) {
    console.error('Failed to resolve preferred folders:', error);
    if (active) folderPathsFailed.value = true;
  }
}, { immediate: true });

function handleKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (showFolderPicker.value) showFolderPicker.value = false;
  else emit('cancel');
}

onMounted(() => {
  uiStore.pushInputHandler('DedupSettings');
  window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  disposed = true;
  window.removeEventListener('keydown', handleKeyDown);
  uiStore.removeInputHandler('DedupSettings');
});

async function prioritizeFolder() {
  const source = props.photoFolder;
  const path = photoFolderPath.value;
  if (!canPrioritizeFolder.value || !source?.paths.includes(path)) return;

  const libraryId = libConfig._libraryId;
  prioritizingFolder.value = true;
  priorityFailed.value = false;
  try {
    const pathKey = normalizePathForCompare(path);
    const existing = preferredFolderIds.value.find(id => {
      const existingPath = folderPaths.value.get(id);
      return !!existingPath && normalizePathForCompare(existingPath) === pathKey;
    });
    let id = existing;
    if (!id) {
      const folder = await selectFolder(source.albumId, path);
      if (disposed || libraryId !== libConfig._libraryId) return;
      if (!(folder?.id > 0) || !folder.path || Number(folder.album_id) !== source.albumId || normalizePathForCompare(folder.path) !== pathKey) {
        priorityFailed.value = true;
        return;
      }
      id = Number(folder.id);
      folderPaths.value.set(id, folder.path);
    }
    preferredFolderIds.value = [id, ...preferredFolderIds.value.filter(folderId => folderId !== id)];
    selectedFolder.value = id;
  } finally {
    prioritizingFolder.value = false;
  }
}

function addFolder(folder: { id: number; path: string }) {
  folderPaths.value.set(folder.id, folder.path);
  if (!preferredFolderIds.value.includes(folder.id)) preferredFolderIds.value.push(folder.id);
  showFolderPicker.value = false;
}

function removeFolder(index: number) {
  const [removed] = preferredFolderIds.value.splice(index, 1);
  if (selectedFolder.value === removed) selectedFolder.value = null;
}

</script>

<style scoped>
.preferred-folder-reorder-placeholder {
  visibility: hidden;
}
</style>
