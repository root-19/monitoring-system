"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Info, XCircle } from "lucide-react";

type Tone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: Tone };

const ToastContext = createContext<{ toast: (message: string, tone?: Tone) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const toast = useCallback((message: string, tone: Tone = "success") => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);
  const icons = { success: CheckCircle2, error: XCircle, info: Info };
  const colors = { success: "text-green-600", error: "text-red-600", info: "text-brand-600" };
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => {
            const Icon = icons[t.tone];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-sm shadow-card"
              >
                <Icon className={`size-4 shrink-0 ${colors[t.tone]}`} />
                <span className="text-ink">{t.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx.toast;
}

/** Turn a Convex error into a short human message. */
export function errorText(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  const m = msg.match(/Uncaught Error: (.*?)(\n|$)/);
  return m ? m[1] : msg.replace(/^\[.*?\]\s*/, "").split("\n")[0];
}
