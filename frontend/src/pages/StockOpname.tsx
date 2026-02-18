import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs';
import api from '../lib/api';
import {
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  ClipboardList,
  Calendar,
  User,
  Package,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

const statusConfig = {
  Disetujui: {
    label: 'Disetujui',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    icon: CheckCircle,
  },
  'Tidak Disetujui': {
    label: 'Tidak Disetujui',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    icon: XCircle,
  },
  Belum: {
    label: 'Belum',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    icon: AlertTriangle,
  },
};

export default function StockOpname() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opnames, setOpnames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<number | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const tableCardRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<HTMLTableRowElement[]>([]);

  useEffect(() => {
    fetchOpnames();
  }, []);

  // Entrance animations
  useEffect(() => {
    if (!pageRef.current || !headerRef.current || !tableCardRef.current) return;
    anime({
      targets: pageRef.current,
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 500,
      easing: 'easeOutCubic',
    });
    anime({
      targets: headerRef.current,
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 400,
      delay: 80,
      easing: 'easeOutCubic',
    });
    anime({
      targets: tableCardRef.current,
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 450,
      delay: 160,
      easing: 'easeOutCubic',
    });
  }, []);

  // Stagger table rows when data loads
  useEffect(() => {
    if (loading || opnames.length === 0) return;
    rowRefs.current = rowRefs.current.slice(0, opnames.length);
    const targets = rowRefs.current.filter(Boolean);
    if (targets.length === 0) return;
    anime({
      targets,
      opacity: [0, 1],
      translateX: [-8, 0],
      duration: 350,
      delay: anime.stagger(40, { start: 200 }),
      easing: 'easeOutCubic',
    });
  }, [loading, opnames.length]);

  const fetchOpnames = async () => {
    try {
      setLoading(true);
      const res = await api.get('/stock-opnames');
      setOpnames(res.data);
    } catch (error) {
      console.error('Error fetching opnames:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (id: number, status: 'Disetujui' | 'Tidak Disetujui') => {
    const action = status === 'Disetujui' ? 'menyetujui' : 'menolak';
    if (!window.confirm(`Yakin ingin ${action} stock opname ini?`)) return;
    try {
      setValidatingId(id);
      await api.patch(`/stock-opnames/${id}/validate`, { validation_status: status });
      await fetchOpnames();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal memvalidasi stock opname');
    } finally {
      setValidatingId(null);
    }
  };

  return (
    <main ref={pageRef} className="space-y-6" aria-label="Halaman Stock Opname">
      <header
        ref={headerRef}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" aria-hidden />
            </span>
            Stock Opname
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola dan validasi hasil stock opname barang
          </p>
        </div>
        <Button
          onClick={() => navigate('/stock-opname/new')}
          className="shrink-0"
          aria-label="Tambah stock opname baru"
        >
          <Plus className="w-4 h-4 mr-2" aria-hidden />
          Tambah Stock Opname
        </Button>
      </header>

      <section
        ref={tableCardRef}
        className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
      >
        <h2 id="stock-opname-table-title" className="sr-only">
          Daftar stock opname
        </h2>
        <div className="overflow-x-auto">
          <table
            className="w-full min-w-[720px]"
            role="table"
            aria-labelledby="stock-opname-table-title"
          >
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th
                  scope="col"
                  className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" aria-hidden />
                    Tanggal Opname
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4" aria-hidden />
                    Petugas
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <Package className="h-4 w-4" aria-hidden />
                    Sesuai
                  </span>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Tidak Sesuai
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Status Validasi
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center" role="status">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                      <span>Memuat data stock opname...</span>
                    </div>
                  </td>
                </tr>
              ) : opnames.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div
                      className="flex flex-col items-center gap-3 text-muted-foreground"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="rounded-full bg-muted p-4">
                        <ClipboardList className="h-10 w-10 text-muted-foreground/60" />
                      </div>
                      <p className="font-medium">Belum ada data stock opname</p>
                      <p className="text-sm">Klik &quot;Tambah Stock Opname&quot; untuk mulai</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/stock-opname/new')}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Stock Opname
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                opnames.map((opname, index) => {
                  const config = statusConfig[opname.validation_status as keyof typeof statusConfig] ?? statusConfig.Belum;
                  const StatusIcon = config.icon;
                  return (
                    <tr
                      key={opname.id}
                      ref={(el) => {
                        if (el) rowRefs.current[index] = el;
                      }}
                      className="transition-colors hover:bg-muted/40 focus-within:bg-muted/40"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-foreground">
                        {new Date(opname.opname_date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-foreground">
                        {opname.officer_name}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {opname.items_match ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm">
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {opname.items_mismatch ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}
                          role="status"
                        >
                          <StatusIcon className="h-3.5 w-3.5" aria-hidden />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/stock-opname/${opname.id}`)}
                            aria-label={`Lihat detail stock opname ${opname.opname_date}`}
                          >
                            <Eye className="w-4 h-4 mr-1.5" aria-hidden />
                            Detail
                          </Button>
                          {user?.role === 'Admin' && opname.validation_status === 'Belum' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleValidate(opname.id, 'Disetujui')}
                                disabled={validatingId === opname.id}
                                aria-label={`Setujui stock opname ${opname.opname_date}`}
                              >
                                {validatingId === opname.id ? (
                                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" aria-hidden />
                                ) : (
                                  <CheckCircle className="w-4 h-4 mr-1.5" aria-hidden />
                                )}
                                Setujui
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleValidate(opname.id, 'Tidak Disetujui')}
                                disabled={validatingId === opname.id}
                                aria-label={`Tolak stock opname ${opname.opname_date}`}
                              >
                                <XCircle className="w-4 h-4 mr-1.5" aria-hidden />
                                Tolak
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
