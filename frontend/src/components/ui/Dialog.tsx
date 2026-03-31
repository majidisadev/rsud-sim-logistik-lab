import { ReactNode, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { usePrefersReducedMotion } from "../../lib/hooks/usePrefersReducedMotion";

type DialogSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<DialogSize, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

function getFocusableElements(container: HTMLElement) {
  const selectors = [
    "[data-autofocus]",
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  const nodes = Array.from(container.querySelectorAll<HTMLElement>(selectors));
  // Filter out elements that are not actually visible/focusable
  return nodes.filter((el) => {
    const style = window.getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    // offsetParent null includes position:fixed; allow if it has rects
    const rects = el.getClientRects();
    return rects.length > 0;
  });
}

export default function Dialog({
  open,
  onClose,
  title,
  titleId = "dialog-title",
  description,
  descriptionId = "dialog-desc",
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  description?: string;
  descriptionId?: string;
  size?: DialogSize;
  children: ReactNode;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const previouslyFocusedElRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const ariaDescribedBy = useMemo(
    () => (description ? descriptionId : undefined),
    [description, descriptionId],
  );

  useEffect(() => {
    if (!open) return;
    previouslyFocusedElRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    // Focus first focusable (prefer [data-autofocus]), otherwise container
    const t = window.setTimeout(() => {
      const root = dialogRef.current;
      if (!root) return;
      const focusables = getFocusableElements(root);
      (focusables[0] ?? root).focus();
    }, 0);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = "";
      previouslyFocusedElRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4",
        reduceMotion ? "" : "animate-in fade-in duration-150",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={ariaDescribedBy}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          "relative w-full rounded-2xl bg-white shadow-xl ring-1 ring-black/5 outline-none overflow-hidden",
          "max-h-[85vh] sm:max-h-[90vh]",
          "flex flex-col",
          SIZE_CLASS[size],
        )}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const root = dialogRef.current;
          if (!root) return;
          const focusables = getFocusableElements(root);
          if (focusables.length === 0) {
            e.preventDefault();
            root.focus();
            return;
          }

          const active = document.activeElement as HTMLElement | null;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];

          if (e.shiftKey) {
            if (!active || active === first || !root.contains(active)) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (!active || active === last || !root.contains(active)) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-base font-semibold text-gray-900 leading-tight"
            >
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-gray-600">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-black/5 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Tutup dialog"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

