const STORAGE_KEY = "wano_lite_mode";

export function getLiteMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function setLiteMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, String(enabled));
  document.documentElement.setAttribute("data-lite-mode", String(enabled));
}

export function applyStoredLiteMode() {
  if (typeof window === "undefined") return;
  document.documentElement.setAttribute("data-lite-mode", String(getLiteMode()));
}
