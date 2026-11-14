// Client-side PWA helpers: install-prompt capture + version-based update checks.
// Browser-only — guard every call behind `typeof window`.

// ---- Install prompt (beforeinstallprompt) ----

// The event fires once, early, before any React component may want it — so we
// capture it at module load and stash it for the install button to consume.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(available: boolean) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installListeners.forEach((fn) => fn(true));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installListeners.forEach((fn) => fn(false));
  });
}

export function onInstallAvailabilityChange(fn: (available: boolean) => void) {
  installListeners.add(fn);
  return () => {
    installListeners.delete(fn);
  };
}

export function isInstallAvailable() {
  return deferredPrompt !== null;
}

// Show the native install sheet. Returns true if the user accepted.
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installListeners.forEach((fn) => fn(false));
  return outcome === 'accepted';
}

// True when running as an installed standalone app (home-screen launch).
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPadOS 13+ reports itself as a Mac; a touch screen gives it away.
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// iOS only offers "Add to Home Screen" from Safari itself - Chrome/Firefox/Edge
// on iOS (CriOS/FxiOS/EdgiOS) cannot install, so the banner stays away from them.
export function isIosSafari(): boolean {
  if (!isIos()) return false;
  return !/crios|fxios|edgios|opios|gsa[/]/i.test(navigator.userAgent);
}

// ---- Update detection (version.json) ----

interface VersionPayload {
  version: string;
  buildId?: string;
  buildTime?: string;
}

// Fetch version.json with cache fully bypassed.
export async function fetchDeployedBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?v=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as VersionPayload;
    return data.buildId ?? data.version ?? null;
  } catch {
    return null;
  }
}

// Tell the waiting service worker to activate, clear caches, then reload.
export async function applyUpdateAndReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) reg.waiting.postMessage({ type: 'UPDATE_APP' });
      else if (reg) {
        await reg.update();
        reg.waiting?.postMessage({ type: 'UPDATE_APP' });
      }
    }
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
  } finally {
    window.location.reload();
  }
}

// Version shown in Profile > App (public/version.json, rewritten every build).
export async function fetchAppVersion(): Promise<{ version: string; buildId: string | null } | null> {
  try {
    const res = await fetch(`/version.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as VersionPayload;
    return { version: data.version, buildId: data.buildId ?? null };
  } catch {
    return null;
  }
}
