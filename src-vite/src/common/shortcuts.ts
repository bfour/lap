export type ShortcutPlatform = 'mac' | 'windows' | 'linux';

export type ShortcutContext =
  | 'global'
  | 'content'
  | 'media-viewer'
  | 'image-viewer'
  | 'settings'
  | 'album-list'
  | 'album-folder'
  | 'tag-dialog'
  | 'dedup'
  | 'map';

export type ShortcutActionId =
  | 'app.sidebar.toggle'
  | 'app.scale.increase'
  | 'app.scale.decrease'
  | 'app.scale.reset'
  | 'app.preferences'
  | 'app.search'
  | 'file.openNewWindow'
  | 'file.openExternalApp'
  | 'file.editImage'
  | 'file.copy'
  | 'file.copyPath'
  | 'file.paste'
  | 'file.selectAll'
  | 'file.selectNone'
  | 'file.invertSelection'
  | 'file.rename'
  | 'file.moveTo'
  | 'file.trash'
  | 'file.deletePermanently'
  | 'file.reveal'
  | 'file.searchSimilar'
  | 'dedup.toggleKeep'
  | 'dedup.deleteSelected'
  | 'dedup.deleteSet'
  | 'meta.favorite'
  | 'meta.rating.clear'
  | 'meta.rating.one'
  | 'meta.rating.two'
  | 'meta.rating.three'
  | 'meta.rating.four'
  | 'meta.rating.five'
  | 'meta.culling.pick'
  | 'meta.culling.reject'
  | 'meta.culling.unreviewed'
  | 'meta.tag'
  | 'meta.collection'
  | 'meta.edit'
  | 'meta.rotate'
  | 'meta.rotateCounterclockwise'
  | 'meta.info'
  | 'view.quickPreview'
  | 'view.togglePlayback'
  | 'view.close'
  | 'view.next'
  | 'view.previous'
  | 'view.first'
  | 'view.last'
  | 'view.pageUp'
  | 'view.pageDown'
  | 'view.zoomIn'
  | 'view.zoomOut'
  | 'view.zoomInDirectional'
  | 'view.zoomOutDirectional'
  | 'view.zoomFit'
  | 'view.cycleRawPreview'
  | 'view.toggleAfAreas'
  | 'view.toggleFullscreen'
  | 'view.cycleBackground'
  | 'view.backgroundTheme'
  | 'view.backgroundBlack'
  | 'view.backgroundDarkGray'
  | 'view.backgroundMediumGray'
  | 'view.backgroundLightGray'
  | 'view.backgroundWhite'
  | 'view.togglePane';

export type ShortcutModifier = 'ctrl' | 'meta' | 'alt' | 'shift' | 'cmdOrCtrl';

type ShortcutLabel = string | Partial<Record<ShortcutPlatform, string>> & { default?: string };
const CAPTURE_MODIFIERS = ['ctrl', 'alt', 'shift', 'meta'] as const;
type CaptureModifier = typeof CAPTURE_MODIFIERS[number];

export interface CustomShortcutBinding {
  key: string;
  code?: string;
  modifiers: readonly CaptureModifier[];
}

export type ShortcutOverrides = Partial<Record<ShortcutPlatform, Partial<Record<ShortcutActionId, CustomShortcutBinding>>>>;

export interface ShortcutBinding {
  key?: string;
  code?: string;
  modifiers?: readonly ShortcutModifier[];
  platforms?: readonly ShortcutPlatform[];
  allowShift?: boolean;
  label: ShortcutLabel;
  captured?: true;
  codeHint?: string;
}

export interface ShortcutDefinition {
  id: ShortcutActionId;
  contexts: readonly ShortcutContext[];
  defaultBindings: readonly ShortcutBinding[];
  readonly?: boolean;
}

export interface ShortcutEventLike {
  key: string;
  code?: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

export const VIEW_BACKGROUND_SHORTCUTS = [
  { actionId: 'view.backgroundTheme', value: 0 },
  { actionId: 'view.backgroundBlack', value: 1 },
  { actionId: 'view.backgroundDarkGray', value: 2 },
  { actionId: 'view.backgroundMediumGray', value: 3 },
  { actionId: 'view.backgroundLightGray', value: 4 },
  { actionId: 'view.backgroundWhite', value: 5 },
] as const satisfies ReadonlyArray<{ actionId: ShortcutActionId; value: number }>;

export const DEFAULT_PLATFORM: ShortcutPlatform = (() => {
  if (typeof navigator === 'undefined') return 'windows';
  const platform = `${navigator.platform || ''} ${navigator.userAgent || ''}`;
  if (/mac/i.test(platform)) return 'mac';
  if (/linux|x11/i.test(platform)) return 'linux';
  return 'windows';
})();

export const SHORTCUTS: readonly ShortcutDefinition[] = [
  {
    id: 'app.sidebar.toggle',
    contexts: ['global'],
    defaultBindings: [
      { code: 'KeyB', modifiers: ['cmdOrCtrl'], allowShift: true, label: { mac: '⌘B', windows: 'Ctrl+B', linux: 'Ctrl+B' } },
    ],
  },
  {
    id: 'app.scale.increase',
    contexts: ['global'],
    defaultBindings: [
      { key: '=', modifiers: ['cmdOrCtrl'], label: { mac: '⌘=', windows: 'Ctrl+=', linux: 'Ctrl+=' } },
      { key: '+', modifiers: ['cmdOrCtrl'], allowShift: true, label: { mac: '⌘+', windows: 'Ctrl++', linux: 'Ctrl++' } },
      { code: 'NumpadAdd', modifiers: ['cmdOrCtrl'], label: { mac: '⌘+', windows: 'Ctrl++', linux: 'Ctrl++' } },
    ],
  },
  {
    id: 'app.scale.decrease',
    contexts: ['global'],
    defaultBindings: [
      { key: '-', modifiers: ['cmdOrCtrl'], label: { mac: '⌘-', windows: 'Ctrl+-', linux: 'Ctrl+-' } },
      { key: '_', modifiers: ['cmdOrCtrl', 'shift'], label: { mac: '⌘-', windows: 'Ctrl+-', linux: 'Ctrl+-' } },
      { code: 'NumpadSubtract', modifiers: ['cmdOrCtrl'], label: { mac: '⌘-', windows: 'Ctrl+-', linux: 'Ctrl+-' } },
    ],
  },
  {
    id: 'app.scale.reset',
    contexts: ['global'],
    defaultBindings: [
      { key: '0', modifiers: ['cmdOrCtrl'], label: { mac: '⌘0', windows: 'Ctrl+0', linux: 'Ctrl+0' } },
      { code: 'Numpad0', modifiers: ['cmdOrCtrl'], label: { mac: '⌘0', windows: 'Ctrl+0', linux: 'Ctrl+0' } },
    ],
  },
  {
    id: 'app.preferences',
    contexts: ['global'],
    defaultBindings: [
      { code: 'Comma', modifiers: ['cmdOrCtrl'], label: { mac: '⌘,', windows: 'Ctrl+,', linux: 'Ctrl+,' } },
    ],
  },
  {
    id: 'app.search',
    contexts: ['global'],
    defaultBindings: [
      { code: 'Slash', modifiers: ['cmdOrCtrl'], allowShift: true, label: { mac: '⌘/', windows: 'Ctrl+/', linux: 'Ctrl+/' } },
    ],
  },
  {
    id: 'file.openNewWindow',
    contexts: ['content'],
    defaultBindings: [
      { key: 'Enter', modifiers: ['cmdOrCtrl'], allowShift: true, label: { mac: '⌘⏎', windows: 'Ctrl+Enter', linux: 'Ctrl+Enter' } },
    ],
  },
  {
    id: 'file.openExternalApp',
    contexts: ['content'],
    defaultBindings: [
      { code: 'KeyE', modifiers: ['cmdOrCtrl', 'shift'], label: { mac: '⇧⌘E', windows: 'Ctrl+Shift+E', linux: 'Ctrl+Shift+E' } },
    ],
  },
  {
    id: 'file.editImage',
    contexts: ['content'],
    defaultBindings: [
      { code: 'KeyE', modifiers: ['cmdOrCtrl'], label: { mac: '⌘E', windows: 'Ctrl+E', linux: 'Ctrl+E' } },
    ],
  },
  {
    id: 'file.copyPath',
    contexts: ['content', 'image-viewer'],
    defaultBindings: [
      { code: 'KeyC', modifiers: ['meta', 'alt'], platforms: ['mac'], label: '⌥⌘C' },
      { code: 'KeyC', modifiers: ['ctrl', 'shift'], platforms: ['windows', 'linux'], label: 'Ctrl+Shift+C' },
    ],
  },
  {
    id: 'file.copy',
    contexts: ['content', 'image-viewer'],
    defaultBindings: [
      { code: 'KeyC', modifiers: ['meta'], platforms: ['mac'], allowShift: true, label: '⌘C' },
      { code: 'KeyC', modifiers: ['ctrl'], platforms: ['windows', 'linux'], label: 'Ctrl+C' },
    ],
  },
  {
    id: 'file.paste',
    contexts: ['content', 'album-list', 'album-folder'],
    defaultBindings: [
      { code: 'KeyV', modifiers: ['cmdOrCtrl'], label: { mac: '⌘V', windows: 'Ctrl+V', linux: 'Ctrl+V' } },
    ],
  },
  {
    id: 'file.selectAll',
    contexts: ['content'],
    defaultBindings: [
      { code: 'KeyA', modifiers: ['cmdOrCtrl'], label: { mac: '⌘A', windows: 'Ctrl+A', linux: 'Ctrl+A' } },
    ],
  },
  {
    id: 'file.selectNone',
    contexts: ['content'],
    defaultBindings: [
      { code: 'KeyD', modifiers: ['cmdOrCtrl'], label: { mac: '⌘D', windows: 'Ctrl+D', linux: 'Ctrl+D' } },
    ],
  },
  {
    id: 'file.invertSelection',
    contexts: ['content'],
    defaultBindings: [
      { code: 'KeyI', modifiers: ['cmdOrCtrl'], label: { mac: '⌘I', windows: 'Ctrl+I', linux: 'Ctrl+I' } },
    ],
  },
  {
    id: 'file.rename',
    contexts: ['content'],
    defaultBindings: [
      { key: 'Enter', platforms: ['mac'], allowShift: true, label: { mac: '⏎' } },
      { key: 'F2', platforms: ['windows', 'linux'], allowShift: true, label: { windows: 'F2', linux: 'F2' } },
    ],
  },
  {
    id: 'file.moveTo',
    contexts: ['content'],
    defaultBindings: [{ code: 'KeyM', modifiers: ['cmdOrCtrl', 'shift'], label: { mac: '⇧⌘M', windows: 'Ctrl+Shift+M', linux: 'Ctrl+Shift+M' } }],
  },
  {
    id: 'file.trash',
    contexts: ['content'],
    defaultBindings: [
      { key: 'Backspace', modifiers: ['meta'], platforms: ['mac'], label: { mac: '⌘⌫' } },
      { key: 'Delete', label: { mac: '⌦', windows: 'Del', linux: 'Del' } },
    ],
  },
  {
    id: 'file.deletePermanently',
    contexts: ['content'],
    defaultBindings: [
      { key: 'Backspace', modifiers: ['meta', 'alt'], platforms: ['mac'], label: { mac: '⌘⌥⌫' } },
      { key: 'Delete', modifiers: ['shift'], platforms: ['windows', 'linux'], label: { windows: 'Shift+Del', linux: 'Shift+Del' } },
    ],
  },
  {
    id: 'file.reveal',
    contexts: ['content'],
    defaultBindings: [
      { code: 'KeyR', modifiers: ['cmdOrCtrl'], label: { mac: '⌘R', windows: 'Ctrl+R', linux: 'Ctrl+R' } },
    ],
  },
  {
    id: 'file.searchSimilar',
    contexts: ['content'],
    defaultBindings: [{ code: 'KeyS', allowShift: true, label: 'S' }],
  },
  {
    id: 'dedup.toggleKeep',
    contexts: ['dedup'],
    defaultBindings: [{ code: 'KeyL', label: 'L' }],
  },
  {
    id: 'dedup.deleteSelected',
    contexts: ['dedup'],
    defaultBindings: [
      { key: 'Backspace', modifiers: ['meta'], platforms: ['mac'], label: { mac: '⌘⌫' } },
      { key: 'Delete', platforms: ['windows', 'linux'], label: { windows: 'Del', linux: 'Del' } },
    ],
  },
  {
    id: 'dedup.deleteSet',
    contexts: ['dedup'],
    defaultBindings: [
      { key: 'Backspace', modifiers: ['meta', 'shift'], platforms: ['mac'], label: { mac: '⇧⌘⌫' } },
      { key: 'Delete', modifiers: ['shift'], platforms: ['windows', 'linux'], label: { windows: 'Shift+Del', linux: 'Shift+Del' } },
    ],
  },
  {
    id: 'meta.favorite',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [{ code: 'KeyF', allowShift: true, label: 'F' }],
  },
  {
    id: 'meta.rating.clear',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [
      { key: '0', label: '0' },
      { code: 'Digit0', modifiers: ['shift'], label: { mac: '⇧0', windows: 'Shift+0', linux: 'Shift+0' } },
    ],
  },
  {
    id: 'meta.rating.one',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [
      { key: '1', label: '1' },
      { code: 'Digit1', modifiers: ['shift'], label: { mac: '⇧1', windows: 'Shift+1', linux: 'Shift+1' } },
    ],
  },
  {
    id: 'meta.rating.two',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [
      { key: '2', label: '2' },
      { code: 'Digit2', modifiers: ['shift'], label: { mac: '⇧2', windows: 'Shift+2', linux: 'Shift+2' } },
    ],
  },
  {
    id: 'meta.rating.three',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [
      { key: '3', label: '3' },
      { code: 'Digit3', modifiers: ['shift'], label: { mac: '⇧3', windows: 'Shift+3', linux: 'Shift+3' } },
    ],
  },
  {
    id: 'meta.rating.four',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [
      { key: '4', label: '4' },
      { code: 'Digit4', modifiers: ['shift'], label: { mac: '⇧4', windows: 'Shift+4', linux: 'Shift+4' } },
    ],
  },
  {
    id: 'meta.rating.five',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [
      { key: '5', label: '5' },
      { code: 'Digit5', modifiers: ['shift'], label: { mac: '⇧5', windows: 'Shift+5', linux: 'Shift+5' } },
    ],
  },
  {
    id: 'meta.culling.pick',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [{ code: 'KeyP', allowShift: true, label: 'P' }],
  },
  {
    id: 'meta.culling.reject',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [{ code: 'KeyX', allowShift: true, label: 'X' }],
  },
  {
    id: 'meta.culling.unreviewed',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [{ code: 'KeyU', allowShift: true, label: 'U' }],
  },
  {
    id: 'meta.tag',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [{ code: 'KeyT', allowShift: true, label: 'T' }],
  },
  {
    id: 'meta.collection',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [{ code: 'KeyB', label: 'B' }],
  },
  {
    id: 'meta.edit',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [{ code: 'KeyM', label: 'M' }],
  },
  {
    id: 'meta.rotate',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [{ code: 'KeyR', label: 'R' }],
  },
  {
    id: 'meta.rotateCounterclockwise',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [{ code: 'KeyR', modifiers: ['shift'], label: { mac: '⇧R', windows: 'Shift+R', linux: 'Shift+R' } }],
  },
  {
    id: 'meta.info',
    contexts: ['content', 'media-viewer'],
    defaultBindings: [
      { code: 'KeyI', label: 'I' },
    ],
  },
  {
    id: 'view.quickPreview',
    contexts: ['content'],
    defaultBindings: [
      { key: 'Enter', platforms: ['windows', 'linux'], label: { windows: 'Enter', linux: 'Enter' } },
      { key: ' ', label: 'Space' },
      { key: 'Space', label: 'Space' },
    ],
  },
  {
    id: 'view.close',
    contexts: ['content', 'image-viewer', 'settings'],
    defaultBindings: [{ key: 'Escape', label: 'Esc' }],
    readonly: true,
  },
  {
    id: 'view.togglePlayback',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [{ key: ' ', label: 'Space' }, { key: 'Space', label: 'Space' }],
  },
  {
    id: 'view.next',
    contexts: ['content', 'image-viewer'],
    defaultBindings: [{ key: 'ArrowRight', label: '→' }],
  },
  {
    id: 'view.previous',
    contexts: ['content', 'image-viewer'],
    defaultBindings: [{ key: 'ArrowLeft', label: '←' }],
  },
  {
    id: 'view.first',
    contexts: ['content', 'image-viewer'],
    defaultBindings: [
      { key: 'ArrowUp', modifiers: ['meta'], platforms: ['mac'], label: { mac: '⌘↑' } },
      { key: 'Home', platforms: ['windows', 'linux'], label: { windows: 'Home', linux: 'Home' } },
    ],
  },
  {
    id: 'view.last',
    contexts: ['content', 'image-viewer'],
    defaultBindings: [
      { key: 'ArrowDown', modifiers: ['meta'], platforms: ['mac'], label: { mac: '⌘↓' } },
      { key: 'End', platforms: ['windows', 'linux'], label: { windows: 'End', linux: 'End' } },
    ],
  },
  {
    id: 'view.pageUp',
    contexts: ['content'],
    defaultBindings: [{ key: 'PageUp', label: { mac: 'Fn↑', windows: 'PgUp', linux: 'PgUp' } }],
  },
  {
    id: 'view.pageDown',
    contexts: ['content'],
    defaultBindings: [{ key: 'PageDown', label: { mac: 'Fn↓', windows: 'PgDn', linux: 'PgDn' } }],
  },
  {
    id: 'view.zoomIn',
    contexts: ['content', 'media-viewer', 'image-viewer', 'map'],
    defaultBindings: [{ key: '=', label: '=' }],
  },
  {
    id: 'view.zoomOut',
    contexts: ['content', 'media-viewer', 'image-viewer', 'map'],
    defaultBindings: [{ key: '-', label: '-' }],
  },
  {
    id: 'view.zoomInDirectional',
    contexts: ['image-viewer'],
    defaultBindings: [{ key: 'ArrowUp', label: '↑' }],
  },
  {
    id: 'view.zoomOutDirectional',
    contexts: ['image-viewer'],
    defaultBindings: [{ key: 'ArrowDown', label: '↓' }],
  },
  {
    id: 'view.zoomFit',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [{ code: 'KeyZ', label: 'Z' }],
  },
  {
    id: 'view.cycleRawPreview',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [{ code: 'KeyR', modifiers: ['alt'], label: { mac: '⌥R', windows: 'Alt+R', linux: 'Alt+R' } }],
  },
  {
    id: 'view.toggleFullscreen',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [
      { code: 'KeyF', modifiers: ['ctrl', 'meta'], platforms: ['mac'], label: '⌃⌘F' },
      { key: 'F11', platforms: ['windows', 'linux'], label: 'F11' },
    ],
  },
  {
    id: 'view.toggleAfAreas',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [{ code: 'KeyA', modifiers: ['alt'], label: { mac: '⌥A', windows: 'Alt+A', linux: 'Alt+A' } }],
  },
  {
    id: 'view.cycleBackground',
    contexts: ['content', 'media-viewer', 'image-viewer'],
    defaultBindings: [
      { code: 'KeyB', modifiers: ['shift'], label: { mac: '⇧B', windows: 'Shift+B', linux: 'Shift+B' } },
    ],
  },
  ...VIEW_BACKGROUND_SHORTCUTS.map(({ actionId }) => ({
    id: actionId,
    contexts: ['content', 'media-viewer', 'image-viewer'] as const,
    defaultBindings: [],
  })),
  {
    id: 'view.togglePane',
    contexts: ['image-viewer'],
    defaultBindings: [{ key: 'Tab', label: 'Tab' }],
    readonly: true,
  },

] as const;

const shortcutMap = new Map<ShortcutActionId, ShortcutDefinition>(
  SHORTCUTS.map((shortcut) => [shortcut.id, shortcut]),
);

export function getShortcut(actionId: ShortcutActionId): ShortcutDefinition {
  const shortcut = shortcutMap.get(actionId);
  if (!shortcut) {
    throw new Error(`Unknown shortcut action: ${actionId}`);
  }
  return shortcut;
}

export function getShortcutsByContext(context: ShortcutContext): readonly ShortcutDefinition[] {
  return SHORTCUTS.filter((shortcut) => shortcut.contexts.includes(context));
}

export function getShortcutLabels(
  actionId: ShortcutActionId,
  platform: ShortcutPlatform = DEFAULT_PLATFORM,
  overrides?: ShortcutOverrides,
): string[] {
  const custom = overrides?.[platform]?.[actionId];
  if (custom) return [formatCustomShortcut(custom, platform)];
  return getShortcut(actionId).defaultBindings
    .filter((binding) => isBindingAvailableOnPlatform(binding, platform))
    .map((binding) => getBindingLabel(binding, platform));
}

export function getShortcutLabel(
  actionId: ShortcutActionId,
  platform: ShortcutPlatform = DEFAULT_PLATFORM,
  overrides?: ShortcutOverrides,
): string {
  return getShortcutLabels(actionId, platform, overrides)[0] ?? '';
}

export function matchesShortcut(
  actionId: ShortcutActionId,
  event: ShortcutEventLike,
  platform: ShortcutPlatform = DEFAULT_PLATFORM,
  overrides?: ShortcutOverrides,
): boolean {
  return getEffectiveBindings(actionId, platform, overrides).some((binding) => matchesBinding(binding, event, platform));
}

export function findShortcutMatches(
  context: ShortcutContext,
  event: ShortcutEventLike,
  platform: ShortcutPlatform = DEFAULT_PLATFORM,
  overrides?: ShortcutOverrides,
): ShortcutActionId[] {
  return getShortcutsByContext(context)
    .filter((shortcut) => matchesShortcut(shortcut.id, event, platform, overrides))
    .map((shortcut) => shortcut.id);
}

const DEDUP_ROW_NAVIGATION_KEYS = new Set(['ArrowUp', 'ArrowDown']);

/** Whether the focused Duplicates pane handles this key instead of the global handlers. */
export function isDedupPaneShortcut(
  event: ShortcutEventLike & { target?: EventTarget | null },
  platform: ShortcutPlatform = DEFAULT_PLATFORM,
  overrides?: ShortcutOverrides,
): boolean {
  const target = event.target as { closest?: (selector: string) => unknown } | null | undefined;
  if (!target?.closest?.('[data-dedup-shortcuts]')) return false;
  const plain = !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
  return (plain && DEDUP_ROW_NAVIGATION_KEYS.has(event.key))
    || findShortcutMatches('dedup', event, platform, overrides).length > 0;
}

export function getShortcutConflicts(
  context: ShortcutContext,
  platform: ShortcutPlatform = DEFAULT_PLATFORM,
): Array<{ signature: string; actions: ShortcutActionId[] }> {
  const actionsBySignature = new Map<string, ShortcutActionId[]>();

  for (const shortcut of getShortcutsByContext(context)) {
    for (const binding of shortcut.defaultBindings) {
      if (!isBindingAvailableOnPlatform(binding, platform)) continue;
      for (const signature of getBindingSignatures(binding, platform)) {
        const actions = actionsBySignature.get(signature) ?? [];
        actions.push(shortcut.id);
        actionsBySignature.set(signature, actions);
      }
    }
  }

  return Array.from(actionsBySignature.entries())
    .filter(([, actions]) => actions.length > 1)
    .map(([signature, actions]) => ({ signature, actions }));
}

export function getBindingLabel(
  binding: ShortcutBinding,
  platform: ShortcutPlatform = DEFAULT_PLATFORM,
): string {
  if (typeof binding.label === 'string') return binding.label;
  return binding.label[platform] ?? binding.label.default ?? '';
}

export function getBindingSignature(
  binding: ShortcutBinding,
  platform: ShortcutPlatform = DEFAULT_PLATFORM,
): string {
  return getBindingSignatures(binding, platform)[0];
}

function getBindingSignatures(
  binding: ShortcutBinding,
  platform: ShortcutPlatform = DEFAULT_PLATFORM,
): string[] {
  const modifiers = (binding.modifiers ?? []).map((modifier) =>
    modifier === 'cmdOrCtrl' ? (platform === 'mac' ? 'meta' : 'ctrl') : modifier,
  );
  modifiers.sort();
  const baseSignature = [...modifiers, binding.code ?? '', binding.key ?? ''].join('+');

  if (!binding.allowShift || modifiers.includes('shift')) {
    return [baseSignature];
  }

  const shiftedModifiers = [...modifiers, 'shift'];
  shiftedModifiers.sort();
  return [baseSignature, [...shiftedModifiers, binding.code ?? '', binding.key ?? ''].join('+')];
}

function matchesBinding(
  binding: ShortcutBinding,
  event: ShortcutEventLike,
  platform: ShortcutPlatform,
): boolean {
  if (!isBindingAvailableOnPlatform(binding, platform)) return false;
  if (binding.key && (binding.captured ? normalizeCapturedKey(event.key) : event.key) !== binding.key) return false;
  if (binding.code && !matchesKeyCode(binding.code, event)) return false;

  const modifiers = new Set(binding.modifiers ?? []);
  const expectsCtrl = modifiers.has('ctrl') || (modifiers.has('cmdOrCtrl') && platform !== 'mac');
  const expectsMeta = modifiers.has('meta') || (modifiers.has('cmdOrCtrl') && platform === 'mac');

  return Boolean(event.ctrlKey) === expectsCtrl
    && Boolean(event.metaKey) === expectsMeta
    && Boolean(event.altKey) === modifiers.has('alt')
    && (binding.allowShift && !modifiers.has('shift')
      ? true
      : Boolean(event.shiftKey) === modifiers.has('shift'));
}

function isBindingAvailableOnPlatform(binding: ShortcutBinding, platform: ShortcutPlatform): boolean {
  return !binding.platforms || binding.platforms.includes(platform);
}

// Bindings match the character the active layout produces, not the physical
// QWERTY slot of event.code. On AZERTY the key labelled "Q" sits on the
// physical KeyA position, so matching by code made Cmd-Q trigger Select All
// (and swallowed the system quit accelerator); the comma lives on the
// physical Semicolon slot, breaking Cmd-, too. Latin layouts (including
// Dvorak and Colemak) therefore match by character; non-Latin layouts
// (Cyrillic, Greek, ...) fall back to the physical key so shortcuts stay
// reachable when event.key is not an ASCII character. Digits keep physical
// matching because shifted digit slots produce symbols, not digits.
const CODE_CHAR: Record<string, string> = {
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Backslash: '\\',
  BracketLeft: '[',
  BracketRight: ']',
  Minus: '-',
  Equal: '=',
};

function matchesKeyCode(code: string, event: ShortcutEventLike): boolean {
  const expected = /^Key([A-Z])$/.exec(code)?.[1]?.toLowerCase() ?? CODE_CHAR[code];
  const key = event.key ?? '';
  if (expected && key.length === 1 && /[\x20-\x7E]/.test(key)) {
    return key.toLowerCase() === expected;
  }
  return event.code === code;
}

const NATIVE_MAC_ACTIONS = new Set<ShortcutActionId>([
  'app.preferences', 'file.selectAll', 'file.copy', 'file.paste',
]);
const ADVANCE_ACTIONS = new Set<ShortcutActionId>([
  'meta.favorite', 'meta.rating.clear', 'meta.rating.one', 'meta.rating.two',
  'meta.rating.three', 'meta.rating.four', 'meta.rating.five',
  'meta.culling.pick', 'meta.culling.reject', 'meta.culling.unreviewed',
]);

export function isShortcutEditable(actionId: ShortcutActionId, platform: ShortcutPlatform): boolean {
  const shortcut = shortcutMap.get(actionId);
  return Boolean(shortcut && !shortcut.readonly && !(platform === 'mac' && NATIVE_MAC_ACTIONS.has(actionId)));
}

export function hasShortcutOverride(
  actionId: ShortcutActionId,
  platform: ShortcutPlatform,
  overrides?: ShortcutOverrides,
): boolean {
  return Boolean(overrides?.[platform]?.[actionId]);
}

function normalizeCapturedKey(key: string): string {
  if (key === 'Space' || key === 'Spacebar') return ' ';
  return key.length === 1 ? key.toLowerCase() : key;
}

function isReservedShortcut(binding: CustomShortcutBinding, platform: ShortcutPlatform): boolean {
  const { key, modifiers } = binding;
  if (['Alt', 'AltGraph', 'CapsLock', 'Compose', 'Control', 'Dead', 'Fn', 'Meta', 'NumLock',
    'Process', 'ScrollLock', 'Shift', 'Unidentified', 'Escape', 'Tab'].includes(key)) return true;

  if (modifiers.every((modifier) => modifier === 'shift') && ['ArrowUp', 'ArrowDown'].includes(key)) return true;
  if (platform !== 'mac') return key === 'F4' && modifiers.length === 1 && modifiers.includes('alt');
  if (!modifiers.includes('meta') || modifiers.includes('ctrl')) return false;
  if (modifiers.includes('alt')) return key === 'h' && !modifiers.includes('shift');
  if (modifiers.includes('shift')) return key === 'z';
  return ['q', 'w', 'm', 'h', 'x', 'z', 'a', 'c', 'v', ','].includes(key);
}

function normalizeCustomBinding(value: unknown, platform: ShortcutPlatform): CustomShortcutBinding | null {
  if (!value || typeof value !== 'object') return null;
  const { key, code, modifiers } = value as Partial<CustomShortcutBinding>;
  if (typeof key !== 'string' || !key || key.length > 40 || !Array.isArray(modifiers)
    || !modifiers.every((modifier) => CAPTURE_MODIFIERS.includes(modifier))) return null;
  const binding: CustomShortcutBinding = {
    key: normalizeCapturedKey(key),
    modifiers: CAPTURE_MODIFIERS.filter((modifier) => modifiers.includes(modifier)),
  };
  if (typeof code === 'string' && /^[A-Za-z0-9]+$/.test(code) && code.length <= 40) binding.code = code;
  return isReservedShortcut(binding, platform) ? null : binding;
}

export function captureShortcut(event: KeyboardEvent, platform = DEFAULT_PLATFORM): CustomShortcutBinding | null {
  if (event.isComposing || event.getModifierState?.('AltGraph')) return null;
  return normalizeCustomBinding({
    key: event.key,
    code: event.code,
    modifiers: CAPTURE_MODIFIERS.filter((modifier) => event[`${modifier}Key`]),
  }, platform);
}

export function normalizeShortcutOverrides(value: unknown): ShortcutOverrides {
  const result: ShortcutOverrides = {};
  if (!value || typeof value !== 'object') return result;

  for (const platform of ['mac', 'windows', 'linux'] as const) {
    const bindings = (value as ShortcutOverrides)[platform];
    if (!bindings || typeof bindings !== 'object') continue;
    for (const { id } of SHORTCUTS) {
      if (!isShortcutEditable(id, platform)) continue;
      const binding = normalizeCustomBinding(bindings[id], platform);
      if (binding) (result[platform] ??= {})[id] = binding;
    }
  }
  return result;
}

const KEY_LABELS: Record<string, string> = {
  ' ': 'Space', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
  Backspace: 'Backspace', Delete: 'Delete', PageUp: 'PgUp', PageDown: 'PgDn',
};
const MAC_KEYS: Record<string, string> = { Enter: '⏎', Backspace: '⌫', Delete: '⌦' };
const MAC_MODIFIERS = { ctrl: '⌃', alt: '⌥', shift: '⇧', meta: '⌘' };
const OTHER_MODIFIERS = { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', meta: 'Meta' };

function formatCustomShortcut(binding: CustomShortcutBinding, platform: ShortcutPlatform): string {
  const { key, code, modifiers } = binding;
  const upperKey = key.toUpperCase();
  const keyLabel = code?.startsWith('Numpad')
    ? `Num ${key === '+' ? 'Add' : upperKey}`
    : (Object.hasOwn(KEY_LABELS, key) ? KEY_LABELS[key] : upperKey.length === 1 ? upperKey : key);
  if (platform === 'mac') {
    const macKey = Object.hasOwn(MAC_KEYS, key) ? MAC_KEYS[key] : keyLabel;
    return [...CAPTURE_MODIFIERS.filter((modifier) => modifiers.includes(modifier))
      .map((modifier) => MAC_MODIFIERS[modifier]), macKey].join('');
  }
  return [...modifiers.map((modifier) => OTHER_MODIFIERS[modifier]), keyLabel].join('+');
}

function getCustomBindings(
  actionId: ShortcutActionId,
  custom: CustomShortcutBinding,
  platform: ShortcutPlatform,
): ShortcutBinding[] {
  const main: ShortcutBinding = {
    key: custom.key,
    code: custom.code?.startsWith('Numpad') ? custom.code : undefined,
    codeHint: custom.code,
    modifiers: custom.modifiers,
    label: formatCustomShortcut(custom, platform),
    captured: true,
  };
  if (!ADVANCE_ACTIONS.has(actionId) || custom.modifiers.includes('shift')) return [main];

  // Shift usually preserves the key for named keys and changes only the case
  // of a letter. Shifted number-row keys need their physical digit instead.
  const digitCode = /^[0-9]$/.test(custom.key) && /^Digit[0-9]$/.test(custom.code ?? '') ? custom.code : undefined;
  if (!digitCode && custom.key.length === 1 && !/\p{L}/u.test(custom.key) && custom.key !== ' ') return [main];
  const shifted = { ...custom, modifiers: [...custom.modifiers, 'shift'] as const };
  return [main, {
    ...main,
    key: digitCode ? undefined : main.key,
    code: digitCode ?? main.code,
    modifiers: shifted.modifiers,
    label: formatCustomShortcut(shifted, platform),
  }];
}

function getEffectiveBindings(actionId: ShortcutActionId, platform: ShortcutPlatform, overrides?: ShortcutOverrides) {
  const custom = overrides?.[platform]?.[actionId];
  return custom ? getCustomBindings(actionId, custom, platform) : getShortcut(actionId).defaultBindings;
}

export function getShortcutAdvanceLabels(
  actionId: ShortcutActionId,
  platform: ShortcutPlatform,
  overrides?: ShortcutOverrides,
): string[] {
  if (!ADVANCE_ACTIONS.has(actionId)) return [];
  const custom = overrides?.[platform]?.[actionId];
  if (custom) return getCustomBindings(actionId, custom, platform).slice(1).map((binding) => getBindingLabel(binding, platform));
  return getShortcut(actionId).defaultBindings
    .filter((binding) => isBindingAvailableOnPlatform(binding, platform) && (binding.allowShift || binding.modifiers?.includes('shift')))
    .map((binding) => {
      const label = getBindingLabel(binding, platform);
      return binding.allowShift ? `${platform === 'mac' ? '⇧' : 'Shift+'}${label}` : label;
    });
}

export function shouldAdvanceShortcut(
  actionId: ShortcutActionId,
  event: ShortcutEventLike,
  platform: ShortcutPlatform,
  overrides?: ShortcutOverrides,
): boolean {
  return Boolean(event.shiftKey && !overrides?.[platform]?.[actionId]?.modifiers.includes('shift'));
}

function eventsForBinding(binding: ShortcutBinding, platform: ShortcutPlatform): ShortcutEventLike[] {
  if (!isBindingAvailableOnPlatform(binding, platform)) return [];
  const { code, codeHint, modifiers = [] } = binding;
  const cmdOrCtrl = modifiers.includes('cmdOrCtrl');
  const shift = modifiers.includes('shift');
  const digit = /^Digit([0-9])$/.exec(code ?? '')?.[1];
  const key = binding.key ?? /^Key([A-Z])$/.exec(code ?? '')?.[1]?.toLowerCase()
    ?? CODE_CHAR[code ?? ''] ?? digit ?? (code === 'NumpadAdd' ? '+' : code === 'NumpadSubtract' ? '-' : code?.slice(6)) ?? '';
  const keyCode = code ?? codeHint;
  const sample = {
    key, code: keyCode, shiftKey: shift, altKey: modifiers.includes('alt'),
    ctrlKey: modifiers.includes('ctrl') || (cmdOrCtrl && platform !== 'mac'),
    metaKey: modifiers.includes('meta') || (cmdOrCtrl && platform === 'mac'),
  };
  if (digit && shift) return [sample, { ...sample, key: ')!@#$%^&*('[Number(digit)] }];
  return binding.allowShift && !shift ? [sample, { ...sample, shiftKey: true }] : [sample];
}

function bindingOverlaps(left: ShortcutBinding, right: ShortcutBinding, platform: ShortcutPlatform): boolean {
  return eventsForBinding(left, platform).some((event) => matchesBinding(right, event, platform))
    || eventsForBinding(right, platform).some((event) => matchesBinding(left, event, platform));
}

function actionsShareContext(action: ShortcutDefinition, other: ShortcutDefinition): boolean {
  return action.contexts.includes('global') || other.contexts.includes('global')
    || action.contexts.some((context) => other.contexts.includes(context));
}

export function findShortcutConflict(
  actionId: ShortcutActionId,
  custom: CustomShortcutBinding,
  platform: ShortcutPlatform,
  overrides?: ShortcutOverrides,
): ShortcutActionId | undefined {
  return findConflictingAction(actionId, getCustomBindings(actionId, custom, platform), platform, overrides, false);
}

export function findShortcutResetConflict(
  actionId: ShortcutActionId,
  platform: ShortcutPlatform,
  overrides?: ShortcutOverrides,
): ShortcutActionId | undefined {
  return findConflictingAction(actionId, getShortcut(actionId).defaultBindings, platform, overrides, true);
}

function findConflictingAction(
  actionId: ShortcutActionId,
  bindings: readonly ShortcutBinding[],
  platform: ShortcutPlatform,
  overrides: ShortcutOverrides | undefined,
  onlyOverrides: boolean,
): ShortcutActionId | undefined {
  const action = getShortcut(actionId);
  return SHORTCUTS.find((other) => {
    if (other.id === actionId || !actionsShareContext(action, other)) return false;
    if (onlyOverrides && !hasShortcutOverride(other.id, platform, overrides)) return false;
    return getEffectiveBindings(other.id, platform, overrides).some((otherBinding) =>
      bindings.some((binding) => bindingOverlaps(binding, otherBinding, platform)),
    );
  })?.id;
}
