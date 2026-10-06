export function openNativePicker(event) {
  const input = event.currentTarget;
  if (typeof input.showPicker !== "function") return;
  try {
    input.showPicker();
  } catch {
    // Keep native text and keyboard editing available when no picker is exposed.
  }
}
