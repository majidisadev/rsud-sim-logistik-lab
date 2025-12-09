import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AllItems from './pages/AllItems';
import ItemDetail from './pages/ItemDetail';
import BarangMasuk from './pages/BarangMasuk';
import BarangKeluar from './pages/BarangKeluar';
import Laporan from './pages/Laporan';
import StockOpname from './pages/StockOpname';
import StockOpnameDetail from './pages/StockOpnameDetail';
import PengaturanAkun from './pages/PengaturanAkun';
import PengaturanSupplier from './pages/PengaturanSupplier';
import PengaturanKategori from './pages/PengaturanKategori';
import PengaturanBarang from './pages/PengaturanBarang';
import SupplierDetail from './pages/SupplierDetail';
import KategoriDetail from './pages/KategoriDetail';
import Layout from './components/Layout';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="barang" element={<AllItems />} />
        <Route path="barang/:id" element={<ItemDetail />} />
        <Route path="barang-masuk" element={<BarangMasuk />} />
        <Route path="barang-keluar" element={<BarangKeluar />} />
        <Route path="laporan" element={<Laporan />} />
        <Route path="stock-opname" element={<StockOpname />} />
        <Route path="stock-opname/:id" element={<StockOpnameDetail />} />
        <Route
          path="pengaturan/akun"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <PengaturanAkun />
            </ProtectedRoute>
          }
        />
        <Route
          path="pengaturan/supplier"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <PengaturanSupplier />
            </ProtectedRoute>
          }
        />
        <Route
          path="pengaturan/supplier/:id"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <SupplierDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="pengaturan/kategori"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <PengaturanKategori />
            </ProtectedRoute>
          }
        />
        <Route
          path="pengaturan/kategori/:id"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <KategoriDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="pengaturan/barang"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <PengaturanBarang />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

