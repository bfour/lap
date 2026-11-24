<template>
  <DedupSettings
    v-if="showKeepRules"
    @cancel="showKeepRules = false"
  />
  <div
    class="w-full h-full rounded-box bg-base-200 flex flex-col overflow-hidden"
    :data-dedup-shortcuts="panelOpen && activeTab === 'duplicates' ? '' : undefined"
    @keydown="handleDuplicateShortcuts"
  >
    <div class="my-2 px-2 flex items-center justify-between w-full shrink-0">
      <div class="flex items-center text-sm font-semibold gap-1">
        <button
          class="px-1 cursor-pointer"
          :class="activeTab === 'duplicates' ? 'text-primary/70' : 'hover:text-base-content'"
          @click="selectDuplicatesTab"
        >
          {{ $t('info_panel.dedup.tabs.exact') }}
        </button>
        <button
          class="px-1 cursor-pointer"
          :class="activeTab === 'similar' ? 'text-primary/70' : 'hover:text-base-content'"
          @click="openSimilarTab()"
        >
          {{ $t('info_panel.dedup.tabs.similar') }}
        </button>
      </div>
      <div class="flex items-center gap-1">
        <TButton
          v-if="activeTab === 'duplicates'"
          :icon="IconRefresh"
          :tooltip="$t('info_panel.dedup.rescan')"
          :buttonSize="'small'"
          :disabled="isDedupLoading"
          @click="refreshDuplicates"
        />
        <TButton
          v-else
          :icon="IconRefresh"
          :tooltip="$t('info_panel.dedup.similar.reanalyze')"
          :buttonSize="'small'"
          :disabled="!canRequestSimilarAnalysis || !similarHasScanned"
          @click="requestSimilarAnalysis(true)"
        />
        <TButton
          :icon="IconAdjustments"
          :tooltip="$t('info_panel.dedup.keep_rules.title')"
          :buttonSize="'small'"
          :disabled="isDedupLoading || similarLoading"
          @click="showKeepRules = true"
        />
        <TButton
          :icon="IconClose"
          :tooltip="$t('msgbox.close')"
          :buttonSize="'small'"
          @click.stop="$emit('close')"
        />
      </div>
    </div>

    <div
      class="mb-2 px-2 flex-1 min-h-0 overflow-hidden flex flex-col"
    >
      <template v-if="activeTab === 'similar'">
        <p v-if="similarEligibleCountLoading" class="px-3 py-1 text-xs" role="status">{{ $t('tooltip.loading') }}</p>
        <div v-if="similarLoading" class="p-4 flex-1 flex items-center justify-center">
          <div class="text-center text-base-content/30 space-y-3 max-w-65">
            <span class="loading loading-spinner text-primary w-8 h-8 mx-auto"></span>
            <p class="text-xs font-medium">{{ similarProgressLabel }}</p>
            <progress class="progress progress-primary w-full" :value="similarStatus.current" :max="Math.max(1, similarStatus.total)"></progress>
            <button class="btn btn-sm" @click="cancelSimilar">{{ $t('info_panel.dedup.similar.cancel') }}</button>
          </div>
        </div>
        <div v-else-if="similarError" class="p-4 flex-1 flex items-center justify-center">
          <div class="text-center text-base-content/30 space-y-3 max-w-65">
            <p class="text-xs font-medium">{{ $t('info_panel.dedup.similar.error_title') }}</p>
            <PanelActionButton
              class="mx-auto"
              :icon="IconRefresh"
              primary
              @click="openSimilarTab(true)"
            >
              {{ $t('info_panel.dedup.rescan') }}
            </PanelActionButton>
          </div>
        </div>
        <div v-else-if="similarGroups.length === 0" class="p-4 flex-1 flex items-center justify-center">
          <div class="text-center text-base-content/30 space-y-3 max-w-65">
            <p v-if="!viewHasFiles || noEligibleSimilarPhotos || similarHasScanned" class="text-sm" role="status">
              {{ $t(!viewHasFiles || noEligibleSimilarPhotos
                ? 'info_panel.dedup.similar.no_eligible_photos'
                : 'info_panel.dedup.similar.empty_title') }}
            </p>
            <PanelActionButton v-if="!similarHasScanned && viewHasFiles && !noEligibleSimilarPhotos" primary :disabled="!canRequestSimilarAnalysis" @click="requestSimilarAnalysis()">
              {{ $t('info_panel.dedup.similar.analyze_images') }}
            </PanelActionButton>
          </div>
        </div>
        <div v-else class="flex min-h-0 flex-1 flex-col">
          <p v-if="noEligibleSimilarPhotos" class="mb-2 text-center text-sm text-base-content/60" role="status">
            {{ $t('info_panel.dedup.similar.no_eligible_photos') }}
          </p>
          <section class="mb-2 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-box border border-base-content/10 bg-base-100/40 px-3 py-2" :aria-label="$t('info_panel.dedup.tabs.similar')">
            <div class="min-w-0">
              <div class="text-[10px] font-bold uppercase tracking-widest text-base-content/30">
                {{ $t('info_panel.dedup.similar.results') }}
              </div>
              <div class="text-xs text-base-content/60">
                {{ $t('info_panel.dedup.similar_items_summary', {
                  count: similarPhotoCount.toLocaleString(),
                  size: formatFileSize(similarPhotoBytes),
                }) }}
              </div>
            </div>
          </section>
          <div ref="similarSplitPaneRef" class="flex min-h-0 flex-1 flex-col">
          <div
            class="min-h-0 shrink-0 flex flex-col border-t border-base-content/5 px-1 py-3 space-y-3"
            :style="{ height: `${config.dedup.duplicateSetsHeight}%` }"
          >
              <div class="flex items-center gap-2">
                <span class="text-[10px] uppercase tracking-widest font-bold text-base-content/30">
                  {{ $t('info_panel.dedup.similar.groups_title') }}
                </span>
                <span class="ml-auto sidebar-item-count">
                  {{ similarTotalGroups.toLocaleString() }}
                </span>
              </div>
            <div ref="similarGroupsScrollRef" class="min-h-0 flex-1 overflow-y-auto py-1" @scroll="loadMoreSimilarGroups">
            <div class="mx-2 grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2">
              <button
                v-for="group in visibleSimilarGroups"
                :key="group.id"
                class="group/thumb relative h-20 min-w-0 overflow-hidden rounded-box cursor-pointer"
                :class="selectedSimilarGroupId === group.id ? 'ring-2 ring-primary' : ''"
                :data-similar-group-id="group.id"
                @click="selectSimilarGroup(group)"
              >
                <img v-if="group.representative?.thumbnail" :src="group.representative.thumbnail" class="h-full w-full object-cover" loading="lazy" />
                <div v-else class="h-full w-full skeleton"></div>
                <div class="absolute left-0.5 top-0.5 thumb-badge">
                  {{ group.file_count }}
                </div>
              </button>
            </div>
            </div>
          </div>
          <div
            v-if="activeSimilarGroup"
            class="-mx-2 z-10 flex h-1 border-b border-base-content/5 shrink-0 touch-none cursor-row-resize items-center select-none"
            @pointerdown.prevent="startDraggingDuplicateSplitter"
          >
            <div class="h-1 w-full splitter-indicator splitter-horizontal" :class="{ 'splitter-dragging': isDraggingDuplicateSplitter }"></div>
          </div>
          <div v-if="activeSimilarGroup" class="min-h-0 flex-1 overflow-y-auto px-1 py-3 space-y-3">
            <div class="flex items-center gap-2">
              <span class="text-[10px] uppercase tracking-widest font-bold text-base-content/30">
                {{ $t('info_panel.dedup.actions_title') }}
              </span>
              <span v-if="selectedSimilarCount > 0" class="ml-auto text-xs text-base-content/70">
                {{ $t('toolbar.filter.select_count', { count: selectedSimilarCount.toLocaleString() }) }} · {{ formatFileSize(selectedSimilarBytes) }}
              </span>
            </div>
            <div class="flex flex-wrap gap-1">
              <PanelActionButton
                :icon="isAllSimilarItemsSelected(activeSimilarGroup.id) ? IconDeselect : IconSelectAll"
                @click="selectAllSimilarItems(activeSimilarGroup)"
              >
                {{ isAllSimilarItemsSelected(activeSimilarGroup.id) ? $t('menu.select.none') : $t('menu.select.all') }}
              </PanelActionButton>
              <PanelActionButton :icon="selectedSimilarCount >= 2 ? IconSplitOn4 : IconSplitOn" :disabled="selectedSimilarCount === 0 || !hasSimilarKeep" @click="compareSelectedSimilarPhotos">
                {{ $t('info_panel.dedup.compare') }}
              </PanelActionButton>
              <PanelActionButton :icon="IconTrash" :disabled="selectedSimilarCount === 0" danger @click="trashSelectedSimilar(activeSimilarGroup.id)">
                {{ $t(config.settings.fileDeleteBehavior === 'permanent' ? 'menu.file.delete' : 'msgbox.move_to_trash.title') }}
              </PanelActionButton>
            </div>
            <TransitionGroup
              :key="activeSimilarGroup.id"
              tag="div"
              name="dedup-item"
              move-class="transition-transform duration-200 ease-out"
              class="space-y-2.5"
            >
              <div
                v-for="item in activeSimilarGroup.items"
                :key="item.file_id"
                role="button"
                tabindex="0"
                class="group/row w-full rounded-box p-2.5 border text-left transition-colors cursor-pointer"
                :class="getDedupItemClass(item.file_id, item.is_keep !== 1 && isSimilarSelected(activeSimilarGroup.id, item.file_id))"
                @click="handleSimilarSelection(item.file_id)"
                @dblclick="handleSimilarSelection(item.file_id, true)"
                @keydown.enter.self="handleSimilarSelection(item.file_id)"
                @keydown.space.self.prevent="handleSimilarSelection(item.file_id)"
              >
                <div class="flex items-center gap-2">
                  <label v-if="item.is_keep !== 1" class="flex items-center shrink-0" :class="!canSelectForDeletion(item) ? 'cursor-not-allowed' : 'cursor-pointer'" @click.stop @dblclick.stop>
                    <input
                      type="checkbox"
                      class="checkbox checkbox-xs disabled:cursor-not-allowed"
                      :class="!canSelectForDeletion(item) ? 'opacity-30' : 'checkbox-primary opacity-70'"
                      :checked="isSimilarSelected(activeSimilarGroup.id, item.file_id)"
                      :disabled="!canSelectForDeletion(item)"
                      @change="toggleSimilarSelected(activeSimilarGroup.id, item.file_id)"
                    />
                  </label>
                  <div v-else class="w-4 shrink-0 flex items-center justify-center">
                  <IconShield class="w-3.5 h-3.5 text-base-content/40" aria-hidden="true" />
                </div>
                  <div class="w-10 h-10 rounded-box overflow-hidden shrink-0">
                    <img v-if="item.file?.thumbnail" :src="item.file.thumbnail" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full skeleton"></div>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1 text-xs font-semibold text-base-content/70">
                      <span class="truncate">{{ item.file?.name }}</span>
                      <span
                        v-if="dedupPairBadge(item)"
                        class="inline-flex shrink-0 items-center gap-0.5 rounded bg-base-content/10 px-1 text-[9px] font-medium text-base-content/60"
                      >
                        <IconLivePhoto v-if="isDedupLivePhoto(item)" class="h-3 w-3 shrink-0" aria-hidden="true" />
                        {{ dedupPairBadge(item) }}
                      </span>
                      <IconExclamation v-if="isOriginalUnavailable(item.file)" class="w-3.5 h-3.5 shrink-0 text-warning" />
                    </div>
                    <div
                      class="text-[11px] text-base-content/30 truncate"
                      :title="formatDedupFolderPath(item.file)"
                    >
                      {{ formatDedupFolderPath(item.file) }}
                    </div>
                    <div v-if="keepRules.preferredSize !== 'ignore'" class="text-[11px] text-base-content/30 truncate">
                      <template v-if="item.file?.width && item.file?.height">
                        {{ item.file.width }} × {{ item.file.height }}
                      </template>
                      <template v-else>—</template>
                      · {{ formatFileSize(getMediaItemSize(item.file)) }}
                    </div>
                    <div v-else-if="item.file?.[preferredDateField] > 0" class="text-[11px] text-base-content/30">
                      {{ $t(`file_info.${preferredDateField}`) }}: {{ formatTimestamp(item.file[preferredDateField], 'date_time') }}
                    </div>
                  </div>
                  <div class="shrink-0 w-16 min-h-10 flex flex-col items-center justify-center gap-0.5">
                    <span v-if="item.is_keep === 1" class="thumb-badge">KEEP</span>
                    <PanelActionButton
                      v-else
                      size="small"
                      class="transition-opacity"
                      :class="keepActionClass(item.file_id)"
                      :title="$t('info_panel.dedup.keep_label')"
                      :aria-label="$t('info_panel.dedup.keep_label')"
                      @click.stop="setSimilarKeep(activeSimilarGroup.id, item.file_id)"
                    >
                      {{ $t('info_panel.dedup.keep_label') }}
                    </PanelActionButton>
                    <div class="flex items-center gap-0.5" @click.stop>
                      <button
                        class="btn btn-ghost btn-xs min-h-0 h-5 w-5 p-0"
                        :class="getSimilarCullingIconClass(item.file, 1)"
                        :title="$t('culling.picks')"
                        :aria-label="$t('culling.picks')"
                        @click.stop="setSimilarCullingFlag(item, 1)"
                      >
                        <IconFlagFilled class="w-3.5 h-3.5" />
                      </button>
                      <button
                        class="btn btn-ghost btn-xs min-h-0 h-5 w-5 p-0"
                        :class="getSimilarCullingIconClass(item.file, 2)"
                        :title="$t('culling.rejected')"
                        :aria-label="$t('culling.rejected')"
                        @click.stop="setSimilarCullingFlag(item, 2)"
                      >
                        <IconFlagOff class="w-3.5 h-3.5" />
                      </button>
                      <button
                        class="btn btn-ghost btn-xs min-h-0 h-5 w-5 p-0"
                        :class="getSimilarCullingIconClass(item.file, 0)"
                        :title="$t('culling.unreviewed')"
                        :aria-label="$t('culling.unreviewed')"
                        @click.stop="setSimilarCullingFlag(item, 0)"
                      >
                        <IconFlag class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </TransitionGroup>
          </div>
          </div>
        </div>
      </template>
      <template v-else>
      <div v-if="isDedupLoading" class="p-4 flex-1 flex items-center justify-center">
        <div class="text-center text-base-content/30 space-y-3 max-w-65">
          <span class="loading loading-spinner text-primary w-8 h-8 mx-auto"></span>
          <p class="text-xs font-medium">{{ $t('info_panel.dedup.scanning') }}</p>
        </div>
      </div>

      <div v-else-if="dedupScanError" class="p-4 flex-1 flex items-center justify-center">
        <div class="text-center text-base-content/30 space-y-3 max-w-65">
          <p class="text-xs font-medium">{{ $t('info_panel.dedup.error_title') }}</p>
          <p class="text-xs text-base-content/30">{{ $t('info_panel.dedup.error_desc') }}</p>
          <PanelActionButton
            class="mx-auto"
            :icon="IconRefresh"
            primary
            @click="refreshDuplicates"
          >
            {{ $t('info_panel.dedup.rescan') }}
          </PanelActionButton>
        </div>
      </div>

      <div v-else-if="allDuplicateGroups.length === 0" class="p-4 flex-1 flex items-center justify-center">
        <div class="text-center text-base-content/30 space-y-3 max-w-65">
          <p class="text-sm">{{ $t('info_panel.dedup.empty_title') }}</p>
          <!-- <p class="text-xs">{{ $t('info_panel.dedup.empty_desc') }}</p> -->
        </div>
      </div>

      <div v-else class="flex min-h-0 flex-1 flex-col">
        <section class="mb-2 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-box border border-base-content/10 bg-base-100/40 px-3 py-2" aria-label="Bulk duplicate actions">
          <div class="min-w-0">
            <div class="text-[10px] font-bold uppercase tracking-widest text-base-content/30">
              {{ $t('info_panel.dedup.reclaimable_size') }}
            </div>
            <div class="text-xs text-base-content/60">
              {{ $t('info_panel.dedup.removable_copies_summary', {
                count: totalDuplicateFileCount.toLocaleString(),
                size: formatFileSize(totalReclaimableBytes),
              }) }}
            </div>
          </div>
          <PanelActionButton
            class="ml-auto"
            :icon="IconTrash"
            danger
            :disabled="totalDuplicateFileCount === 0 || duplicateAccessPending || hasUnavailableDuplicates"
            @click="trashAllDuplicates"
          >
            {{ $t(config.settings.fileDeleteBehavior === 'permanent' ? 'info_panel.dedup.delete_all' : 'info_panel.dedup.trash_all') }}
          </PanelActionButton>
        </section>
      <div ref="dedupSplitPaneRef" class="flex min-h-0 flex-1 flex-col">
        <div
          class="min-h-0 shrink-0 flex flex-col border-t border-base-content/5 px-1 py-3 space-y-3"
          :style="{ height: `${config.dedup.duplicateSetsHeight}%` }"
        >
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span class="text-[10px] uppercase tracking-widest font-bold text-base-content/30">
              {{ $t(showHiddenGroups ? 'info_panel.dedup.hidden_groups_title' : 'info_panel.dedup.groups_title') }}
            </span>
            <span class="sidebar-item-count">
              {{ (showHiddenGroups ? hiddenGroupCount : totalGroupCount).toLocaleString() }}
            </span>
            <button
              v-if="showHiddenGroups || hiddenGroupCount > 0"
              type="button"
              class="btn btn-ghost btn-xs gap-1 px-1 font-normal text-base-content/60"
              :class="{ 'text-primary': showHiddenGroups }"
              :aria-pressed="showHiddenGroups"
              :disabled="duplicateActionsBusy"
              :title="$t(showHiddenGroups ? 'info_panel.dedup.back_to_sets' : 'info_panel.dedup.hidden_sets_title')"
              @click="toggleHiddenGroupsView"
            >
              <component :is="showHiddenGroups ? IconUnhide : IconHide" class="size-3.5" aria-hidden="true" />
              {{ showHiddenGroups
                ? $t('info_panel.dedup.back_to_sets')
                : $t('info_panel.dedup.hidden_sets', { count: hiddenGroupCount.toLocaleString() }) }}
            </button>
            <select
              v-model="duplicateGroupSort"
              class="select select-xs ml-auto w-auto max-w-full"
              :aria-label="$t('info_panel.dedup.sort_groups')"
              :title="$t('info_panel.dedup.sort_groups')"
            >
              <option value="count_desc">{{ $t('info_panel.dedup.sort_count_desc') }}</option>
              <option value="size_desc">{{ $t('info_panel.dedup.sort_size_desc') }}</option>
              <option value="size_asc">{{ $t('info_panel.dedup.sort_size_asc') }}</option>
              <option value="reclaimable_desc">{{ $t('info_panel.dedup.sort_reclaimable_desc') }}</option>
            </select>
          </div>
          <div v-if="skippedCloudOnlyCount > 0" class="px-1 text-xs text-base-content/50">
            {{ $t('info_panel.dedup.skipped_cloud_only', { count: skippedCloudOnlyCount.toLocaleString() }) }}
          </div>
          <div
            ref="duplicateGroupsScrollRef"
            class="min-h-0 flex-1 overflow-y-auto py-1"
            @scroll="loadMoreDuplicateThumbnails"
          >
            <p v-if="duplicateGroups.length === 0" class="px-2 py-4 text-center text-xs text-base-content/40" role="status">
              {{ $t(showHiddenGroups ? 'info_panel.dedup.hidden_empty' : 'info_panel.dedup.all_sets_hidden') }}
            </p>
            <div class="mx-2 grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2">
              <button
              v-for="group in visibleDuplicateGroups"
              :key="group.id"
              :data-duplicate-group-id="group.id"
              class="group/thumb relative h-20 min-w-0 overflow-hidden rounded-box cursor-pointer"
                :class="selectedGroupId === group.id ? 'ring-2 ring-primary' : ''"
                @click="selectDuplicateGroup(group)"
              >
                <img
                  v-if="group.keepItem?.file?.thumbnail"
                  :src="group.keepItem.file.thumbnail"
                  class="h-full w-full object-cover"
                  loading="lazy"
                />
                <div v-else class="h-full w-full skeleton"></div>
                <div class="absolute left-0.5 top-0.5 thumb-badge">
                  {{ group.file_count }}
                </div>
                <div
                  v-if="group.keepItem && dedupPairBadge(group.keepItem)"
                  class="absolute right-0.5 top-0.5 thumb-badge"
                >
                  {{ dedupPairBadge(group.keepItem) }}
                </div>
                <div
                  class="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-1.5 pb-1 pt-4 text-left text-[10px] leading-tight text-white/90 opacity-0 transition-opacity group-hover/thumb:opacity-100"
                  :class="{ 'opacity-100': selectedGroupId === group.id }"
                >
                  <div>{{ formatFileSize(getDuplicateGroupFileSize(group)) }}</div>
                  <div v-if="group.keepItem?.file?.width && group.keepItem?.file?.height" class="text-white/70">
                    {{ group.keepItem.file.width }} x {{ group.keepItem.file.height }}
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
        <div
          v-if="activeGroup"
          class="-mx-2 z-10 flex h-1 border-b border-base-content/5 shrink-0 touch-none cursor-row-resize items-center select-none"
          @pointerdown.prevent="startDraggingDuplicateSplitter"
        >
          <div class="h-1 w-full splitter-indicator splitter-horizontal" :class="{ 'splitter-dragging': isDraggingDuplicateSplitter }"></div>
        </div>
        <div v-if="activeGroup" class="min-h-0 flex-1 overflow-y-auto px-1 py-3 space-y-3">
          <div class="flex items-center gap-2">
            <span class="text-[10px] uppercase tracking-widest font-bold text-base-content/30">
              {{ $t('info_panel.dedup.actions_title') }}
            </span>
            <span v-if="selectedDeleteCount > 0" class="ml-auto text-xs text-base-content/70">
              {{ $t('toolbar.filter.select_count', { count: selectedDeleteCount.toLocaleString() }) }} · {{ formatFileSize(selectedDeleteBytes) }}
            </span>
          </div>

          <div class="flex flex-wrap gap-1">
            <PanelActionButton
              :icon="activeGroup.hidden ? IconUnhide : IconHide"
              :disabled="duplicateActionsBusy"
              :title="activeGroup.hidden ? undefined : $t('info_panel.dedup.hide_set_title')"
              @click="setGroupHidden(activeGroup.id, !activeGroup.hidden)"
            >
              {{ $t(activeGroup.hidden ? 'info_panel.dedup.unhide_set' : 'info_panel.dedup.hide_set') }}
            </PanelActionButton>
            <PanelActionButton
              :icon="isAllGroupDuplicatesSelected(activeGroup.id) ? IconDeselect : IconSelectAll"
              :disabled="duplicateActionsBusy || activeGroup.hidden || !activeGroup.duplicateItems.some(canSelectForDeletion)"
              @click="selectGroupDuplicates(activeGroup.id)"
            >
              {{ isAllGroupDuplicatesSelected(activeGroup.id) ? $t('menu.select.none') : $t('menu.select.all') }}
            </PanelActionButton>
            <PanelActionButton
              :icon="IconTrash"
              :disabled="selectedDeleteCount === 0 || duplicateActionsBusy || activeGroup.hidden"
              :title="duplicateActionTitle(checkedDeleteLabel, 'dedup.deleteSelected')"
              danger
              @click="trashSelectedDuplicates(activeGroup.id)"
            >
              {{ checkedDeleteLabel }}
            </PanelActionButton>
            <PanelActionButton
              :icon="IconTrash"
              :disabled="!activeGroup.duplicateItems.some(canSelectForDeletion) || duplicateActionsBusy || activeGroup.hidden"
              :title="duplicateActionTitle(setDeleteLabel, 'dedup.deleteSet')"
              danger
              @click="trashSetDuplicates(activeGroup.id)"
            >
              {{ setDeleteLabel }}
            </PanelActionButton>
          </div>
          <p v-if="activeGroup.hidden" class="px-1 text-xs text-base-content/50" role="status">
            {{ $t('info_panel.dedup.hidden_set_notice') }}
          </p>
          <p v-else class="px-1 text-[11px] text-base-content/40">
            {{ $t('info_panel.dedup.keep_hint') }}
          </p>
          <TransitionGroup
            :key="activeGroup.id"
            tag="div"
            name="dedup-item"
            move-class="transition-transform duration-200 ease-out"
            class="space-y-2.5"
          >
            <div
              v-for="item in activeGroup.items"
              :key="item.file_id"
              :data-duplicate-file-id="item.file_id"
              role="button"
              tabindex="0"
              class="group/row w-full rounded-box p-2.5 border text-left transition-colors cursor-pointer"
              :class="getDedupItemClass(item.file_id, item.is_keep !== 1 && isDupSelected(activeGroup.id, item.file_id), item.raw_pair_primary_id)"
              @click="handleDuplicateSelection(item)"
              @dblclick="handleDuplicateSelection(item, true)"
              @keydown.enter.self="handleDuplicateSelection(item)"
              @keydown.space.self.prevent="handleDuplicateSelection(item)"
            >
              <div class="flex items-center gap-2">
                <label v-if="item.is_keep !== 1" class="flex items-center shrink-0" :class="!canSelectForDeletion(item) ? 'cursor-not-allowed' : 'cursor-pointer'" @click.stop @dblclick.stop>
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs disabled:cursor-not-allowed"
                    :class="!canSelectForDeletion(item) ? 'opacity-30' : 'checkbox-primary opacity-70'"
                    :checked="isDupSelected(activeGroup.id, item.file_id)"
                    :disabled="duplicateActionsBusy || activeGroup.hidden || !canSelectForDeletion(item)"
                    :aria-label="$t('info_panel.dedup.select_for_deletion', { name: item.file?.name ?? '' })"
                    @change="toggleDupSelected(activeGroup.id, item.file_id)"
                  />
                </label>
                <div v-else class="w-4 shrink-0 flex items-center justify-center">
                  <IconShield class="w-3.5 h-3.5 text-base-content/40" aria-hidden="true" />
                </div>
                <div class="w-10 h-10 rounded-box overflow-hidden shrink-0">
                  <img v-if="item.file?.thumbnail" :src="item.file.thumbnail" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full skeleton"></div>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1 text-xs font-semibold text-base-content/70">
                    <span class="truncate">{{ item.file?.name }}</span>
                    <span
                      v-if="dedupPairBadge(item)"
                      class="inline-flex shrink-0 items-center gap-0.5 rounded bg-base-content/10 px-1 text-[9px] font-medium text-base-content/60"
                    >
                      <IconLivePhoto v-if="isDedupLivePhoto(item)" class="h-3 w-3 shrink-0" aria-hidden="true" />
                      {{ dedupPairBadge(item) }}
                    </span>
                    <IconExclamation v-if="isOriginalUnavailable(item.file)" class="w-3.5 h-3.5 shrink-0 text-warning" />
                  </div>
                  <div v-if="item.file?.[preferredDateField] > 0" class="text-[11px] text-base-content/30">
                    {{ $t(`file_info.${preferredDateField}`) }}: {{ formatTimestamp(item.file[preferredDateField], 'date_time') }}
                  </div>
                </div>
                <button
                  type="button"
                  class="btn btn-xs btn-ghost btn-square shrink-0"
                  :class="[
                    item.is_keep === 1 ? 'bg-primary/15 text-primary' : 'text-base-content/50',
                    { 'cursor-not-allowed': duplicateActionsBusy || item.can_set_keep === false },
                    { 'opacity-50': item.is_keep !== 1 && duplicateActionsBusy },
                  ]"
                  :aria-pressed="item.is_keep === 1"
                  :aria-disabled="duplicateActionsBusy || item.can_set_keep === false"
                  :aria-label="$t(item.is_keep === 1 ? 'info_panel.dedup.unlock_keep' : 'info_panel.dedup.lock_keep')"
                  :title="duplicateKeepTitle(item)"
                  @click.stop="setKeep(activeGroup.id, item.file_id)"
                  @dblclick.stop
                >
                  <component :is="item.is_keep === 1 ? IconLock : IconUnlock" class="size-4" aria-hidden="true" />
                </button>
              </div>
              <div
                v-if="item.file?.file_path"
                class="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-base-content/70"
                :title="getFolderPath(item.file.file_path)"
              >
                <IconFolder class="size-3.5 shrink-0" aria-hidden="true" />
                <span class="min-w-0 truncate" style="flex-shrink: 1000">{{ splitDedupFolderPath(item.file).head }}</span>
                <span class="min-w-0 truncate font-medium text-base-content/90">{{ splitDedupFolderPath(item.file).tail }}</span>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>
      </div>
      </template>
    </div>
  </div>
  <MessageBox
    v-if="pendingSimilarAnalysis"
    :title="$t('info_panel.dedup.tabs.similar')"
    :message="$t('info_panel.dedup.similar.large_scan_confirm', { count: pendingSimilarAnalysis.count.toLocaleString() })"
    :OkText="$t('info_panel.dedup.similar.analyze')"
    :cancelText="$t('msgbox.cancel')"
    @ok="confirmLargeSimilarScan"
    @cancel="cancelLargeSimilarScan"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick, PropType } from 'vue';
import { listen } from '@tauri-apps/api/event';
import { useI18n } from 'vue-i18n';
import {
  formatFileSize,
  formatRawPairBadge,
  getFolderName,
  getFolderPath,
  formatFolderBreadcrumb,
  getThumbnailDataUrl,
  getThumbUrl,
  isMac,
  formatTimestamp,
  getMediaItemSize,
} from '@/common/utils';
import DedupSettings from './DedupSettings.vue';
import TButton from '@/components/TButton.vue';
import PanelActionButton from '@/components/PanelActionButton.vue';
import MessageBox from '@/components/MessageBox.vue';
import { IconAdjustments, IconSelectAll, IconExclamation, IconDeselect, IconClose, IconFlag, IconFlagFilled, IconFlagOff, IconFolder, IconHide, IconLivePhoto, IconLock, IconShield, IconRefresh, IconSplitOn, IconSplitOn4, IconTrash, IconUnhide, IconUnlock } from '@/common/icons';
import { useToast } from '@/common/toast';
import { useUIStore } from '@/stores/uiStore';
import { DEFAULT_PLATFORM, getShortcutLabel, matchesShortcut, type ShortcutActionId } from '@/common/shortcuts';
import {
  dedupStartScan,
  dedupCancelScan,
  dedupGetScanStatus,
  dedupGetOverview,
  listenDedupScanProgress,
  dedupListGroups,
  dedupSetKeep,
  dedupGetGroupItems,
  dedupSetGroupHidden,
  getAlbum,
  getFileThumb,
  checkFileAccessibility,
  similarStartScan,
  similarGetScanStatus,
  similarCancelScan,
  similarGetEligibleCount,
  similarListGroups,
  similarGetOverview,
  similarGetGroup,
  similarSetKeep,
  similarHasScan,
  listenSimilarScanProgress,
  setFileCullingFlag,
} from '@/common/api';
import { config, libConfig } from '@/common/config';
import { isOriginalUnavailable, setFileAccessibility } from '@/common/availability';
import { SIMILAR_SCAN, DEDUP_THUMBNAIL_PAGE_SIZE } from '@/common/constants';

const dedupPaneGlobalState = ((globalThis as any).__lapDedupPaneState ||= {
  lastScanKey: '',
});

const thumbnailPlaceholder = new URL('@/assets/images/image-file.png', import.meta.url).href;
const { t } = useI18n();
const toast = useToast();
const uiStore = useUIStore();

const props = defineProps({
  selectedFileId: {
    type: [Number, String],
    default: -1,
  },
  dedupScanKey: {
    type: String,
    default: '',
  },
  similarScanKey: {
    type: String,
    default: '',
  },
  panelOpen: Boolean,
  viewHasFiles: Boolean,
  sourceVersion: { type: Number, default: 0 },
  similarityThreshold: {
    type: Number,
    required: true,
  },
  dedupQueryParams: {
    type: Object as () => Record<string, any> | null,
    default: null,
  },
  dedupCollectionId: {
    type: Number as PropType<number | null>,
    default: null,
  },
  dedupFileIds: {
    type: Array as PropType<number[] | null>,
    default: null,
  },
});

const emit = defineEmits<{
  close: [];
  'select-file': [fileId: number, rawPrimaryId?: number];
  'preview-file': [fileId: number, rawPrimaryId?: number];
  'trash-selected-duplicates': [groupId: string, fileIds: number[]];
  'trash-all-duplicates': [];
  'trash-selected-similar': [groupId: string, fileIds: number[]];
  'compare-selected-photos': [files: any[]];
  'culling-status-updated': [fileId: number, cullingFlag: number];
  'dedup-status-updated': [statuses: Record<number, 'keep' | 'dup'>];
}>();

const selectedDupIdsByGroup = ref<Map<number, Set<number>>>(new Map());
const selectedSimilarIdsByGroup = ref<Map<number, Set<number>>>(new Map());
const isDedupLoading = ref(true);
const activeTab = ref<'duplicates' | 'similar'>(
  config.dedup.activeTab === 'similar' ? 'similar' : 'duplicates',
);
const similarLoading = ref(false);
const similarRestoring = ref(false);
const showKeepRules = ref(false);
const keepRules = computed(() => ({
  preferFormat: config.dedup.keepRules?.preferFormat ?? 'raw',
  preferredDate: config.dedup.keepRules?.preferredDate ?? 'modifiedEarliest',
  preferredSize: config.dedup.keepRules?.preferredSize ?? 'largestDimensions',
  folderIds: libConfig.dedupPreferredFolderIds ?? [],
}));
const preferredDateField = computed(() =>
  ['createdEarliest', 'createdLatest'].includes(keepRules.value.preferredDate) ? 'created_at' : 'modified_at'
);
const similarStatus = ref<any>({ phase: 'idle', current: 0, total: 0 });
const similarGroups = ref<any[]>([]);
const similarTotalGroups = ref(0);
const similarPhotoCount = ref(0);
const similarPhotoBytes = ref(0);
const isLoadingMoreSimilarGroups = ref(false);
const selectedSimilarGroupId = ref<number | null>(null);
const similarEligibleCountLoading = ref(false);
const similarHasScanned = ref(false);
const similarError = ref(false);
const similarLoadedScope = ref('');
const noEligibleSimilarPhotos = ref(false);
const pendingSimilarAnalysis = ref<{ scopeKey: string; count: number; reanalyze: boolean } | null>(null);
let similarCountRequest = 0;
let similarCandidateRevision = 0;
const canRequestSimilarAnalysis = computed(() =>
  props.panelOpen && activeTab.value === 'similar' && props.viewHasFiles && !!props.similarScanKey
  && !isDedupLoading.value && !similarLoading.value && !similarRestoring.value
  && !similarEligibleCountLoading.value && !pendingSimilarAnalysis.value
  && !noEligibleSimilarPhotos.value
);
const unlistenSimilarProgress = ref<null | (() => void)>(null);
const unlistenCullingStatus = ref<null | (() => void)>(null);
const dedupScanError = ref(false);
const unlistenDedupProgress = ref<null | (() => void)>(null);
const queuedDedupScan = ref(false);
const scanGeneration = ref(0);
const isStartingDedupScan = ref(false);
const rawGroups = ref<any[]>([]);
const selectedGroupId = ref<number | null>(null);
const totalGroupCount = ref(0);
const totalDuplicateFileCount = ref(0);
const totalReclaimableBytes = ref(0);
const albumRootPaths = ref<Map<number, string>>(new Map());
const dedupStatusPollTimer = ref<ReturnType<typeof setInterval> | null>(null);
// Online-only files the last scan left unhashed (hashing would download them).
const skippedCloudOnlyCount = ref(0);
const isPollingDedupStatus = ref(false);
const loadedDuplicateGroupCount = ref(DEDUP_THUMBNAIL_PAGE_SIZE);
const duplicateGroupsScrollRef = ref<HTMLElement | null>(null);
const similarGroupsScrollRef = ref<HTMLElement | null>(null);
const dedupSplitPaneRef = ref<HTMLElement | null>(null);
const similarSplitPaneRef = ref<HTMLElement | null>(null);
const isDraggingDuplicateSplitter = ref(false);
const isLoadingMoreDuplicateThumbnails = ref(false);
let dedupScanReady = false;

type DuplicateGroupSort = 'count_desc' | 'size_desc' | 'size_asc' | 'reclaimable_desc';
const DUPLICATE_GROUP_SORTS: readonly string[] = ['count_desc', 'size_desc', 'size_asc', 'reclaimable_desc'];
const duplicateGroupSort = computed<DuplicateGroupSort>({
  get: () => {
    const sort = String(config.dedup.groupSort ?? '');
    return DUPLICATE_GROUP_SORTS.includes(sort) ? sort as DuplicateGroupSort : 'count_desc';
  },
  set: (value: DuplicateGroupSort) => { config.dedup.groupSort = value; },
});

function getDuplicateGroupFileSize(group: any): number {
  const keepItem = group.items?.find((item: any) => item.is_keep === 1);
  return getMediaItemSize(keepItem?.file) || Number(group.file_size) || 0;
}

function sortDuplicateGroups(groups: any[], sort: DuplicateGroupSort) {
  if (sort === 'count_desc') return groups;
  const value = sort === 'reclaimable_desc'
    ? (group: any) => group.reclaimableBytes
    : getDuplicateGroupFileSize;
  const direction = sort === 'size_asc' ? 1 : -1;
  return [...groups].sort((left, right) => direction * (value(left) - value(right)));
}

function decorateDuplicateGroup(group: any) {
  // Rows keep their order when locks change, so the list does not jump under the cursor.
  const items = group.items || [];
  const duplicateItems = items.filter((item: any) => item.is_keep !== 1);
  return {
    ...group,
    items,
    keepItem: items.find((item: any) => item.is_keep === 1) || null,
    duplicateItems,
    reclaimableBytes: duplicateItems.reduce((sum: number, item: any) => sum + getMediaItemSize(item.file), 0),
  };
}

// Show the sets the user skipped instead of the regular duplicate sets.
const showHiddenGroups = ref(false);
const isChangingHiddenGroup = ref(false);
const hiddenGroupCount = computed(() => rawGroups.value.filter((group: any) => group.hidden).length);
const isGroupInView = (group: any) => !!group.hidden === showHiddenGroups.value;

const allDuplicateGroups = computed(() =>
  sortDuplicateGroups(rawGroups.value.map(decorateDuplicateGroup), duplicateGroupSort.value));
const duplicateGroups = computed(() => allDuplicateGroups.value.filter(isGroupInView));

const activeGroup = computed(() => {
  if (selectedGroupId.value === null) return null;
  return duplicateGroups.value.find(group => group.id === selectedGroupId.value) || null;
});
const activeSimilarGroup = computed(() => similarGroups.value.find(group => Number(group.id) === selectedSimilarGroupId.value && Array.isArray(group.items)) || null);
const hasSimilarKeep = computed(() => activeSimilarGroup.value?.items?.some((item: any) => item.is_keep === 1) || false);
const similarProgressLabel = computed(() => ({
  preparing: t('info_panel.dedup.similar.preparing'),
  finding_matches: t('info_panel.dedup.similar.finding_matches'),
  building_sets: t('info_panel.dedup.similar.building_sets'),
})[similarStatus.value.phase] || t('info_panel.dedup.similar.analyzing'));
const visibleDuplicateGroups = computed(() => duplicateGroups.value.slice(0, loadedDuplicateGroupCount.value));
const visibleSimilarGroups = computed(() => similarGroups.value);

const pairMatchIds = ref<number[]>([]);

function emitDedupStatuses() {
  const statuses: Record<number, 'keep' | 'dup'> = {};
  for (const fileId of pairMatchIds.value) statuses[fileId] = 'dup';
  for (const group of rawGroups.value) {
    if (group.hidden) continue;
    for (const item of group.items || []) {
      statuses[Number(item.file_id)] = item.is_keep === 1 ? 'keep' : 'dup';
    }
  }
  emit('dedup-status-updated', statuses);
}

const selectedDeleteCount = computed(() => {
  if (!activeGroup.value) return 0;
  return activeGroup.value.duplicateItems.filter((item: any) => isDupSelected(activeGroup.value.id, item.file_id)).length;
});

const selectedDeleteBytes = computed(() => {
  if (!activeGroup.value) return 0;
  return activeGroup.value.duplicateItems.reduce((sum: number, item: any) => {
    return isDupSelected(activeGroup.value.id, item.file_id) ? sum + getMediaItemSize(item.file) : sum;
  }, 0);
});

const selectedSimilarCount = computed(() => {
  if (!activeSimilarGroup.value) return 0;
  return activeSimilarGroup.value.items.filter((item: any) =>
    item.is_keep !== 1 && isSimilarSelected(activeSimilarGroup.value.id, item.file_id)
  ).length;
});

const selectedSimilarBytes = computed(() => {
  if (!activeSimilarGroup.value) return 0;
  return activeSimilarGroup.value.items.reduce((sum: number, item: any) =>
    item.is_keep !== 1 && isSimilarSelected(activeSimilarGroup.value.id, item.file_id)
      ? sum + getMediaItemSize(item.file)
      : sum, 0);
});

function getDupSelectedSet(groupId: number): Set<number> {
  const existing = selectedDupIdsByGroup.value.get(groupId);
  if (existing) return existing;
  const set = new Set<number>();
  selectedDupIdsByGroup.value.set(groupId, set);
  return set;
}

const duplicateItemsById = computed(() => new Map<number, any>(rawGroups.value.flatMap((group: any) =>
  (group.items || []).map((item: any) => [Number(item.file_id), item] as [number, any]))));
const similarItemsById = computed(() => new Map<number, any>(similarGroups.value.flatMap((group: any) =>
  (group.items || []).map((item: any) => [Number(item.file_id), item] as [number, any]))));

function canSelectForDeletion(item: any): boolean {
  return item?.can_delete === true && item.is_keep !== 1 && !isOriginalUnavailable(item.file);
}

/** Check every copy that is not locked and can be deleted safely. */
function selectUnlockedDuplicates(groupId: number, items: any[]) {
  selectedDupIdsByGroup.value.set(groupId, new Set(
    items.filter(canSelectForDeletion).map((item: any) => Number(item.file_id)),
  ));
}

function isDupSelected(groupId: number, fileId: number) {
  return canSelectForDeletion(duplicateItemsById.value.get(Number(fileId)))
    && getDupSelectedSet(groupId).has(fileId);
}

function getSimilarSelectedSet(groupId: number): Set<number> {
  const existing = selectedSimilarIdsByGroup.value.get(groupId);
  if (existing) return existing;
  const selected = new Set<number>();
  selectedSimilarIdsByGroup.value.set(groupId, selected);
  return selected;
}

function isSimilarSelected(groupId: number, fileId: number) {
  return canSelectForDeletion(similarItemsById.value.get(Number(fileId)))
    && getSimilarSelectedSet(groupId).has(fileId);
}

function selectSimilarDuplicatesByDefault(group: any) {
  const groupId = Number(group?.id || 0);
  if (!groupId || selectedSimilarIdsByGroup.value.has(groupId)) return;
  selectedSimilarIdsByGroup.value.set(
    groupId,
    new Set(
      (group.items || [])
        .filter((item: any) => item.is_keep !== 1 && canSelectForDeletion(item))
        .map((item: any) => Number(item.file_id)),
    ),
  );
}

function getSimilarCullingIconClass(file: any, cullingFlag: number) {
  const current = Number(file?.culling_flag ?? file?.cullingFlag ?? 0);
  if (current === cullingFlag) return cullingFlag === 2 ? 'text-error' : 'text-primary';
  return cullingFlag === 2
    ? 'text-base-content/30 hover:text-error/70'
    : 'text-base-content/30 hover:text-primary/70';
}

async function setSimilarCullingFlag(item: any, cullingFlag: number) {
  const file = item?.file;
  const fileId = Number(file?.id || item?.file_id || 0);
  if (!file || fileId <= 0) return;
  const normalized = Math.max(0, Math.min(2, cullingFlag));
  const previous = Number(file.culling_flag ?? file.cullingFlag ?? 0);
  file.culling_flag = normalized;
  file.cullingFlag = normalized;
  const result = await setFileCullingFlag(fileId, normalized);
  if (result === null) {
    file.culling_flag = previous;
    file.cullingFlag = previous;
    return;
  }
  emit('culling-status-updated', fileId, normalized);
}

function toggleSimilarSelected(groupId: number, fileId: number) {
  if (!canSelectForDeletion(similarItemsById.value.get(Number(fileId)))) return;
  const selected = getSimilarSelectedSet(groupId);
  if (selected.has(fileId)) selected.delete(fileId);
  else selected.add(fileId);
}

function isAllSimilarItemsSelected(groupId: number) {
  if (!activeSimilarGroup.value?.items?.length || activeSimilarGroup.value.id !== groupId) return false;
  const unkeptItems = activeSimilarGroup.value.items.filter((item: any) => item.is_keep !== 1 && canSelectForDeletion(item));
  if (unkeptItems.length === 0) return false;
  const selected = getSimilarSelectedSet(groupId);
  return unkeptItems.every((item: any) => selected.has(Number(item.file_id)));
}

function selectAllSimilarItems(group: any) {
  const groupId = Number(group?.id || 0);
  if (!groupId) return;
  const selected = getSimilarSelectedSet(groupId);
  if (isAllSimilarItemsSelected(groupId)) {
    selected.clear();
    return;
  }
  selected.clear();
  for (const item of group.items || []) {
    if (item.is_keep !== 1 && canSelectForDeletion(item)) selected.add(Number(item.file_id));
  }
}

function compareSelectedSimilarPhotos() {
  if (!activeSimilarGroup.value) return;
  const keepItem = activeSimilarGroup.value.items.find((item: any) => item.is_keep === 1);
  if (!keepItem?.file) return;
  const files = [keepItem.file]
    .concat(activeSimilarGroup.value.items
    .filter((item: any) => item.is_keep !== 1 && isSimilarSelected(activeSimilarGroup.value.id, item.file_id))
      .map((item: any) => item.file)
    )
    .filter(Boolean);
  if (files.length >= 2) emit('compare-selected-photos', files);
}

function trashSelectedSimilar(groupId: number) {
  const keptIds = new Set(
    (activeSimilarGroup.value?.items || [])
      .filter((item: any) => item.is_keep === 1)
      .map((item: any) => Number(item.file_id)),
  );
  const fileIds = Array.from(getSimilarSelectedSet(groupId)).filter(fileId => !keptIds.has(fileId) && isSimilarSelected(groupId, fileId));
  if (fileIds.length > 0) emit('trash-selected-similar', String(groupId), fileIds);
}

function keepActionClass(fileId: number) {
  const isActive = Number(props.selectedFileId) === Number(fileId);
  return isActive
    ? 'opacity-100'
    : 'opacity-0 pointer-events-none group-hover/row:opacity-100 group-hover/row:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto';
}

function getDedupItemClass(fileId: number, isDuplicateSelected = false, rawPrimaryId?: number) {
  const selectedId = Number(props.selectedFileId);
  const isActive = selectedId === Number(fileId)
    || (config.settings.groupRawJpegPairs && !!rawPrimaryId && selectedId === Number(rawPrimaryId));
  // if (isDuplicateSelected) {
  //   return isActive
  //     ? 'border-error/70 bg-error/10'
  //     : 'border-error/30 hover:bg-error/5';
  // }
  return isActive
    ? 'border-primary/70 bg-primary/10'
    : 'border-base-content/10 hover:bg-primary/5';
}

function toggleDupSelected(groupId: number, fileId: number) {
  if (!canSelectForDeletion(duplicateItemsById.value.get(Number(fileId)))) return;
  const set = getDupSelectedSet(groupId);
  if (set.has(fileId)) set.delete(fileId);
  else set.add(fileId);
}

function handleDuplicateSelection(item: { file_id: number; raw_pair_primary_id?: number }, preview = false) {
  if (preview) emit('preview-file', item.file_id, item.raw_pair_primary_id);
  else emit('select-file', item.file_id, item.raw_pair_primary_id);
}

function handleSimilarSelection(fileId: number, preview = false) {
  emit('select-file', fileId);
  if (preview) emit('preview-file', fileId);
}

let unlistenAlbumAccessChanged: (() => void) | undefined;
const duplicateAccessPending = ref(false);
const hasUnavailableDuplicates = computed(() => rawGroups.value.some((group: any) => !group.hidden &&
  (group.items || []).some((item: any) => item.is_keep !== 1 && item.can_delete && isOriginalUnavailable(item.file))));

async function refreshFileAccess(files: any[]) {
  const libraryId = libConfig._libraryId;
  const unique = [...new Map(files.filter(file => file?.file_path && file.album_accessible !== false)
    .map(file => [file.file_path, file])).values()];
  for (let i = 0; i < unique.length; i += 8) {
    await Promise.all(unique.slice(i, i + 8).map(async file => {
      try {
        const available = await checkFileAccessibility(file.file_path);
        if (libraryId === libConfig._libraryId) setFileAccessibility(file.file_path, available);
      } catch { /* Keep the last known state on IPC errors. */ }
    }));
    if (libraryId !== libConfig._libraryId) return;
  }
}

async function hydrateSimilarThumbnails(groups: any[], activeGroupId: number | null) {
  const visibleIds = new Set(
    visibleSimilarGroups.value.map(group => Number(group.id))
  );
  const files = groups.flatMap(group => {
    if (Number(group.id) === activeGroupId) return [group.representative, ...(group.items || []).map((item: any) => item.file)];
    return visibleIds.has(Number(group.id)) ? [group.representative] : [];
  }).filter(Boolean);
  await refreshFileAccess(groups.flatMap(group => Number(group.id) === activeGroupId
    ? (group.items || []).map((item: any) => item.file) : []));
  await Promise.all(files.map(async (file: any) => {
    if (file.thumbnail || !file.file_path) return;
    const thumb = await getFileThumb(
      file.id,
      file.file_path,
      file.file_type || 1,
      file.e_orientation || 0,
      config.settings.thumbnailSize,
      false,
      null,
      file.album_id || 0,
    );
    file.thumbnail = resolveDedupThumbnail(file, thumb);
  }));
}

async function fetchSimilarGroups(append = false) {
  const scopeKey = props.similarScanKey;
  const offset = append ? similarGroups.value.length : 0;
  let page;
  try { page = await similarListGroups(scopeKey, SIMILAR_SCAN.PAGE_SIZE, offset); }
  catch (error) {
    console.error('fetchSimilarGroups error:', error);
    if (scopeKey === props.similarScanKey) similarError.value = true;
    return;
  }
  if (scopeKey !== props.similarScanKey) return;
  similarError.value = false;
  const groups = Array.isArray(page?.items) ? page.items : [];
  similarGroups.value = append ? [...similarGroups.value, ...groups] : groups;
  similarTotalGroups.value = Number(page?.total || 0);
  if (!append) await refreshSimilarOverview(scopeKey);
  if (scopeKey !== props.similarScanKey) return;
  similarLoadedScope.value = scopeKey;
  if (!append) {
    selectedSimilarGroupId.value = similarGroups.value[0] ? Number(similarGroups.value[0].id) : null;
    const firstGroup = similarGroups.value[0];
    if (firstGroup) {
      let detail;
      try { detail = await similarGetGroup(firstGroup.id, scopeKey); }
      catch (error) {
        console.error('getSimilarGroup error:', error);
        if (scopeKey === props.similarScanKey) similarError.value = true;
        return;
      }
      if (scopeKey !== props.similarScanKey) return;
      Object.assign(firstGroup, detail);
      selectSimilarDuplicatesByDefault(firstGroup);
    }
  }
  await hydrateSimilarThumbnails(similarGroups.value, selectedSimilarGroupId.value);
}

async function refreshSimilarOverview(scopeKey = props.similarScanKey) {
  if (!scopeKey) {
    similarPhotoCount.value = 0;
    similarPhotoBytes.value = 0;
    return;
  }
  try {
    const overview = await similarGetOverview(scopeKey);
    if (scopeKey !== props.similarScanKey) return;
    similarPhotoCount.value = Number(overview?.total_files || 0);
    similarPhotoBytes.value = Number(overview?.total_size || 0);
  } catch (error) {
    console.error('refreshSimilarOverview error:', error);
  }
}

async function loadMoreSimilarGroups(event: Event) {
  const target = event.currentTarget as HTMLElement;
  if (isLoadingMoreSimilarGroups.value || similarGroups.value.length >= similarTotalGroups.value) return;
  if (target.scrollTop + target.clientHeight < target.scrollHeight - 24) return;
  isLoadingMoreSimilarGroups.value = true;
  try { await fetchSimilarGroups(true); }
  finally { isLoadingMoreSimilarGroups.value = false; }
}

async function openSimilarTab(forceReload = false) {
  activeTab.value = 'similar';
  config.dedup.activeTab = 'similar';
  const scopeKey = props.similarScanKey;
  if (!scopeKey || isDedupLoading.value || similarRestoring.value) return;
  similarRestoring.value = true;
  if (forceReload) similarLoadedScope.value = '';
  similarError.value = false;
  try {
    const status = await similarGetScanStatus();
    if (scopeKey !== props.similarScanKey) return;
    if (status?.scopeKey === scopeKey && (status.state === 'running' || status.isScanning)) {
      similarStatus.value = status;
      similarLoading.value = true;
      return;
    }
    if (similarLoadedScope.value !== scopeKey) await fetchSimilarGroups();
    if (scopeKey !== props.similarScanKey || similarError.value) return;

    const hasPersistedScan = await similarHasScan(scopeKey);
    if (scopeKey !== props.similarScanKey) return;
    similarHasScanned.value = similarGroups.value.length > 0
      || (status?.scopeKey === scopeKey && status.state === 'finished')
      || hasPersistedScan;
  } catch (error) {
    console.error('openSimilarTab error:', error);
    if (scopeKey === props.similarScanKey) similarError.value = true;
  } finally {
    if (scopeKey === props.similarScanKey) similarRestoring.value = false;
  }
}

function selectDuplicatesTab() {
  activeTab.value = 'duplicates';
  config.dedup.activeTab = 'duplicates';
  const keepFileId = Number(activeGroup.value?.keepItem?.file_id || 0);
  if (keepFileId > 0) emit('select-file', keepFileId);
}

function resetSimilarResults() {
  similarGroups.value = [];
  similarTotalGroups.value = 0;
  similarPhotoCount.value = 0;
  similarPhotoBytes.value = 0;
  selectedSimilarIdsByGroup.value.clear();
  selectedSimilarGroupId.value = null;
  similarHasScanned.value = false;
  similarError.value = false;
  similarLoadedScope.value = '';
}

async function requestSimilarAnalysis(reanalyze = false) {
  if (!canRequestSimilarAnalysis.value) return;
  const scopeKey = props.similarScanKey;
  const request = ++similarCountRequest;
  const candidateRevision = similarCandidateRevision;
  similarEligibleCountLoading.value = true;
  noEligibleSimilarPhotos.value = false;
  let count: number;
  try {
    count = Number(await similarGetEligibleCount(
      props.dedupFileIds === null ? (props.dedupQueryParams || null) : null,
      props.dedupFileIds === null ? props.dedupCollectionId : null,
      props.dedupFileIds,
    ));
  } catch (error) {
    console.error('getSimilarEligibleCount error:', error);
    if (request === similarCountRequest) similarError.value = true;
    return;
  } finally {
    if (request === similarCountRequest) similarEligibleCountLoading.value = false;
  }
  if (request !== similarCountRequest || scopeKey !== props.similarScanKey || !canRequestSimilarAnalysis.value) return;
  if (count === 0) {
    noEligibleSimilarPhotos.value = candidateRevision === similarCandidateRevision;
    return;
  }
  if (count > SIMILAR_SCAN.LARGE_RESULT_THRESHOLD) {
    pendingSimilarAnalysis.value = { scopeKey, count, reanalyze };
    return;
  }
  if (reanalyze) resetSimilarResults();
  await runSimilarScan();
}

async function confirmLargeSimilarScan() {
  const pending = pendingSimilarAnalysis.value;
  cancelLargeSimilarScan();
  if (!pending || pending.scopeKey !== props.similarScanKey || !canRequestSimilarAnalysis.value) return;
  if (pending.reanalyze) resetSimilarResults();
  await runSimilarScan();
}

function cancelLargeSimilarScan() {
  pendingSimilarAnalysis.value = null;
}

function invalidateSimilarCount() {
  similarCountRequest++;
  similarEligibleCountLoading.value = false;
  noEligibleSimilarPhotos.value = false;
  cancelLargeSimilarScan();
}

watch([() => props.similarScanKey, () => props.panelOpen, activeTab], invalidateSimilarCount, { flush: 'sync' });

function markSimilarCandidatesChanged() {
  similarCandidateRevision++;
  noEligibleSimilarPhotos.value = false;
}

watch([() => props.sourceVersion, () => libConfig.index.searchReady], markSimilarCandidatesChanged, { flush: 'sync' });

async function runSimilarScan() {
  const scopeKey = props.similarScanKey;
  similarLoading.value = true;
  try {
    const sourceVersion = Number(scopeKey.match(/\|similar-view:(\d+)$/)?.[1] || 0);
    await similarStartScan(
      scopeKey,
      sourceVersion,
      props.similarityThreshold,
      props.dedupFileIds === null ? (props.dedupQueryParams || null) : null,
      props.dedupFileIds === null ? props.dedupCollectionId : null,
      props.dedupFileIds,
      keepRules.value,
    );
  } catch (error) {
    console.error('startSimilar error:', error);
    if (scopeKey !== props.similarScanKey) return;
    similarLoading.value = false;
    similarError.value = true;
  }
}

async function cancelSimilar() {
  try { await similarCancelScan(); }
  catch (error) { console.error('cancelSimilar error:', error); similarLoading.value = false; similarError.value = true; }
}
async function selectSimilarGroup(group: any) {
  selectedSimilarGroupId.value = Number(group.id);
  try { Object.assign(group, await similarGetGroup(group.id, props.similarScanKey)); }
  catch (error) { console.error('getSimilarGroup error:', error); similarError.value = true; return; }
  selectSimilarDuplicatesByDefault(group);
  await hydrateSimilarThumbnails(similarGroups.value, selectedSimilarGroupId.value);
  if (group.representative?.id) emit('select-file', group.representative.id);
}

function selectDuplicateGroup(group: any) {
  selectedGroupId.value = Number(group.id);
  const keepFileId = Number(group.keepItem?.file_id || 0);
  if (keepFileId > 0) {
    emit('select-file', keepFileId, group.keepItem?.raw_pair_primary_id);
  }
}

function scrollSelectedDuplicateGroupIntoView(groupId: number) {
  const container = duplicateGroupsScrollRef.value;
  const item = container?.querySelector<HTMLElement>(`[data-duplicate-group-id="${groupId}"]`);
  if (!container || !item) return;

  const containerRect = container.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const padding = 4;
  if (itemRect.top < containerRect.top + padding) {
    container.scrollBy({ top: itemRect.top - containerRect.top - padding, behavior: 'smooth' });
  } else if (itemRect.bottom > containerRect.bottom - padding) {
    container.scrollBy({ top: itemRect.bottom - containerRect.bottom + padding, behavior: 'smooth' });
  }
}

const isChangingDuplicateKeep = ref(false);

/** Toggle whether one copy is locked (kept). Several copies of a set can be locked. */
async function setKeep(groupId: number, fileId: number) {
  const group = rawGroups.value.find((group: any) => Number(group.id) === groupId);
  const item = group?.items?.find((item: any) => Number(item.file_id) === fileId);
  if (!item || item.can_set_keep === false || isChangingDuplicateKeep.value || duplicateAccessPending.value) return;

  const keep = item.is_keep !== 1;
  isChangingDuplicateKeep.value = true;
  try {
    await dedupSetKeep(groupId, fileId, keep);
    const groupIndex = rawGroups.value.findIndex((group: any) => Number(group.id) === groupId);
    if (groupIndex < 0) return;
    const previousItems = rawGroups.value[groupIndex].items || [];
    let items: any[];
    try {
      const byId = new Map<number, any>((await dedupGetGroupItems(groupId))
        .map((item: any) => [Number(item.file_id), item]));
      // Preserve row positions and loaded thumbnails.
      items = previousItems.flatMap((previous: any) => {
        const current = byId.get(Number(previous.file_id));
        if (!current) return [];
        byId.delete(Number(previous.file_id));
        return [{ ...current, file: previous.file || current.file }];
      });
      items.push(...byId.values());
    } catch (error) {
      // The lock change already succeeded; fall back to local state until the next reload.
      console.error('Failed to refresh dedup group:', error);
      items = previousItems.map((previous: any) => Number(previous.file_id) === fileId
        ? { ...previous, is_keep: keep ? 1 : 0, can_delete: !keep && previous.can_delete }
        : previous);
    }
    rawGroups.value[groupIndex] = { ...rawGroups.value[groupIndex], items };
    selectUnlockedDuplicates(groupId, items);
    emitDedupStatuses();
    void refreshOverview();
  } catch (error) {
    console.error('Failed to update duplicate lock:', error);
    toast.error(t('info_panel.dedup.keep_update_failed'));
  } finally {
    isChangingDuplicateKeep.value = false;
  }
}

function duplicateActionTitle(label: string, action: ShortcutActionId) {
  const shortcut = getShortcutLabel(action, DEFAULT_PLATFORM, config.shortcutBindings);
  return shortcut ? `${label} (${shortcut})` : label;
}

function duplicateKeepTitle(item: any) {
  if (item.can_set_keep === false) return t('info_panel.dedup.last_keep');
  return duplicateActionTitle(
    t(item.is_keep === 1 ? 'info_panel.dedup.unlock_keep' : 'info_panel.dedup.lock_keep'),
    'dedup.toggleKeep',
  );
}

const DUPLICATE_SHORTCUT_ACTIONS = ['dedup.toggleKeep', 'dedup.deleteSelected', 'dedup.deleteSet'] as const;

function handleDuplicateShortcuts(event: KeyboardEvent) {
  if (!props.panelOpen || activeTab.value !== 'duplicates' || !activeGroup.value || isDedupLoading.value
    || event.defaultPrevented || event.isComposing || uiStore.inputStack.length > 0 || showKeepRules.value) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest('input:not([type="checkbox"]), textarea, select, [contenteditable]:not([contenteditable="false"])')) return;

  const group = activeGroup.value;
  const rowId = Number(target?.closest<HTMLElement>('[data-duplicate-file-id]')?.dataset.duplicateFileId || 0);
  const plain = !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
  if (plain && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    event.preventDefault();
    event.stopPropagation();
    focusDuplicateRow(group, rowId, event.key === 'ArrowDown' ? 1 : -1);
    return;
  }

  const action = DUPLICATE_SHORTCUT_ACTIONS.find(id => matchesShortcut(id, event, DEFAULT_PLATFORM, config.shortcutBindings));
  if (!action) return;
  event.preventDefault();
  event.stopPropagation();
  if (event.repeat) return;

  if (action === 'dedup.deleteSelected') {
    trashSelectedDuplicates(group.id);
  } else if (action === 'dedup.deleteSet') {
    trashSetDuplicates(group.id);
  } else {
    const selectedId = Number(props.selectedFileId);
    const item = group.items.find((item: any) => Number(item.file_id) === (rowId || selectedId))
      ?? group.items.find((item: any) => !rowId && selectedId > 0 && Number(item.raw_pair_primary_id) === selectedId);
    if (item) void setKeep(group.id, Number(item.file_id));
  }
}

function focusDuplicateRow(group: any, currentId: number, step: number) {
  const items = group.items || [];
  if (items.length === 0) return;
  const selectedId = Number(props.selectedFileId);
  let index = items.findIndex((item: any) => Number(item.file_id) === (currentId || selectedId));
  index = index < 0 ? (step > 0 ? 0 : items.length - 1) : Math.min(items.length - 1, Math.max(0, index + step));
  const item = items[index];
  const row = document.querySelector<HTMLElement>(`[data-dedup-shortcuts] [data-duplicate-file-id="${Number(item.file_id)}"]`);
  row?.focus();
  row?.scrollIntoView({ block: 'nearest' });
  handleDuplicateSelection(item);
}

async function setSimilarKeep(groupId: number, fileId: number) {
  const scopeKey = props.similarScanKey;
  await similarSetKeep(groupId, fileId, scopeKey);
  const detail = await similarGetGroup(groupId, scopeKey);
  if (scopeKey !== props.similarScanKey) return;
  const groupIndex = similarGroups.value.findIndex((group: any) => Number(group.id) === groupId);
  if (groupIndex < 0) return;

  const group = similarGroups.value[groupIndex];
  const previousKeepId = Number(
    (group.items || []).find((item: any) => Number(item.is_keep) === 1)?.file_id || 0,
  );
  const previousFiles = new Map((group.items || []).map((item: any) => [item.file_id, item.file]));
  const items = (detail.items || []).map((item: any) => ({
    ...item,
    file: previousFiles.get(item.file_id) || item.file,
  }));
  similarGroups.value[groupIndex] = {
    ...group,
    ...detail,
    representative: items.find((item: any) => item.is_keep === 1)?.file || group.representative,
    items,
  };
  // The new keep replaces the old one; the old keep becomes deletable again.
  const selected = getSimilarSelectedSet(groupId);
  selected.delete(fileId);
  if (previousKeepId > 0 && previousKeepId !== fileId) selected.add(previousKeepId);
  emit('select-file', fileId);
}

function selectGroupDuplicates(groupId: number) {
  const group = duplicateGroups.value.find(g => g.id === groupId);
  if (!group) return;

  const set = getDupSelectedSet(groupId);
  const duplicateIds = group.duplicateItems.filter(canSelectForDeletion).map((item: any) => item.file_id);
  const allSelected = duplicateIds.length > 0 && duplicateIds.every((id: number) => set.has(id));

  if (allSelected) {
    set.clear();
    return;
  }

  set.clear();
  for (const id of duplicateIds) set.add(id);
}

function isAllGroupDuplicatesSelected(groupId: number) {
  const group = duplicateGroups.value.find(g => g.id === groupId);
  if (!group || group.duplicateItems.length === 0) return false;
  const set = getDupSelectedSet(groupId);
  const available = group.duplicateItems.filter(canSelectForDeletion);
  return available.length > 0 && available.every((item: any) => set.has(item.file_id));
}

const duplicateActionsBusy = computed(() => isChangingDuplicateKeep.value || duplicateAccessPending.value
  || isChangingHiddenGroup.value);
const checkedDeleteLabel = computed(() => t(config.settings.fileDeleteBehavior === 'permanent'
  ? 'info_panel.dedup.delete_checked' : 'info_panel.dedup.trash_selected'));
const setDeleteLabel = computed(() => t(config.settings.fileDeleteBehavior === 'permanent'
  ? 'info_panel.dedup.delete_set' : 'info_panel.dedup.trash_set'));

function isHiddenGroup(groupId: number) {
  return rawGroups.value.some((group: any) => Number(group.id) === groupId && group.hidden);
}

function trashSelectedDuplicates(groupId: number) {
  if (duplicateActionsBusy.value || isHiddenGroup(groupId)) return;
  const ids = Array.from(getDupSelectedSet(groupId).values()).filter(fileId => isDupSelected(groupId, fileId));
  if (ids.length === 0) return;
  emit('trash-selected-duplicates', String(groupId), ids);
}

/** Delete every unlocked copy in the set, whether or not it is checked. */
function trashSetDuplicates(groupId: number) {
  if (duplicateActionsBusy.value || isHiddenGroup(groupId)) return;
  const group = rawGroups.value.find((group: any) => Number(group.id) === groupId);
  const ids = (group?.items || []).filter(canSelectForDeletion).map((item: any) => Number(item.file_id));
  if (ids.length === 0) return;
  emit('trash-selected-duplicates', String(groupId), ids);
}

async function trashAllDuplicates() {
  if (totalDuplicateFileCount.value <= 0 || duplicateAccessPending.value || hasUnavailableDuplicates.value) return;
  const libraryId = libConfig._libraryId;
  duplicateAccessPending.value = true;
  try {
    await refreshFileAccess(rawGroups.value.filter((group: any) => !group.hidden).flatMap((group: any) => (group.items || [])
      .filter((item: any) => item.is_keep !== 1 && item.can_delete).map((item: any) => item.file)));
    if (libraryId !== libConfig._libraryId || hasUnavailableDuplicates.value) return;
    emit('trash-all-duplicates');
  } finally {
    duplicateAccessPending.value = false;
  }
}

// The group to select after `groupId` leaves the current list: the next one, else the previous one.
function neighborGroupId(groupId: number): number | null {
  const groups = duplicateGroups.value;
  const index = groups.findIndex((group: any) => Number(group.id) === groupId);
  if (index < 0) return groups[0] ? Number(groups[0].id) : null;
  const next = groups[index + 1] || groups[index - 1];
  return next ? Number(next.id) : null;
}

// Skip a duplicate set (hide it) or bring it back. The backend persists this by content,
// so the set stays hidden across refreshes and rescans and is excluded from bulk deletion.
async function setGroupHidden(groupId: number, hidden: boolean) {
  if (duplicateActionsBusy.value) return;
  const libraryId = libConfig._libraryId;
  const scopeKey = props.dedupScanKey;
  const generation = scanGeneration.value;
  const isCurrent = () => libraryId === libConfig._libraryId && scopeKey === props.dedupScanKey
    && generation === scanGeneration.value;
  isChangingHiddenGroup.value = true;
  try {
    await dedupSetGroupHidden(groupId, hidden);
    if (!isCurrent()) return;
    const groupIndex = rawGroups.value.findIndex((group: any) => Number(group.id) === groupId);
    if (groupIndex < 0) return;
    const nextGroupId = selectedGroupId.value === groupId ? neighborGroupId(groupId) : selectedGroupId.value;
    rawGroups.value[groupIndex] = { ...rawGroups.value[groupIndex], hidden };
    if (hidden) selectedDupIdsByGroup.value.delete(groupId);
    else selectUnlockedDuplicates(groupId, rawGroups.value[groupIndex].items || []);
    // Leave the hidden view once the last hidden set is restored.
    if (showHiddenGroups.value && hiddenGroupCount.value === 0) {
      showHiddenGroups.value = false;
      selectFirstGroupInView();
    } else {
      selectedGroupId.value = nextGroupId;
    }
    emitDedupStatuses();
    await refreshOverview();
  } catch (error) {
    if (!isCurrent()) return;
    console.error('Failed to update hidden duplicate set:', error);
    toast.error(t('info_panel.dedup.hide_update_failed'));
  } finally {
    isChangingHiddenGroup.value = false;
  }
}

function selectFirstGroupInView() {
  loadedDuplicateGroupCount.value = DEDUP_THUMBNAIL_PAGE_SIZE;
  const scroll = duplicateGroupsScrollRef.value;
  if (scroll) scroll.scrollTop = 0;
  const first = duplicateGroups.value[0];
  selectedGroupId.value = first ? Number(first.id) : null;
  void hydrateGroupThumbnails(duplicateGroups.value, selectedGroupId.value);
}

function toggleHiddenGroupsView() {
  if (duplicateActionsBusy.value) return;
  showHiddenGroups.value = !showHiddenGroups.value;
  selectFirstGroupInView();
}

function applyDeletedFiles(groupId: number, deletedFileIds: number[]) {
  const groupIndex = rawGroups.value.findIndex((group: any) => Number(group.id) === groupId);
  if (groupIndex < 0 || deletedFileIds.length === 0) return;

  const group = rawGroups.value[groupIndex];
  const oldItems = Array.isArray(group.items) ? group.items : [];
  const deletedIds = new Set(deletedFileIds);
  const remainingItems = oldItems.filter((item: any) => !deletedIds.has(Number(item.file_id)));
  if (remainingItems.length === oldItems.length) return;

  const fileSize = Number(group.file_size || 0);
  const selectedIds = selectedDupIdsByGroup.value.get(groupId);
  for (const fileId of deletedIds) {
    selectedIds?.delete(fileId);
  }

  if (remainingItems.length <= 1) {
    const nextGroupId = selectedGroupId.value === groupId ? neighborGroupId(groupId) : selectedGroupId.value;
    rawGroups.value.splice(groupIndex, 1);
    selectedDupIdsByGroup.value.delete(groupId);
    void refreshOverview();
    selectedGroupId.value = nextGroupId;
    emitDedupStatuses();
    return;
  }

  rawGroups.value[groupIndex] = {
    ...group,
    items: remainingItems,
    file_count: remainingItems.length,
    total_size: remainingItems.length * fileSize,
  };
  void refreshOverview();
  emitDedupStatuses();
}

function applyDeletedSimilarFiles(groupId: number, deletedFileIds: number[]) {
  if (deletedFileIds.length === 0) return;
  const index = similarGroups.value.findIndex((group: any) => Number(group.id) === groupId);
  if (index < 0) return;
  const deleted = new Set(deletedFileIds.map(Number));
  const group = similarGroups.value[index];
  const items = (group.items || []).filter((item: any) => !deleted.has(Number(item.file_id)));
  const selected = selectedSimilarIdsByGroup.value.get(groupId);
  deleted.forEach(fileId => selected?.delete(fileId));
  void refreshSimilarOverview();
  if (items.length < 2) {
    similarGroups.value.splice(index, 1);
    selectedSimilarIdsByGroup.value.delete(groupId);
    if (selectedSimilarGroupId.value === groupId) {
      const next = similarGroups.value[index] || similarGroups.value[index - 1];
      selectedSimilarGroupId.value = next ? Number(next.id) : null;
      if (next) void selectSimilarGroup(next);
    }
    return;
  }
  similarGroups.value[index] = { ...group, items, file_count: items.length };
}

function isDedupLivePhoto(item: any): boolean {
  return item.is_live_photo_companion === true || item.file?.media_subtype === 'live_photo';
}

function dedupPairBadge(item: any): string {
  if (isDedupLivePhoto(item)) {
    return t('image_viewer.live');
  }
  if (config.settings.groupRawJpegPairs && item.file?.media_subtype === 'raw_jpeg_pair') {
    return formatRawPairBadge(item.file.live_photo_video_path);
  }
  return '';
}

/** Split the location so the end stays visible: the head truncates first, then the last folder. */
function splitDedupFolderPath(file: any): { head: string; tail: string } {
  const path = formatDedupFolderPath(file);
  const separator = ' > ';
  const index = path.lastIndexOf(separator);
  return index < 0
    ? { head: '', tail: path }
    : { head: path.slice(0, index + separator.length), tail: path.slice(index + separator.length) };
}

function formatDedupFolderPath(file: any): string {
  const folderPath = getFolderPath(file?.file_path);
  if (!folderPath) return '';

  const albumId = Number(file?.album_id || 0);
  const albumRoot = albumId ? albumRootPaths.value.get(albumId) || '' : '';
  const albumLabel = file?.album_name || (albumRoot ? getFolderName(albumRoot) : '');
  return formatFolderBreadcrumb(folderPath, albumRoot, albumLabel);
}

async function hydrateAlbumRootPaths(groups: any[]) {
  const albumIds = new Set<number>();
  for (const group of groups || []) {
    for (const item of Array.isArray(group?.items) ? group.items : []) {
      const albumId = Number(item?.file?.album_id || 0);
      if (albumId > 0 && !albumRootPaths.value.has(albumId)) {
        albumIds.add(albumId);
      }
    }
  }

  if (albumIds.size === 0) return;

  const results = await Promise.all(
    Array.from(albumIds).map(async (albumId) => ({
      albumId,
      album: await getAlbum(albumId),
    }))
  );

  for (const { albumId, album } of results) {
    if (album?.path) {
      albumRootPaths.value.set(albumId, album.path);
    }
  }
}

async function hydrateGroupThumbnails(groups: any[], activeGroupId: number | null) {
  await refreshFileAccess(groups.flatMap(group => Number(group.id) === activeGroupId
    ? (group.items || []).map((item: any) => item.file) : []));
  const tasks: Promise<void>[] = [];
  const visibleGroupIds = new Set(
    (groups || []).slice(0, loadedDuplicateGroupCount.value).map((group: any) => Number(group.id))
  );

  for (const group of groups || []) {
    const groupId = Number(group?.id);
    const allItems = Array.isArray(group?.items) ? group.items : [];
    const items = groupId === activeGroupId
      ? allItems
      : visibleGroupIds.has(groupId)
        ? [allItems.find((item: any) => item.is_keep === 1) || allItems[0]].filter(Boolean)
        : [];

    for (const item of items) {
      const file = item?.file;
      if (!file) continue;
      if (file.thumbnail) continue;
      if (!file.file_path) {
        file.thumbnail = thumbnailPlaceholder;
        continue;
      }
      tasks.push((async () => {
        const thumb = await getFileThumb(
          file.id,
          file.file_path,
          file.file_type || 1,
          file.e_orientation || 0,
          config.settings.thumbnailSize,
          false,
          null,
          file.album_id || 0,
        );
        file.thumbnail = resolveDedupThumbnail(file, thumb);
      })());
    }
  }
  await Promise.all(tasks);
}

function resolveDedupThumbnail(file: any, thumb: Parameters<typeof getThumbnailDataUrl>[0]) {
  const size = config.settings.thumbnailSize;
  const version = Number(file.modified_at || 0);
  if (!thumb && !file.cloud_only && !isOriginalUnavailable(file)) {
    return getThumbUrl(file.id, false, size, version) || thumbnailPlaceholder;
  }
  return getThumbnailDataUrl(thumb, thumbnailPlaceholder, false, size, version);
}

let overviewRequestId = 0;

async function refreshOverview() {
  const request = ++overviewRequestId;
  const libraryId = libConfig._libraryId;
  const scopeKey = props.dedupScanKey;
  try {
    const overview = await dedupGetOverview();
    if (!overview || request !== overviewRequestId || libraryId !== libConfig._libraryId
      || scopeKey !== props.dedupScanKey) return;
    totalGroupCount.value = Number(overview.total_groups || 0);
    totalDuplicateFileCount.value = Number(overview.total_files || 0);
    totalReclaimableBytes.value = Number(overview.total_reclaimable_bytes || 0);
    pairMatchIds.value = overview.pair_match_ids || [];
    emitDedupStatuses();
  } catch (error) {
    console.error('refreshOverview error:', error);
  }
}

async function fetchGroups(preferredGroupId: number | null = null) {
  duplicateAccessPending.value = true;
  try {
    const groups = await dedupListGroups(1, 0, 'count_desc', 'all');
    const normalized = Array.isArray(groups) ? groups : [];
    if (showHiddenGroups.value && !normalized.some((group: any) => group.hidden)) showHiddenGroups.value = false;
    const orderedGroups = sortDuplicateGroups(normalized.filter(isGroupInView).map(decorateDuplicateGroup), duplicateGroupSort.value);
    const availableGroupIds = new Set(orderedGroups.map((group: any) => Number(group.id)));
    const allGroupIds = new Set(normalized.map((group: any) => Number(group.id)));
    const nextSelectedGroupId =
      preferredGroupId && availableGroupIds.has(preferredGroupId)
        ? preferredGroupId
        : selectedGroupId.value && availableGroupIds.has(selectedGroupId.value)
          ? selectedGroupId.value
          : orderedGroups.length > 0
            ? Number(orderedGroups[0].id)
            : null;

    loadedDuplicateGroupCount.value = DEDUP_THUMBNAIL_PAGE_SIZE;
    await hydrateAlbumRootPaths(normalized);
    await hydrateGroupThumbnails(orderedGroups, nextSelectedGroupId);
    rawGroups.value = normalized;
    emitDedupStatuses();
    await refreshOverview();

    for (const key of Array.from(selectedDupIdsByGroup.value.keys())) {
      if (!allGroupIds.has(key)) {
        selectedDupIdsByGroup.value.delete(key);
      }
    }

    // Check every unlocked copy in newly loaded sets.
    for (const group of rawGroups.value) {
      const groupId = Number(group.id);
      if (!selectedDupIdsByGroup.value.has(groupId)) selectUnlockedDuplicates(groupId, group.items || []);
    }

    selectedGroupId.value = nextSelectedGroupId;
    dedupScanError.value = false;
  } catch (error) {
    console.error('fetchGroups error:', error);
    showDedupScanError();
  } finally {
    duplicateAccessPending.value = false;
  }
}

async function loadMoreDuplicateThumbnails(event: Event) {
  const target = event.currentTarget as HTMLElement;
  const hasMore = loadedDuplicateGroupCount.value < duplicateGroups.value.length;
  const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 24;
  if (!hasMore || !isAtBottom || isLoadingMoreDuplicateThumbnails.value) return;

  isLoadingMoreDuplicateThumbnails.value = true;
  loadedDuplicateGroupCount.value = Math.min(
    duplicateGroups.value.length,
    loadedDuplicateGroupCount.value + DEDUP_THUMBNAIL_PAGE_SIZE,
  );
  try {
    await nextTick();
    await hydrateGroupThumbnails(rawGroups.value, selectedGroupId.value);
  } finally {
    isLoadingMoreDuplicateThumbnails.value = false;
  }
}

function startDraggingDuplicateSplitter(event: PointerEvent) {
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  isDraggingDuplicateSplitter.value = true;
  document.addEventListener('pointermove', handleDuplicateSplitterMouseMove);
  document.addEventListener('pointerup', stopDraggingDuplicateSplitter);
  document.addEventListener('pointercancel', stopDraggingDuplicateSplitter);
}

function handleDuplicateSplitterMouseMove(event: PointerEvent) {
  const container = activeTab.value === 'similar'
    ? similarSplitPaneRef.value
    : dedupSplitPaneRef.value;
  if (!isDraggingDuplicateSplitter.value || !container) return;
  const rect = container.getBoundingClientRect();
  const nextHeight = ((event.clientY - rect.top) / rect.height) * 100;
  config.dedup.duplicateSetsHeight = Math.max(20, Math.min(nextHeight, 80));
}

function stopDraggingDuplicateSplitter() {
  isDraggingDuplicateSplitter.value = false;
  document.removeEventListener('pointermove', handleDuplicateSplitterMouseMove);
  document.removeEventListener('pointerup', stopDraggingDuplicateSplitter);
  document.removeEventListener('pointercancel', stopDraggingDuplicateSplitter);
}

function stopDedupStatusPolling() {
  if (dedupStatusPollTimer.value) {
    clearInterval(dedupStatusPollTimer.value);
    dedupStatusPollTimer.value = null;
  }
}

function showDedupScanError() {
  stopDedupStatusPolling();
  dedupPaneGlobalState.lastScanKey = '';
  rawGroups.value = [];
  emitDedupStatuses();
  selectedGroupId.value = null;
  totalGroupCount.value = 0;
  totalDuplicateFileCount.value = 0;
  totalReclaimableBytes.value = 0;
  dedupScanError.value = true;
  isDedupLoading.value = false;
}

async function handleDedupScanSettled(allowWhileStarting = false) {
  if (isStartingDedupScan.value && !allowWhileStarting) return;

  const gen = scanGeneration.value;
  const status = await dedupGetScanStatus();
  if (!status) {
    ensureDedupStatusPolling();
    return;
  }
  if (status?.state === 'running' || status?.isScanning) {
    ensureDedupStatusPolling();
    return;
  }
  if (gen !== scanGeneration.value) return;

  stopDedupStatusPolling();
  if (queuedDedupScan.value) {
    queuedDedupScan.value = false;
    await triggerBackendDedup(true);
    return;
  }
  if (status.state === 'error') {
    showDedupScanError();
    return;
  }
  skippedCloudOnlyCount.value = Number(status.skipped || 0);
  await fetchGroups();
  if (gen !== scanGeneration.value) return;
  // Only clear the loading flag after results are ready, so the
  // template never shows "no duplicates" before the scan finishes.
  isDedupLoading.value = false;
  if (activeTab.value === 'similar') await openSimilarTab();
}

function ensureDedupStatusPolling() {
  if (dedupStatusPollTimer.value) return;

  dedupStatusPollTimer.value = setInterval(async () => {
    if (isPollingDedupStatus.value) return;

    isPollingDedupStatus.value = true;
    try {
      const status = await dedupGetScanStatus();
      totalGroupCount.value = Math.max(Number(status?.groups || 0), rawGroups.value.length);
      if (status?.state && status.state !== 'running' && !status?.isScanning) {
        await handleDedupScanSettled();
      }
    } catch (error) {
      console.error('ensureDedupStatusPolling error:', error);
    } finally {
      isPollingDedupStatus.value = false;
    }
  }, 1000);
}

function refreshDuplicates() {
  void triggerBackendDedup(true);
}

async function triggerBackendDedup(force = false) {
  if (!props.dedupScanKey) {
    stopDedupStatusPolling();
    isDedupLoading.value = false;
    return;
  }

  scanGeneration.value++;
  isStartingDedupScan.value = true;
  isDedupLoading.value = true;
  dedupScanError.value = false;

  try {
    const status = await dedupGetScanStatus();
    totalGroupCount.value = Math.max(Number(status?.groups || 0), rawGroups.value.length);

    if (status?.state === 'running' || status?.isScanning) {
      queuedDedupScan.value = true;
      await dedupCancelScan();
      ensureDedupStatusPolling();
      return;
    } else if (!force && dedupPaneGlobalState.lastScanKey === props.dedupScanKey) {
      await fetchGroups();
      isDedupLoading.value = false;
      if (activeTab.value === 'similar') await openSimilarTab();
      return;
    }

    const scanKey = props.dedupScanKey;
    const hasFileIdScope = props.dedupFileIds !== null;
    await dedupStartScan(
      hasFileIdScope ? null : (props.dedupQueryParams || null),
      hasFileIdScope ? null : props.dedupCollectionId,
      props.dedupFileIds,
      keepRules.value,
    );
    selectedDupIdsByGroup.value.clear();
    dedupPaneGlobalState.lastScanKey = scanKey;

    const latest = await dedupGetScanStatus();
    totalGroupCount.value = Math.max(Number(latest?.groups || 0), rawGroups.value.length);
    if (latest?.state === 'running') {
      ensureDedupStatusPolling();
    } else {
      await handleDedupScanSettled(true);
    }
  } catch (error) {
    if (String(error).includes('already running')) {
      queuedDedupScan.value = true;
      await dedupCancelScan();
      ensureDedupStatusPolling();
      return;
    }
    console.error('triggerBackendDedup error:', error);
    showDedupScanError();
  } finally {
    isStartingDedupScan.value = false;
  }
}

watch(
  () => props.dedupScanKey,
  (newKey) => {
    selectedGroupId.value = null;
    if (!newKey) {
      scanGeneration.value++;
      stopDedupStatusPolling();
      isDedupLoading.value = true;
      rawGroups.value = [];
      selectedGroupId.value = null;
      queuedDedupScan.value = false;
      dedupScanError.value = false;
      totalGroupCount.value = 0;
      totalDuplicateFileCount.value = 0;
      totalReclaimableBytes.value = 0;
      return;
    }
    if (dedupScanReady) void triggerBackendDedup();
  }
);

watch(
  () => props.similarScanKey,
  (newKey) => {
    similarGroups.value = [];
    similarTotalGroups.value = 0;
    isLoadingMoreSimilarGroups.value = false;
    selectedSimilarIdsByGroup.value.clear();
    selectedSimilarGroupId.value = null;
    similarHasScanned.value = false;
    similarError.value = false;
    similarLoadedScope.value = '';
    similarLoading.value = false;
    similarRestoring.value = false;
    if (newKey && activeTab.value === 'similar') void openSimilarTab();
  },
);

watch(duplicateGroupSort, async () => {
  loadedDuplicateGroupCount.value = DEDUP_THUMBNAIL_PAGE_SIZE;
  duplicateGroupsScrollRef.value?.scrollTo({ top: 0 });
  await hydrateGroupThumbnails(duplicateGroups.value, selectedGroupId.value);
});

watch(selectedGroupId, async (groupId, prevGroupId) => {
  if (!groupId || groupId === prevGroupId) return;
  await nextTick();
  scrollSelectedDuplicateGroupIntoView(groupId);
  await hydrateGroupThumbnails(rawGroups.value, groupId);
  if (selectedGroupId.value !== groupId || activeTab.value !== 'duplicates') return;
  const group = duplicateGroups.value.find((item: any) => item.id === groupId);
  const keepId = group?.keepItem?.file_id;
  if (keepId) {
    emit('select-file', keepId);
  }
});

watch(selectedSimilarGroupId, async (groupId, prevGroupId) => {
  if (!groupId || groupId === prevGroupId) return;
  await hydrateSimilarThumbnails(similarGroups.value, groupId);
});

onMounted(async () => {
  unlistenAlbumAccessChanged = await listen('album-accessibility-changed', async (event: any) => {
    const { libraryId, albumId, available } = event.payload || {};
    if (libraryId !== libConfig._libraryId) return;
    markSimilarCandidatesChanged();
    for (const group of [...rawGroups.value, ...similarGroups.value]) {
      for (const file of [group.representative, ...(group.items || []).map((item: any) => item.file)]) {
        if (file && Number(file.album_id) === Number(albumId)) file.album_accessible = available;
      }
    }
    if (activeTab.value === 'similar') {
      await hydrateSimilarThumbnails(similarGroups.value, selectedSimilarGroupId.value);
    } else {
      await hydrateGroupThumbnails(rawGroups.value, selectedGroupId.value);
    }
  });
  await nextTick();

  unlistenDedupProgress.value = await listenDedupScanProgress(async (event: any) => {
    const state = event?.payload?.state;
    totalGroupCount.value = Math.max(Number(event?.payload?.groups || 0), totalGroupCount.value);
    if (state === 'running') {
      ensureDedupStatusPolling();
      return;
    }
    if (state === 'finished' || state === 'idle' || state === 'error') {
      await handleDedupScanSettled();
    }
  });
  unlistenSimilarProgress.value = await listenSimilarScanProgress(async (event: any) => {
    const payload = event?.payload;
    if (payload?.scopeKey !== props.similarScanKey) return;
    similarStatus.value = payload || similarStatus.value;
    if (payload?.state === 'running') { similarLoading.value = true; return; }
    if (payload?.state === 'error') {
      similarLoading.value = false;
      similarError.value = true;
      return;
    }
    if (payload?.state === 'finished') {
      similarLoading.value = false;
      await fetchSimilarGroups();
      if (payload.scopeKey === props.similarScanKey) similarHasScanned.value = true;
      return;
    }
    if (payload?.state === 'idle') {
      similarLoading.value = false;
    }
  });
  unlistenCullingStatus.value = await listen('culling-status-updated', (event) => {
    const payload = event.payload as { fileIds?: number[]; cullingFlag?: number } | null;
    if (!payload?.fileIds || payload.cullingFlag === undefined) return;
    const fileIds = new Set(payload.fileIds.map(Number));
    for (const item of activeSimilarGroup.value?.items || []) {
      if (!fileIds.has(Number(item.file_id)) || !item.file) continue;
      item.file.culling_flag = payload.cullingFlag;
      item.file.cullingFlag = payload.cullingFlag;
    }
  });

  if (!props.dedupScanKey) {
    isDedupLoading.value = false;
    return;
  }

  await new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  dedupScanReady = true;
  void triggerBackendDedup();
  if (activeTab.value === 'similar') await openSimilarTab();
});

onUnmounted(() => {
  invalidateSimilarCount();
  unlistenAlbumAccessChanged?.();
  stopDedupStatusPolling();
  stopDraggingDuplicateSplitter();
  if (unlistenDedupProgress.value) {
    unlistenDedupProgress.value();
    unlistenDedupProgress.value = null;
  }
  if (unlistenSimilarProgress.value) unlistenSimilarProgress.value();
  if (unlistenCullingStatus.value) unlistenCullingStatus.value();
});

defineExpose({
  applyDeletedFiles,
  applyDeletedSimilarFiles,
  refreshGroups: fetchGroups,
});
</script>
