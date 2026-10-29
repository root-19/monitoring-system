"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { cn } from "@/lib/cn";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __pgiInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

const CHANGE = "pgi:install-change";

function isStandalone() {
  if (typeof window === "undefined") return false;
  const mq =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)")
      : null;
  return (
    Boolean(mq?.matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const iPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || iPadOS;
}

type InstallState = "hidden" | "prompt" | "ios";
function snapshot(): InstallState {
  if (isStandalone()) return "hidden";
  if (window.__pgiInstallPrompt) return "prompt";
  if (isIOS()) return "ios";
  return "hidden";
}
function subscribe(cb: () => void) {
  window.addEventListener(CHANGE, cb);
  return () => window.removeEventListener(CHANGE, cb);
}
const notify = () => window.dispatchEvent(new Event(CHANGE));

/**
 * Registers the service worker once and captures the browser's install prompt so the
 * Install button can trigger it later, even if the button mounts after the event fired.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
      return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__pgiInstallPrompt = e as BeforeInstallPromptEvent;
      notify();
    };
    const onInstalled = () => {
      window.__pgiInstallPrompt = null;
      notify();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

/** Header button: native install prompt where supported, Add-to-Home-Screen steps on iPhone/iPad. */
export function InstallAppButton({
  className,
  light = false,
  compact = false,
}: {
  className?: string;
  light?: boolean;
  compact?: boolean;
}) {
  const state = useSyncExternalStore(
    subscribe,
    snapshot,
    () => "hidden" as InstallState,
  );
  const [showIos, setShowIos] = useState(false);

  if (state === "hidden") return null;

  const onClick = async () => {
    if (state === "ios") return setShowIos(true);
    const p = window.__pgiInstallPrompt;
    if (!p) return;
    await p.prompt();
    const { outcome } = await p.userChoice;
    if (outcome === "accepted") {
      window.__pgiInstallPrompt = null;
      notify();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition",
          light
            ? "border-white/30 text-white hover:bg-white/10"
            : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100",
          className,
        )}
        aria-label="Install app"
      >
        <Download className="size-4" />
        <span className={cn(compact && "hidden sm:inline")}>Install app</span>
      </button>

      {showIos &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-4"
            role="dialog"
            aria-modal
            aria-label="Install on iPhone"
          >
            <div
              className="absolute inset-0 bg-ink/50"
              onClick={() => setShowIos(false)}
            />
            <div className="relative w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
              <button
                onClick={() => setShowIos(false)}
                className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-surface-2"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
              <h3 className="text-lg font-bold text-ink">Install Fiesta Gas</h3>
              <p className="mt-1 text-sm text-ink-500">
                Add it to your Home Screen so it opens like an app.
              </p>
              <ol className="mt-4 space-y-3 text-sm text-ink-700">
                <li className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Share className="size-4" />
                  </span>
                  <span>
                    Tap the <strong>Share</strong> button in Safari.
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <SquarePlus className="size-4" />
                  </span>
                  <span>
                    Choose <strong>Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Download className="size-4" />
                  </span>
                  <span>
                    Tap <strong>Add</strong>. Done!
                  </span>
                </li>
              </ol>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
