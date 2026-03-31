import { useCallback, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
};

type PendingConfirm = ConfirmOptions & {
  resolve: (v: boolean) => void;
};

export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({
        title: options.title,
        description: options.description,
        confirmText: options.confirmText ?? "Ya, lanjutkan",
        cancelText: options.cancelText ?? "Batal",
        variant: options.variant ?? "default",
        resolve,
      });
    });
  }, []);

  const dialog = useMemo(() => {
    if (!pending) return null;
    return (
      <ConfirmDialog
        open
        title={pending.title}
        description={pending.description}
        confirmText={pending.confirmText}
        cancelText={pending.cancelText}
        variant={pending.variant}
        onCancel={() => {
          pending.resolve(false);
          setPending(null);
        }}
        onConfirm={() => {
          pending.resolve(true);
          setPending(null);
        }}
      />
    );
  }, [pending]);

  return { confirm, dialog };
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  cancelText,
  variant,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={description ? "confirm-desc" : undefined}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="p-5">
          <h2 id="confirm-title" className="text-base font-semibold text-gray-900">
            {title}
          </h2>
          {description ? (
            <p id="confirm-desc" className="mt-1.5 text-sm text-gray-600">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {cancelText ?? "Batal"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              variant === "destructive"
                ? "bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive"
                : "bg-primary hover:bg-primary/90 focus-visible:ring-primary",
            )}
          >
            {confirmText ?? "Ya, lanjutkan"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialogOutlet({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

