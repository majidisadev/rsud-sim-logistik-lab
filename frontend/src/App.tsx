import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AllItems = lazy(() => import('./pages/AllItems'));
const ItemDetail = lazy(() => import('./pages/ItemDetail'));
const BarangMasuk = lazy(() => import('./pages/BarangMasuk'));
const BarangKeluar = lazy(() => import('./pages/BarangKeluar'));
const Laporan = lazy(() => import('./pages/Laporan'));
const StockOpname = lazy(() => import('./pages/StockOpname'));
const PengaturanAkun = lazy(() => import('./pages/PengaturanAkun'));
const PengaturanSupplier = lazy(() => import('./pages/PengaturanSupplier'));
const PengaturanKategori = lazy(() => import('./pages/PengaturanKategori'));
const PengaturanBarang = lazy(() => import('./pages/PengaturanBarang'));
const SupplierDetail = lazy(() => import('./pages/SupplierDetail'));
const KategoriDetail = lazy(() => import('./pages/KategoriDetail'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageFallback() {
  return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
}

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
    <Suspense fallback={<PageFallback />}>
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

