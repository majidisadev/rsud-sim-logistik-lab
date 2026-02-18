import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Package, Eye, EyeOff, Loader2 } from "lucide-react";
import anime from "animejs";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const mainRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const leftLogoRef = useRef<HTMLDivElement>(null);
  const mobileLogoRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Entrance animations with Anime.js
  useEffect(() => {
    const tl = anime.timeline({
      easing: "easeOutExpo",
      duration: 800,
    });

    tl.add({
      targets: [leftLogoRef.current, mobileLogoRef.current].filter(Boolean),
      translateY: [-30, 0],
      opacity: [0, 1],
      duration: 600,
    })
      .add(
        {
          targets: cardRef.current,
          translateY: [40, 0],
          opacity: [0, 1],
          duration: 700,
        },
        "-=400"
      )
      .add(
        {
          targets: formRef.current?.querySelectorAll(".form-group"),
          translateX: [-20, 0],
          opacity: [0, 1],
          delay: anime.stagger(100),
          duration: 500,
        },
        "-=300"
      )
      .add(
        {
          targets: formRef.current?.querySelector('button[type="submit"]'),
          translateY: [15, 0],
          opacity: [0, 1],
          duration: 500,
        },
        "-=200"
      );
  }, []);

  // Error shake animation
  useEffect(() => {
    if (error && errorRef.current) {
      anime({
        targets: errorRef.current,
        translateX: [
          { value: -10, duration: 80 },
          { value: 10, duration: 80 },
          { value: -8, duration: 80 },
          { value: 8, duration: 80 },
          { value: 0, duration: 80 },
        ],
        easing: "easeInOutQuad",
      });
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
      if (cardRef.current) {
        anime({
          targets: cardRef.current,
          scale: [1, 1.02, 1],
          opacity: [1, 0.95, 1],
          duration: 250,
          complete: () => navigate("/dashboard"),
        });
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Login gagal. Periksa username dan password.");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div
      className="min-h-screen flex relative overflow-hidden"
      role="application"
      aria-label="Halaman login sistem logistik laboratorium"
    >
      {/* Skip to main content - Accessibility */}
      <a
        href="#login-form"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-primary focus:rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
      >
        Langsung ke formulir login
      </a>

      {/* Decorative gradient background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/10 via-slate-50 to-primary/5"
        aria-hidden="true"
      />
      <div
        className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"
        aria-hidden="true"
      />

      {/* Left side - Logo and Title (Branding) */}
      <div
        className="hidden md:flex md:w-1/2 relative z-10 bg-gradient-to-br from-primary to-primary/80 text-white flex-col items-center justify-center p-12"
        aria-hidden="true"
      >
        <div ref={leftLogoRef} className="max-w-md text-center">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-xl ring-1 ring-white/30">
            <Package className="w-14 h-14 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight">SIM Logistik Lab</h1>
          <p className="text-lg text-white/95 leading-relaxed max-w-sm mx-auto">
            Sistem Informasi Manajemen Logistik Laboratorium Rumah Sakit
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <main
        ref={mainRef}
        className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-8 relative z-10"
        role="main"
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div ref={mobileLogoRef} className="md:hidden text-center mb-8">
            <div
              className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25 ring-1 ring-primary/20"
              aria-hidden="true"
            >
              <Package className="w-11 h-11 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SIM Logistik Lab</h1>
          </div>

          <div
            ref={cardRef}
            id="login-form"
            className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl shadow-gray-200/50 ring-1 ring-gray-100 p-8 sm:p-10"
            role="region"
            aria-labelledby="login-title"
          >
            <h2
              id="login-title"
              className="text-2xl font-bold text-gray-900 mb-2"
            >
              Masuk ke Akun
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              Masukkan kredensial Anda untuk mengakses sistem
            </p>

            {error && (
              <div
                ref={errorRef}
                role="alert"
                aria-live="assertive"
                className="mb-5 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-start gap-3"
              >
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-200 flex items-center justify-center text-red-600 text-xs font-bold">
                  !
                </span>
                <span>{error}</span>
              </div>
            )}

            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="space-y-5"
              noValidate
              aria-describedby={error ? "login-error" : undefined}
            >
              <div className="form-group">
                <label
                  htmlFor="username"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                  aria-required="true"
                  aria-invalid={!!error}
                  aria-describedby="username-hint"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all duration-200 placeholder:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed hover:border-gray-300"
                  placeholder="Masukkan username"
                />
                <span id="username-hint" className="sr-only">
                  Masukkan username Anda
                </span>
              </div>

              <div className="form-group">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Password
                </label>
                <div
                  className={`relative rounded-xl border-2 transition-all duration-200 ${
                    passwordFocused
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    aria-required="true"
                    aria-invalid={!!error}
                    aria-describedby="password-hint password-toggle-desc"
                    className="w-full px-4 py-3 pr-12 rounded-xl focus:ring-0 focus:border-0 outline-none bg-transparent placeholder:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="Masukkan password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    aria-pressed={showPassword}
                    aria-describedby="password-toggle-desc"
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Eye className="w-5 h-5" aria-hidden="true" />
                    )}
                  </button>
                  <span id="password-toggle-desc" className="sr-only">
                    Tombol untuk menampilkan atau menyembunyikan password
                  </span>
                </div>
                <span id="password-hint" className="sr-only">
                  Masukkan password Anda
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                aria-live="polite"
                className="w-full bg-primary text-white py-3 px-4 rounded-xl font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/30 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  "Masuk"
                )}
              </button>
            </form>

            <div
              className="mt-6 p-4 bg-blue-50/80 rounded-xl border border-blue-100"
              role="note"
              aria-label="Informasi bantuan login"
            >
              <p className="text-sm text-blue-800">
                <strong>Bantuan:</strong> Hubungi Admin jika lupa username atau password
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
