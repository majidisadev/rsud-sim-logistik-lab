import { useEffect, useMemo, useState, useRef } from 'react';
import anime from 'animejs';
import api from '../lib/api';
import {
  Plus,
  ClipboardList,
  Calendar,
  User,
  Package,
  Loader2,
} from 'lucide-react';
import { usePrefersReducedMotion } from '../lib/hooks/usePrefersReducedMotion';
import Dialog from '../components/ui/Dialog';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/toast';
import { getErrorMessage } from '../lib/getErrorMessage';

type OfficerOption = { officer_id: number; officer_name: string };
type ItemOption = { id: number; name: string; last_opname_date?: string | null };

type PaginationState = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

type LotRow = {
  id: number;
  lot_number: string;
  recorded_lot_stock: number;
  opname_lot_stock: number;
  recorded_expiration: string | null;
  opname_expiration: string | null;
};

function normalizeDate(value: string | null | undefined) {
  if (!value) return null;
  // handles ISO string; we only compare yyyy-mm-dd
  return String(value).slice(0, 10);
}

function formatDateId(value: string | null | undefined) {
  if (!value) return '-';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return String(value);
  return d.toLocaleDateString('id-ID');
}

function formatDdMmYyyyFromDateOnly(value: string | null | undefined) {
  if (!value) return '-';
  const v = String(value).slice(0, 10); // supports ISO or YYYY-MM-DD
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return formatDateId(value);
  const [, yyyy, mm, dd] = m;
  return `${dd}/${mm}/${yyyy}`;
}

export default function StockOpname() {
  const reduceMotion = usePrefersReducedMotion();
  const { toast } = useToast();

  const [opnameItems, setOpnameItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });

  const [filters, setFilters] = useState<{
    item_id: string;
    officer_id: string;
    date_start: string;
    date_end: string;
  }>({
    item_id: '',
    officer_id: '',
    date_start: '',
    date_end: '',
  });

  const [itemsOptions, setItemsOptions] = useState<ItemOption[]>([]);
  const [officerOptions, setOfficerOptions] = useState<OfficerOption[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createItemId, setCreateItemId] = useState('');
  const [createItemTemperature, setCreateItemTemperature] = useState<string>(''); // suhu barang (standar)
  const [createOpnameTemperature, setCreateOpnameTemperature] = useState<string>(''); // suhu saat opname
  const [createTemperatureMatch, setCreateTemperatureMatch] = useState<'Sesuai' | 'Tidak sesuai'>('Sesuai');
  const [createLots, setCreateLots] = useState<
    Array<{
      lot_id: number;
      lot_number: string;
      recorded_lot_stock: number;
      recorded_expiration: string | null;
      selected: boolean;
      opname_lot_stock: string;
      opname_expiration: string; // yyyy-mm-dd or ''
    }>
  >([]);

  const pageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const tableCardRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<HTMLElement[]>([]);

  useEffect(() => {
    fetchOpnameItems();
  }, [pagination.page, pagination.limit, filters.item_id, filters.officer_id, filters.date_start, filters.date_end]);

  useEffect(() => {
    // load filter dropdown options (barang + petugas)
    api
      .get('/items?status=Active')
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setItemsOptions(
          rows
            .map((r: any) => ({
              id: Number(r.id),
              name: String(r.name ?? ''),
              last_opname_date: r.last_opname_date ? String(r.last_opname_date) : null,
            }))
            .filter((x: ItemOption) => Number.isFinite(x.id) && x.name)
        );
      })
      .catch(() => {
        // ignore; filter dropdown still usable as empty
      });
  }, []);

  useEffect(() => {
    const params: any = {};
    if (filters.date_start) params.date_start = filters.date_start;
    if (filters.date_end) params.date_end = filters.date_end;
    api
      .get('/stock-opnames/officers', { params })
      .then((res) => setOfficerOptions(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOfficerOptions([]));
  }, [filters.date_start, filters.date_end]);

  // Entrance animations
  useEffect(() => {
    if (reduceMotion) return;
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
  }, [reduceMotion]);

  // Stagger table rows when data loads
  useEffect(() => {
    if (reduceMotion) return;
    if (loading || opnameItems.length === 0) return;
    rowRefs.current = rowRefs.current.slice(0, opnameItems.length);
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
  }, [loading, opnameItems.length, reduceMotion]);

  const listParams = useMemo(() => {
    const params: any = {
      page: pagination.page,
      limit: pagination.limit,
    };
    if (filters.item_id) params.item_id = filters.item_id;
    if (filters.officer_id) params.officer_id = filters.officer_id;
    if (filters.date_start) params.date_start = filters.date_start;
    if (filters.date_end) params.date_end = filters.date_end;
    return params;
  }, [filters.date_end, filters.date_start, filters.item_id, filters.officer_id, pagination.limit, pagination.page]);

  const fetchOpnameItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/stock-opnames/items', { params: listParams });
      const data = res.data?.data;
      const pag = res.data?.pagination;
      setOpnameItems(Array.isArray(data) ? data : []);
      if (pag && typeof pag === 'object') {
        setPagination((prev) => ({
          ...prev,
          page: Number(pag.page ?? prev.page) || prev.page,
          limit: Number(pag.limit ?? prev.limit) || prev.limit,
          total: Number(pag.total ?? 0) || 0,
          total_pages: Number(pag.total_pages ?? 1) || 1,
        }));
      }
    } catch (error) {
      console.error('Error fetching opname items:', error);
      toast({
        variant: 'error',
        title: 'Gagal memuat data',
        description: getErrorMessage(error, 'Gagal memuat data stock opname'),
      });
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({ item_id: '', officer_id: '', date_start: '', date_end: '' });
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const openCreate = () => {
    setCreateOpen(true);
    setCreateItemId('');
    setCreateItemTemperature('');
    setCreateOpnameTemperature('');
    setCreateTemperatureMatch('Sesuai');
    setCreateLots([]);
  };

  const loadLotsForCreateItem = async (itemId: string) => {
    setCreateItemId(itemId);
    setCreateItemTemperature('');
    setCreateOpnameTemperature('');
    setCreateTemperatureMatch('Sesuai');
    setCreateLots([]);
    const idNum = Number(itemId);
    if (!Number.isFinite(idNum)) return;
    try {
      const res = await api.get(`/items/${idNum}`);
      setCreateItemTemperature(res.data?.temperature ? String(res.data.temperature) : '');
      const lots = Array.isArray(res.data?.lots) ? res.data.lots : [];
      setCreateLots(
        lots.map((l: any) => {
          const recordedExpiration = l.expiration_date ? String(l.expiration_date) : null;
          const recordedStock = Number(l.stock ?? 0);
          return {
            lot_id: Number(l.id),
            lot_number: String(l.lot_number ?? ''),
            recorded_lot_stock: Number.isFinite(recordedStock) ? recordedStock : 0,
            recorded_expiration: recordedExpiration,
            selected: false,
            opname_lot_stock: String(Number.isFinite(recordedStock) ? recordedStock : 0),
            opname_expiration: recordedExpiration ? normalizeDate(recordedExpiration) ?? '' : '',
          };
        })
      );
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Gagal memuat lot',
        description: getErrorMessage(error, 'Gagal memuat lot barang'),
      });
    }
  };

  const canSubmitCreate = useMemo(() => {
    if (!createItemId) return false;
    const selected = createLots.filter((l) => l.selected);
    if (selected.length === 0) return false;
    for (const l of selected) {
      if (l.opname_lot_stock === '' || !Number.isFinite(Number(l.opname_lot_stock))) return false;
      if (Number(l.opname_lot_stock) < 0) return false;
    }
    return true;
  }, [createItemId, createLots]);

  const submitCreate = async () => {
    try {
      setCreating(true);
      const selectedLots = createLots.filter((l) => l.selected);
      const payload = {
        opname_date: new Date().toISOString().slice(0, 10),
        items: [
          {
            item_id: Number(createItemId),
            recorded_temperature: createItemTemperature || null,
            opname_temperature:
              createTemperatureMatch === 'Tidak sesuai' ? createOpnameTemperature || null : null,
            temperature_match: createTemperatureMatch,
            lots: selectedLots.map((l) => ({
              lot_id: l.lot_id,
              opname_lot_stock: Number(l.opname_lot_stock || 0),
              opname_expiration: l.opname_expiration ? l.opname_expiration : null,
            })),
          },
        ],
      };

      await api.post('/stock-opnames', payload);
      setCreateOpen(false);
      toast({ variant: 'success', title: 'Stock opname berhasil dibuat' });
      setPagination((p) => ({ ...p, page: 1 }));
      await fetchOpnameItems();
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Gagal membuat stock opname',
        description: getErrorMessage(error, 'Gagal membuat stock opname'),
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <main ref={pageRef} className="space-y-6" aria-label="Halaman Stock Opname">
      <Dialog
        open={createOpen}
        onClose={() => (creating ? null : setCreateOpen(false))}
        title="Tambah Stock Opname"
        description="Buat stock opname baru langsung dari halaman ini."
        size="lg"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Barang</label>
              <select
                value={createItemId}
                onChange={(e) => void loadLotsForCreateItem(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Pilih barang untuk stock opname"
                disabled={creating}
                data-autofocus
              >
                <option value="">Pilih barang...</option>
                {itemsOptions.map((it) => (
                  <option key={it.id} value={String(it.id)}>
                    {it.name} — Terakhir: {formatDdMmYyyyFromDateOnly(it.last_opname_date)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                Batal
              </Button>
              <Button onClick={submitCreate} disabled={creating || !canSubmitCreate}>
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden /> : null}
                Simpan
              </Button>
            </div>
          </div>

          {createItemId ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Suhu barang</p>
                <p className="mt-2 text-sm text-foreground">
                  <span className="font-medium">{createItemTemperature || '-'}</span>
                </p>
              </div>
              <div className="md:col-span-2 rounded-xl border border-border bg-card p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">Kesesuaian suhu</label>
                    <select
                      value={createTemperatureMatch}
                      onChange={(e) => {
                        const next =
                          e.target.value === 'Tidak sesuai' ? 'Tidak sesuai' : 'Sesuai';
                        setCreateTemperatureMatch(next);
                        if (next === 'Sesuai') setCreateOpnameTemperature('');
                      }}
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={creating}
                      aria-label="Kesesuaian suhu opname"
                    >
                      <option value="Sesuai">Sesuai</option>
                      <option value="Tidak sesuai">Tidak sesuai</option>
                    </select>
                  </div>
                  {createTemperatureMatch === 'Tidak sesuai' ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">Suhu opname</label>
                      <Input
                        value={createOpnameTemperature}
                        onChange={(e) => setCreateOpnameTemperature(e.target.value)}
                        placeholder="Contoh: 2-8°C"
                        disabled={creating}
                        aria-label="Suhu opname"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {!createItemId ? (
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              Pilih barang untuk menampilkan daftar lot.
            </div>
          ) : createLots.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              Tidak ada lot untuk barang ini.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="grid grid-cols-12 gap-2 border-b border-border bg-muted/30 px-4 py-3 text-xs font-semibold text-muted-foreground">
                  <div className="col-span-1">Pilih</div>
                  <div className="col-span-3">Lot</div>
                  <div className="col-span-2">Stock tercatat</div>
                  <div className="col-span-3">Kadaluarsa tercatat</div>
                  <div className="col-span-3">Stock/Kadaluarsa opname</div>
                </div>
                <div className="divide-y divide-border">
                  {createLots.map((l) => (
                    <div key={l.lot_id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                      <div className="col-span-1">
                        <input
                          type="checkbox"
                          checked={l.selected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setCreateLots((prev) =>
                              prev.map((x) => (x.lot_id === l.lot_id ? { ...x, selected: checked } : x))
                            );
                          }}
                          className="h-4 w-4"
                          aria-label={`Pilih lot ${l.lot_number}`}
                          disabled={creating}
                        />
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm font-medium text-foreground">{l.lot_number}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-foreground">{l.recorded_lot_stock}</p>
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm text-foreground">{formatDateId(l.recorded_expiration)}</p>
                      </div>
                      <div className="col-span-3 grid grid-cols-1 gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={l.opname_lot_stock}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCreateLots((prev) =>
                              prev.map((x) => (x.lot_id === l.lot_id ? { ...x, opname_lot_stock: v } : x))
                            );
                          }}
                          disabled={creating || !l.selected}
                          aria-label={`Stock opname untuk lot ${l.lot_number}`}
                        />
                        <Input
                          type="date"
                          value={l.opname_expiration}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCreateLots((prev) =>
                              prev.map((x) => (x.lot_id === l.lot_id ? { ...x, opname_expiration: v } : x))
                            );
                          }}
                          disabled={creating || !l.selected}
                          aria-label={`Kadaluarsa opname untuk lot ${l.lot_number}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Catatan: tanggal opname otomatis memakai hari ini.
              </p>
            </div>
          )}
        </div>
      </Dialog>

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
        <Button onClick={openCreate} aria-label="Tambah stock opname baru">
          <Plus className="w-4 h-4 mr-2" aria-hidden />
          Tambah Stock Opname
        </Button>
      </header>

      <section
        ref={tableCardRef}
        className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
      >
        <div className="p-5">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-4">
              <label className="mb-2 block text-sm font-medium text-foreground">Filter barang</label>
              <select
                value={filters.item_id}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, item_id: e.target.value }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Filter berdasarkan barang"
              >
                <option value="">Semua barang</option>
                {itemsOptions.map((it) => (
                  <option key={it.id} value={String(it.id)}>
                    {it.name} — Terakhir: {formatDdMmYyyyFromDateOnly(it.last_opname_date)}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="mb-2 block text-sm font-medium text-foreground">Filter petugas</label>
              <select
                value={filters.officer_id}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, officer_id: e.target.value }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Filter berdasarkan petugas opname"
              >
                <option value="">Semua petugas</option>
                {officerOptions.map((o) => (
                  <option key={o.officer_id} value={String(o.officer_id)}>
                    {o.officer_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-foreground">Tanggal mulai</label>
              <Input
                type="date"
                value={filters.date_start}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, date_start: e.target.value }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                aria-label="Filter tanggal mulai"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-foreground">Tanggal akhir</label>
              <Input
                type="date"
                value={filters.date_end}
                onChange={(e) => {
                  setFilters((p) => ({ ...p, date_end: e.target.value }));
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                aria-label="Filter tanggal akhir"
              />
            </div>
            <div className="md:col-span-1 flex md:justify-end">
              <Button variant="outline" onClick={resetFilters} aria-label="Reset filter">
                Reset
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center" role="status">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                <span>Memuat data stock opname...</span>
              </div>
            </div>
          ) : opnameItems.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground" role="status" aria-live="polite">
                <div className="rounded-full bg-muted p-4">
                  <ClipboardList className="h-10 w-10 text-muted-foreground/60" />
                </div>
                <p className="font-medium">Belum ada data item opname</p>
                <p className="text-sm">Klik &quot;Tambah Stock Opname&quot; untuk mulai</p>
                <Button variant="outline" onClick={openCreate} className="mt-2">
                  <Plus className="w-4 h-4 mr-2" aria-hidden />
                  Tambah Stock Opname
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {opnameItems.map((it: any, index: number) => (
                <article
                  key={it.id}
                  ref={(el) => {
                    if (el) rowRefs.current[index] = el;
                  }}
                  className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
                  aria-label={`Item opname ${it.id}`}
                >
                  <div className="border-b border-border bg-muted/30 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{it.item_name}</p>
                        <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" aria-hidden />
                            <strong className="text-foreground">Tanggal:</strong>{' '}
                            {it.opname_date
                              ? new Date(it.opname_date).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })
                              : '-'}
                          </span>
                          <span className="flex items-center gap-2">
                            <User className="h-4 w-4" aria-hidden />
                            <strong className="text-foreground">Petugas:</strong> {it.officer_name ?? '-'}
                          </span>
                          <span>
                            <strong className="text-foreground">Suhu barang:</strong> {it.recorded_temperature || '-'}
                            {it.temperature_match === 'Tidak sesuai' ? (
                              <span className="ml-2 text-muted-foreground">
                                (<span className="text-foreground">{it.opname_temperature || '-'}</span>)
                              </span>
                            ) : it.opname_temperature ? (
                              <span className="ml-2 text-muted-foreground">
                                (<span className="text-foreground">{it.opname_temperature}</span>)
                              </span>
                            ) : null}
                            {it.temperature_match ? (
                              <span
                                className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  it.temperature_match === 'Sesuai'
                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                                }`}
                              >
                                {it.temperature_match}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    {!Array.isArray(it.lots) || it.lots.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground" role="status">
                        <Package className="h-10 w-10 mb-2 opacity-50" aria-hidden />
                        <p className="font-medium">Belum ada lot</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {it.lots.map((l: LotRow) => {
                          const expMatch = normalizeDate(l.recorded_expiration) === normalizeDate(l.opname_expiration);
                          const stockMatch =
                            Number(l.recorded_lot_stock ?? 0) === Number(l.opname_lot_stock ?? 0);

                          return (
                            <div
                              key={l.id}
                              className="rounded-lg border border-border bg-background p-4"
                              aria-label={`Lot ${l.lot_number}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{l.lot_number}</p>
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                        expMatch
                                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                          : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                                      }`}
                                    >
                                      Kadaluarsa: {expMatch ? 'Sesuai' : 'Tidak sesuai'}
                                    </span>
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                        stockMatch
                                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                          : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                                      }`}
                                    >
                                      Jumlah stock: {stockMatch ? 'Sesuai' : 'Tidak sesuai'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-md border border-border bg-card p-3">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Tercatat
                                  </p>
                                  <p className="mt-2 text-sm text-foreground">
                                    <span className="text-muted-foreground">Stock:</span>{' '}
                                    <span className="font-medium">{l.recorded_lot_stock}</span>
                                  </p>
                                  <p className="mt-1 text-sm text-foreground">
                                    <span className="text-muted-foreground">Kadaluarsa:</span>{' '}
                                    <span className="font-medium">{formatDateId(l.recorded_expiration)}</span>
                                  </p>
                                </div>
                                <div className="rounded-md border border-border bg-card p-3">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Opname
                                  </p>
                                  <p className="mt-2 text-sm text-foreground">
                                    <span className="text-muted-foreground">Stock:</span>{' '}
                                    <span className="font-medium">{l.opname_lot_stock}</span>
                                  </p>
                                  <p className="mt-1 text-sm text-foreground">
                                    <span className="text-muted-foreground">Kadaluarsa:</span>{' '}
                                    <span className="font-medium">{formatDateId(l.opname_expiration)}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  Menampilkan halaman <span className="font-medium text-foreground">{pagination.page}</span> dari{' '}
                  <span className="font-medium text-foreground">{pagination.total_pages}</span> • Total{' '}
                  <span className="font-medium text-foreground">{pagination.total}</span> item
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                    disabled={loading || pagination.page <= 1}
                    aria-label="Halaman sebelumnya"
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((p) => ({ ...p, page: Math.min(p.total_pages, p.page + 1) }))
                    }
                    disabled={loading || pagination.page >= pagination.total_pages}
                    aria-label="Halaman berikutnya"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
