// Déclaration pour détecter Tauri
declare global {
  interface Window {
    __TAURI__?: boolean;
    __TAURI_INTERNALS__?: unknown;
  }
}
