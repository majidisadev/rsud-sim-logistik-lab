import { ReactNode, useEffect, useRef, useCallback, useState } from "react";
import { X } from "lucide-react";
import anime from "animejs";
import { cn } from "../../lib/utils";

interface RightSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: "sm" | "md" | "lg" | "xl" | "full";
  /** Optional id for aria-labelledby (accessibility) */
  titleId?: string;
}

const WIDTH_MAP = {
  sm: "28rem",
  md: "32rem",
  lg: "42rem",
  xl: "52rem",
  full: "100%",
};

export default function RightSidePanel({
  isOpen,
  onClose,
  title,
  children,
  width = "md",
  titleId = "panel-title",
}: RightSidePanelProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isExiting, setIsExiting] = useState(false);
  const wasOpenRef = useRef(false);

  const runCloseAnimation = useCallback(() => {
    if (!overlayRef.current || !panelRef.current) return;
    setIsExiting(true);
    anime({
      targets: panelRef.current,
      translateX: ["0%", "100%"],
      opacity: [1, 0.95],
      duration: 280,
      easing: "easeInOutQuad",
    });
    anime({
      targets: overlayRef.current,
      opacity: [1, 0],
      duration: 220,
      easing: "easeOutQuad",
      complete: () => {
        setIsExiting(false);
        wasOpenRef.current = false;
        onClose();
      },
    });
  }, [onClose]);

  useEffect(() => {
    if (isOpen) wasOpenRef.current = true;
    if (!isOpen && wasOpenRef.current && !isExiting) {
      runCloseAnimation();
      return;
    }
    if (!isOpen) return;

    document.body.style.overflow = "hidden";

    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel) return;

    overlay.style.opacity = "0";
    panel.style.transform = "translateX(100%)";
    panel.style.opacity = "0.95";

    anime({
      targets: overlay,
      opacity: [0, 1],
      duration: 260,
      easing: "easeOutQuad",
    });
    anime({
      targets: panel,
      translateX: ["100%", "0%"],
      opacity: [0.95, 1],
      duration: 320,
      easing: "easeOutCubic",
      delay: 40,
    });

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (isOpen || isExiting)) runCloseAnimation();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, isExiting, runCloseAnimation]);

  const visible = isOpen || isExiting || wasOpenRef.current;
  if (!visible) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) runCloseAnimation();
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex justify-end"
      onClick={handleOverlayClick}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        style={{ width: WIDTH_MAP[width], maxWidth: "100vw" }}
        className={cn(
          "relative flex flex-col h-full bg-white shadow-2xl",
          "border-l border-gray-200/80",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between flex-shrink-0 px-6 py-4 border-b border-gray-100 bg-gray-50/80">
          <h2
            id={titleId}
            className="text-lg font-semibold text-gray-900 tracking-tight"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={runCloseAnimation}
            className="p-2 -m-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors"
            aria-label="Tutup panel"
          >
            <X className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
