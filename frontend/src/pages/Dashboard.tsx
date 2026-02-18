import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import anime from "animejs";
import api from "../lib/api";
import {
  AlertTriangle,
  TrendingDown,
  ArrowRight,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#3b82f6", "#ef4444"];

function AnimatedNumber({
  value,
  duration = 800,
  reduceMotion = false,
  className = "",
}: {
  value: number;
  duration?: number;
  reduceMotion?: boolean;
  className?: string;
}) {
  const elRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduceMotion || !elRef.current) return;
    const obj = { v: 0 };
    anime({
      targets: obj,
      v: value,
      duration,
      easing: "easeOutCubic",
      update: () => {
        if (elRef.current) elRef.current.textContent = String(Math.round(obj.v));
      },
    });
  }, [value, duration, reduceMotion]);

  if (reduceMotion) return <span className={className}>{value}</span>;
  return (
    <span ref={elRef} className={className} aria-hidden="true">
      0
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat dashboard">
      <div className="h-32 rounded-xl bg-gray-200/60 animate-pulse" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-gray-200/60 animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-xl bg-gray-200/60 animate-pulse" />
        <div className="h-80 rounded-xl bg-gray-200/60 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-xl bg-gray-200/60 animate-pulse" />
        <div className="h-72 rounded-xl bg-gray-200/60 animate-pulse" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    expired: 0,
    soonExpired: 0,
    outOfStock: 0,
    lowStock: 0,
  });
  const [dailyStats, setDailyStats] = useState<{ name: string; value: number }[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [recentIn, setRecentIn] = useState<any[]>([]);
  const [recentOut, setRecentOut] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  const welcomeRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const chartPieRef = useRef<HTMLDivElement>(null);
  const chartBarRef = useRef<HTMLDivElement>(null);
  const recentInRef = useRef<HTMLDivElement>(null);
  const recentOutRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const recentRowRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [expiredRes, soonExpiredRes, outOfStockRes, lowStockRes] =
        await Promise.all([
          api.get("/items?expired=true"),
          api.get("/items?soon_expired=true"),
          api.get("/items?out_of_stock=true"),
          api.get("/items?low_stock=true"),
        ]);

      setStats({
        expired: expiredRes.data.length,
        soonExpired: soonExpiredRes.data.length,
        outOfStock: outOfStockRes.data.length,
        lowStock: lowStockRes.data.length,
      });

      const [dailyRes, monthlyRes] = await Promise.all([
        api.get("/transactions/stats?period=daily"),
        api.get("/transactions/stats?period=monthly"),
      ]);

      const dailyDataArray = Array.isArray(dailyRes.data) ? dailyRes.data : [];
      const masukCount =
        dailyDataArray.find((d: any) => d.type === "Masuk")?.count || 0;
      const keluarCount =
        dailyDataArray.find((d: any) => d.type === "Keluar")?.count || 0;

      setDailyStats([
        { name: "Masuk", value: Number(masukCount) || 0 },
        { name: "Keluar", value: Number(keluarCount) || 0 },
      ]);

      const months = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
        "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
      ];
      const monthlyData = months.map((month, idx) => {
        const monthStr = `${new Date().getFullYear()}-${String(idx + 1).padStart(2, "0")}`;
        const monthData = monthlyRes.data.filter((d: any) => d.month === monthStr);
        return {
          month,
          Masuk: monthData.find((d: any) => d.type === "Masuk")?.count || 0,
          Keluar: monthData.find((d: any) => d.type === "Keluar")?.count || 0,
        };
      });
      setMonthlyStats(monthlyData);

      const [inRes, outRes] = await Promise.all([
        api.get("/transactions?type=Masuk&limit=5"),
        api.get("/transactions?type=Keluar&limit=5"),
      ]);
      setRecentIn(inRes.data.slice(0, 5));
      setRecentOut(outRes.data.slice(0, 5));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Entrance animations
  useEffect(() => {
    if (loading || reduceMotion) return;

    const duration = 480;
    const stagger = 80;

    if (welcomeRef.current) {
      anime({
        targets: welcomeRef.current,
        opacity: [0, 1],
        translateY: [20, 0],
        duration,
        easing: "easeOutCubic",
      });
    }

    if (cardsRef.current) {
      const cardEls = cardRefs.current.filter(Boolean);
      if (cardEls.length) {
        anime({
          targets: cardEls,
          opacity: [0, 1],
          translateY: [24, 0],
          duration: 420,
          delay: anime.stagger(60, { start: 120 }),
          easing: "easeOutCubic",
        });
      }
    }

    if (chartPieRef.current) {
      anime({
        targets: chartPieRef.current,
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 440,
        delay: 380,
        easing: "easeOutCubic",
      });
    }
    if (chartBarRef.current) {
      anime({
        targets: chartBarRef.current,
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 440,
        delay: 380 + stagger,
        easing: "easeOutCubic",
      });
    }
    if (recentInRef.current) {
      anime({
        targets: recentInRef.current,
        opacity: [0, 1],
        translateY: [12, 0],
        duration: 400,
        delay: 520,
        easing: "easeOutCubic",
      });
    }
    if (recentOutRef.current) {
      anime({
        targets: recentOutRef.current,
        opacity: [0, 1],
        translateY: [12, 0],
        duration: 400,
        delay: 520 + stagger,
        easing: "easeOutCubic",
      });
    }
  }, [loading, reduceMotion]);

  // Stagger recent transaction rows
  useEffect(() => {
    if (loading || reduceMotion) return;
    const inRows = recentRowRefs.current.filter(Boolean).slice(0, recentIn.length + recentOut.length);
    if (inRows.length === 0) return;
    anime({
      targets: inRows,
      opacity: [0, 1],
      translateX: [-12, 0],
      duration: 320,
      delay: anime.stagger(40, { start: 680 }),
      easing: "easeOutCubic",
    });
  }, [loading, reduceMotion, recentIn.length, recentOut.length]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const monitoringCards = [
    {
      label: "Barang Kadaluarsa",
      value: stats.expired,
      href: "/barang?expired=true",
      icon: AlertTriangle,
      className:
        "border-red-200/80 bg-gradient-to-br from-red-50 to-red-50/80 text-red-700 hover:from-red-100 hover:to-red-50 focus-visible:ring-red-400",
      iconClassName: "text-red-500",
    },
    {
      label: "Segera Kadaluarsa",
      value: stats.soonExpired,
      href: "/barang?soon_expired=true",
      icon: AlertTriangle,
      className:
        "border-amber-200/80 bg-gradient-to-br from-amber-50 to-amber-50/80 text-amber-800 hover:from-amber-100 hover:to-amber-50 focus-visible:ring-amber-400",
      iconClassName: "text-amber-500",
    },
    {
      label: "Stock Habis",
      value: stats.outOfStock,
      href: "/barang?out_of_stock=true",
      icon: TrendingDown,
      className:
        "border-rose-200/80 bg-gradient-to-br from-rose-50 to-rose-50/80 text-rose-700 hover:from-rose-100 hover:to-rose-50 focus-visible:ring-rose-400",
      iconClassName: "text-rose-500",
    },
    {
      label: "Stock Segera Habis",
      value: stats.lowStock,
      href: "/barang?low_stock=true",
      icon: TrendingDown,
      className:
        "border-yellow-200/80 bg-gradient-to-br from-yellow-50 to-yellow-50/80 text-yellow-800 hover:from-yellow-100 hover:to-yellow-50 focus-visible:ring-yellow-400",
      iconClassName: "text-yellow-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <section
        ref={welcomeRef}
        className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br from-primary/5 via-white to-primary/10 p-6 shadow-sm md:p-8"
        aria-labelledby="dashboard-welcome-heading"
      >
        <div className="relative z-10">
          <h1
            id="dashboard-welcome-heading"
            className="mb-2 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl"
          >
            Selamat Datang di SIM Logistik Lab
          </h1>
          <p className="max-w-2xl text-gray-600 leading-relaxed">
            Sistem Informasi Manajemen Logistik Laboratorium menggantikan
            pencatatan barang di kertas dengan input cepat, memantau stok dan
            tanggal kadaluarsa secara real time, serta peringatan ketika barang
            perlu dipesan ulang.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Package className="h-4 w-4" aria-hidden /> Manajemen stok
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <ArrowDownCircle className="h-4 w-4" aria-hidden /> Barang masuk
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <ArrowUpCircle className="h-4 w-4" aria-hidden /> Barang keluar
            </span>
          </div>
        </div>
      </section>

      {/* Monitoring Cards */}
      <section
        ref={cardsRef}
        aria-labelledby="monitoring-heading"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <h2 id="monitoring-heading" className="sr-only">
          Kartu monitoring stok dan kadaluarsa
        </h2>
        {monitoringCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              role="button"
              tabIndex={0}
              onClick={() => navigate(card.href)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(card.href);
                }
              }}
              className={`group flex cursor-pointer flex-col rounded-xl border-2 p-5 shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${card.className}`}
              aria-label={`${card.label}: ${card.value} item. Klik untuk lihat daftar.`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold opacity-90">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums">
                    <AnimatedNumber
                      value={card.value}
                      reduceMotion={reduceMotion}
                    />
                  </p>
                </div>
                <span
                  className="rounded-lg bg-white/60 p-2 transition-transform duration-200 group-hover:scale-110 group-focus-visible:scale-105"
                  aria-hidden
                >
                  <Icon className={`h-8 w-8 md:h-10 md:w-10 ${card.iconClassName}`} />
                </span>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium opacity-80">
                Lihat detail
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          );
        })}
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article
          ref={chartPieRef}
          className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm"
          aria-labelledby="chart-daily-heading"
        >
          <h3
            id="chart-daily-heading"
            className="mb-4 text-lg font-semibold text-gray-900"
          >
            Transaksi Harian (Masuk / Keluar)
          </h3>
          <div
            className="relative"
            style={{
              width: "100%",
              height: "300px",
              minHeight: "300px",
            }}
          >
            {dailyStats.length > 0 && dailyStats.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dailyStats.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="45%"
                    labelLine={true}
                    label={({ name, percent, value }) =>
                      `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={3}
                    isAnimationActive={!reduceMotion}
                  >
                    {dailyStats
                      .filter((d) => d.value > 0)
                      .map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value, "Jumlah Transaksi"]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div
                className="flex h-full flex-col items-center justify-center rounded-xl bg-gray-50/80 text-gray-500"
                role="status"
              >
                <p>Tidak ada transaksi hari ini</p>
                <p className="mt-1 text-sm">Data akan muncul setelah ada transaksi.</p>
              </div>
            )}
          </div>
        </article>

        <article
          ref={chartBarRef}
          className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm"
          aria-labelledby="chart-monthly-heading"
        >
          <h3
            id="chart-monthly-heading"
            className="mb-4 text-lg font-semibold text-gray-900"
          >
            Transaksi Bulanan (Jan–Des)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyStats} aria-label="Grafik transaksi per bulan">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Masuk" fill="#3b82f6" name="Masuk" />
              <Bar dataKey="Keluar" fill="#ef4444" name="Keluar" />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article
          ref={recentInRef}
          className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm"
          aria-labelledby="recent-in-heading"
        >
          <h3
            id="recent-in-heading"
            className="mb-4 text-lg font-semibold text-gray-900"
          >
            Transaksi Masuk Terakhir
          </h3>
          <div className="space-y-3">
            {recentIn.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-xl bg-gray-50/80 py-10 text-center text-gray-500"
                role="status"
              >
                <ArrowDownCircle className="mb-2 h-10 w-10 opacity-40" aria-hidden />
                <p>Tidak ada transaksi masuk</p>
                <p className="mt-1 text-sm">Riwayat akan muncul di sini.</p>
              </div>
            ) : (
              recentIn.map((tx, i) => (
                <div
                  key={tx.id}
                  ref={(el) => {
                    recentRowRefs.current[i] = el;
                  }}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 p-3 transition-colors hover:bg-gray-100/80"
                >
                  <div>
                    <p className="font-medium text-gray-900">{tx.item_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString("id-ID")} – {tx.user_name}
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-blue-600" aria-label={`${tx.quantity} masuk`}>
                    +{tx.quantity}
                  </span>
                </div>
              ))
            )}
          </div>
        </article>

        <article
          ref={recentOutRef}
          className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm"
          aria-labelledby="recent-out-heading"
        >
          <h3
            id="recent-out-heading"
            className="mb-4 text-lg font-semibold text-gray-900"
          >
            Transaksi Keluar Terakhir
          </h3>
          <div className="space-y-3">
            {recentOut.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-xl bg-gray-50/80 py-10 text-center text-gray-500"
                role="status"
              >
                <ArrowUpCircle className="mb-2 h-10 w-10 opacity-40" aria-hidden />
                <p>Tidak ada transaksi keluar</p>
                <p className="mt-1 text-sm">Riwayat akan muncul di sini.</p>
              </div>
            ) : (
              recentOut.map((tx, i) => (
                <div
                  key={tx.id}
                  ref={(el) => {
                    recentRowRefs.current[recentIn.length + i] = el;
                  }}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/80 p-3 transition-colors hover:bg-gray-100/80"
                >
                  <div>
                    <p className="font-medium text-gray-900">{tx.item_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString("id-ID")} – {tx.user_name}
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-red-600" aria-label={`${tx.quantity} keluar`}>
                    -{tx.quantity}
                  </span>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
