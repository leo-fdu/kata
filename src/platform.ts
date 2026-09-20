export interface ModifierKeys {
  metaKey: boolean;
  ctrlKey: boolean;
}

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

export function primaryModifierPressed(event: ModifierKeys): boolean {
  return event.metaKey || event.ctrlKey;
}

export function shortcutPrefix(mac = isMacPlatform()): string {
  return mac ? "⌘" : "Ctrl+";
}
