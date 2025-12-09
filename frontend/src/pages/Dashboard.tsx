import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { AlertTriangle, Package, TrendingDown } from "lucide-react";
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    expired: 0,
    soonExpired: 0,
    outOfStock: 0,
    lowStock: 0,
  });
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [recentIn, setRecentIn] = useState<any[]>([]);
  const [recentOut, setRecentOut] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get item counts
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

      // Get transaction stats
      const [dailyRes, monthlyRes] = await Promise.all([
        api.get("/transactions/stats?period=daily"),
        api.get("/transactions/stats?period=monthly"),
      ]);

      // Format daily stats for pie chart
      const dailyDataArray = Array.isArray(dailyRes.data) ? dailyRes.data : [];
      const masukCount = dailyDataArray.find((d: any) => d.type === "Masuk")?.count || 0;
      const keluarCount = dailyDataArray.find((d: any) => d.type === "Keluar")?.count || 0;
      
      const dailyData = [
        {
          name: "Masuk",
          value: Number(masukCount) || 0,
        },
        {
          name: "Keluar",
          value: Number(keluarCount) || 0,
        },
      ];
      
      console.log('Daily Stats Data:', dailyData);
      setDailyStats(dailyData);

      // Format monthly stats
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];
      const monthlyData = months.map((month, idx) => {
        const monthStr = `${new Date().getFullYear()}-${String(
          idx + 1
        ).padStart(2, "0")}`;
        const monthData = monthlyRes.data.filter(
          (d: any) => d.month === monthStr
        );
        return {
          month,
          Masuk: monthData.find((d: any) => d.type === "Masuk")?.count || 0,
          Keluar: monthData.find((d: any) => d.type === "Keluar")?.count || 0,
        };
      });
      setMonthlyStats(monthlyData);

      // Get recent transactions
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

  const COLORS = ["#3b82f6", "#ef4444"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Selamat Datang di SIM Logistik Lab!
        </h2>
        <p className="text-gray-600">
          Sistem Informasi Manajemen Logistik Laboratorium ini menggantikan
          pencatatan barang di kertas dengan input yang lebih cepat, mampu
          memantau tingkat stock dan tanggal kadaluarsa secara real time, serta
          dilengkapi peringatan ketika barang perlu dipesan ulang.
        </p>
      </div>

      {/* Monitoring Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate("/barang?expired=true")}
          className="bg-red-50 border-2 border-red-200 rounded-lg p-6 cursor-pointer hover:bg-red-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">
                Barang Kadaluarsa
              </p>
              <p className="text-3xl font-bold text-red-700 mt-2">
                {stats.expired}
              </p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <div
          onClick={() => navigate("/barang?soon_expired=true")}
          className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 cursor-pointer hover:bg-yellow-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">
                Segera Kadaluarsa
              </p>
              <p className="text-3xl font-bold text-yellow-700 mt-2">
                {stats.soonExpired}
              </p>
            </div>
            <AlertTriangle className="w-12 h-12 text-yellow-500" />
          </div>
        </div>

        <div
          onClick={() => navigate("/barang?out_of_stock=true")}
          className="bg-red-50 border-2 border-red-200 rounded-lg p-6 cursor-pointer hover:bg-red-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Stock Habis</p>
              <p className="text-3xl font-bold text-red-700 mt-2">
                {stats.outOfStock}
              </p>
            </div>
            <Package className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <div
          onClick={() => navigate("/barang?low_stock=true")}
          className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 cursor-pointer hover:bg-yellow-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">
                Stock Segera Habis
              </p>
              <p className="text-3xl font-bold text-yellow-700 mt-2">
                {stats.lowStock}
              </p>
            </div>
            <TrendingDown className="w-12 h-12 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Transaksi Harian (Masuk/Keluar)
          </h3>
          <div style={{ width: '100%', height: '300px', minHeight: '300px', position: 'relative' }}>
            {dailyStats.length > 0 && dailyStats.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dailyStats.filter(d => d.value > 0)}
                    cx="50%"
                    cy="45%"
                    labelLine={true}
                    label={({ name, percent, value }) => 
                      `${name}: ${value}\n(${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={3}
                    isAnimationActive={true}
                  >
                    {dailyStats.filter(d => d.value > 0).map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Jumlah Transaksi']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Tidak ada transaksi hari ini</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Transaksi Bulanan (Jan-Des)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Masuk" fill="#3b82f6" />
              <Bar dataKey="Keluar" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Transaksi Masuk Terakhir
          </h3>
          <div className="space-y-3">
            {recentIn.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Tidak ada transaksi
              </p>
            ) : (
              recentIn.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{tx.item_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString("id-ID")} -{" "}
                      {tx.user_name}
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-blue-600">
                    +{tx.quantity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Transaksi Keluar Terakhir
          </h3>
          <div className="space-y-3">
            {recentOut.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Tidak ada transaksi
              </p>
            ) : (
              recentOut.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{tx.item_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString("id-ID")} -{" "}
                      {tx.user_name}
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-red-600">
                    -{tx.quantity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
