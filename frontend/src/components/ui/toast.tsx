import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

type ToastVariant = "default" | "success" | "error";

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function genId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) window.clearTimeout(t);
    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = genId();
      const item: ToastItem = {
        id,
        title: input.title,
        description: input.description,
        variant: input.variant ?? "default",
        durationMs: input.durationMs ?? 4500,
      };

      setToasts((prev) => [item, ...prev].slice(0, 4));

      const timeout = window.setTimeout(() => dismiss(id), item.durationMs);
      timersRef.current.set(id, timeout);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed bottom-4 right-4 z-[100] flex w-[min(420px,calc(100vw-2rem))] flex-col-reverse gap-2"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "group relative rounded-xl border bg-white p-4 shadow-lg ring-1 ring-black/5",
            "transition-opacity motion-reduce:transition-none",
            t.variant === "success" && "border-emerald-200 bg-emerald-50/70",
            t.variant === "error" && "border-red-200 bg-red-50/70",
          )}
          role={t.variant === "error" ? "alert" : "status"}
        >
          <div className="pr-10">
            <p className="text-sm font-semibold text-gray-900">{t.title}</p>
            {t.description ? (
              <p className="mt-1 text-sm text-gray-700">{t.description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="absolute right-2.5 top-2.5 rounded-lg p-2 text-gray-500 hover:bg-black/5 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Tutup notifikasi"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

