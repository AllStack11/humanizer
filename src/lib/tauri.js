let tauriInvokeCache = null;
let tauriListenCache = null;

export function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function tauriInvoke(command, args = {}) {
  if (!isTauriRuntime()) throw new Error("Tauri runtime is not available");
  if (!tauriInvokeCache) {
    tauriInvokeCache = import("@tauri-apps/api/core").then((m) => m.invoke);
  }
  const invoke = await tauriInvokeCache;
  return invoke(command, args);
}

export async function tauriListen(eventName, callback) {
  if (!isTauriRuntime()) throw new Error("Tauri runtime is not available");
  if (!tauriListenCache) {
    tauriListenCache = import("@tauri-apps/api/event").then((m) => m.listen);
  }
  const listen = await tauriListenCache;
  return listen(eventName, callback);
}
