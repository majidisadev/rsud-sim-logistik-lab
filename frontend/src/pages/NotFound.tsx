import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Package, Home, ArrowLeft, Search } from "lucide-react";
import anime from "animejs";

export default function NotFound() {
  const { user } = useAuth();
  const location = useLocation();

  const mainRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const errorCodeRef = useRef<HTMLDivElement>(null);
  const mobileCodeRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "404 - Halaman Tidak Ditemukan | SIM Logistik Lab";
    return () => {
      document.title = "SIM Logistik Lab";
    };
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return () => {};

    const tl = anime.timeline({
      easing: "easeOutExpo",
      duration: 600,
    });

    tl.add(
      {
        targets: [errorCodeRef.current, mobileCodeRef.current].filter(Boolean),
        scale: [0.5, 1],
        opacity: [0, 1],
        duration: 700,
        easing: "easeOutElastic(1, 0.6)",
      },
      0
    )
      .add(
        {
          targets: leftRef.current,
          translateX: [-40, 0],
          opacity: [0, 1],
          duration: 600,
        },
        "-=400"
      )
      .add(
        {
          targets: cardRef.current,
          translateY: [60, 0],
          opacity: [0, 1],
          duration: 650,
        },
        "-=350"
      )
      .add(
        {
          targets: [iconRef.current, headingRef.current, descRef.current].filter(Boolean),
          translateY: [20, 0],
          opacity: [0, 1],
          delay: anime.stagger(80),
          duration: 450,
        },
        "-=400"
      )
      .add(
        {
          targets: actionsRef.current?.querySelectorAll("a, button"),
          translateY: [16, 0],
          opacity: [0, 1],
          delay: anime.stagger(70, { start: 250 }),
          duration: 400,
        },
        "-=150"
      );

    // Subtle floating loop for icon (gentle)
    const floatInterval = setTimeout(() => {
      if (iconRef.current && !prefersReducedMotion) {
        anime({
          targets: iconRef.current,
          translateY: [0, -6, 0],
          duration: 3000,
          easing: "easeInOutSine",
          loop: true,
        });
      }
    }, 1200);

    return () => clearTimeout(floatInterval);
  }, []);

  return (
    <div
      className="min-h-screen flex relative overflow-hidden"
      role="main"
      aria-labelledby="notfound-title"
      aria-describedby="notfound-desc"
    >
      {/* Skip link - Accessibility */}
      <a
        href="#notfound-actions"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2.5 focus:bg-white focus:text-primary focus:rounded-lg focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none transition-all font-medium"
      >
        Langsung ke tombol navigasi
      </a>

      {/* Decorative background elements - reduced motion safe */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-primary/5"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/4 -right-32 w-96 h-96 bg-primary/8 rounded-full blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-1/4 -left-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl"
        aria-hidden="true"
      />

      {/* Left panel - Desktop */}
      <section
        ref={leftRef}
        className="hidden md:flex md:w-1/2 relative z-10 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white flex-col items-center justify-center p-12"
        aria-hidden="true"
      >
        <div className="max-w-lg text-center">
          <div
            ref={errorCodeRef}
            className="text-[12rem] font-extrabold text-white/25 leading-none select-none tracking-tighter"
          >
            404
          </div>
          <h2 className="text-2xl font-bold mb-4 text-white/95 tracking-tight">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-lg text-white/90 leading-relaxed max-w-sm mx-auto">
            Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
          </p>
        </div>
      </section>

      {/* Right panel - Content */}
      <section
        ref={mainRef}
        className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-10 relative z-10"
      >
        <div className="w-full max-w-md">
          {/* Mobile - 404 display */}
          <div className="md:hidden text-center mb-6" aria-hidden="true">
            <div
              ref={mobileCodeRef}
              className="text-[7rem] sm:text-8xl font-extrabold text-primary/25 leading-none select-none tracking-tighter"
            >
              404
            </div>
          </div>

          <div
            ref={cardRef}
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl shadow-gray-200/80 p-8 sm:p-10 border border-gray-100"
          >
            <div
              ref={iconRef}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-primary/10"
              aria-hidden="true"
            >
              <Package
                className="w-10 h-10 sm:w-12 sm:h-12 text-primary"
                aria-hidden="true"
              />
            </div>
            <h1
              id="notfound-title"
              ref={headingRef}
              className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight"
            >
              Halaman Tidak Tersedia
            </h1>
            <p
              id="notfound-desc"
              ref={descRef}
              className="text-gray-600 mb-8 leading-relaxed"
            >
              Maaf, halaman yang Anda cari tidak ditemukan. Pastikan URL sudah
              benar atau gunakan tombol di bawah untuk kembali ke aplikasi.
            </p>

            {/* Invalid path hint - UX improvement */}
            {location.pathname && location.pathname !== "/" && (
              <div
                className="flex items-center gap-2 text-sm text-gray-500 mb-6 py-3 px-4 bg-gray-50 rounded-lg"
                role="status"
                aria-live="polite"
              >
                <Search className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span>
                  Anda mengakses: <code className="font-mono text-gray-700 break-all">{location.pathname}</code>
                </span>
              </div>
            )}

            <div
              id="notfound-actions"
              ref={actionsRef}
              className="flex flex-col gap-3"
              role="navigation"
              aria-label="Navigasi pemulihan"
            >
              {user ? (
                <Link
                  to="/dashboard"
                  className="flex items-center justify-center gap-2.5 w-full bg-primary text-white py-3 px-5 rounded-xl font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                  aria-label="Kembali ke dashboard"
                >
                  <Home className="w-5 h-5" aria-hidden="true" />
                  Ke Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2.5 w-full bg-primary text-white py-3 px-5 rounded-xl font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                  aria-label="Ke halaman login"
                >
                  <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                  Ke Halaman Login
                </Link>
              )}
              <button
                type="button"
                onClick={() => window.history.back()}
                className="flex items-center justify-center gap-2.5 w-full border-2 border-gray-200 text-gray-700 py-3 px-5 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors"
                aria-label="Kembali ke halaman sebelumnya"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                Kembali
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
