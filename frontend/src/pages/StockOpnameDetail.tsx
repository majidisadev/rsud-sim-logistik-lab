import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import anime from 'animejs';
import api from '../lib/api';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  Package,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function StockOpnameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opname, setOpname] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({
    item_id: '',
    recorded_stock: '',
    opname_stock: '',
    expiration_match: 'Sesuai',
    recorded_expiration: '',
  });

  const pageRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const infoCardRef = useRef<HTMLDivElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);
  const tableCardRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<HTMLTableRowElement[]>([]);

  const isNew = id === 'new';

  useEffect(() => {
    if (id && !isNew) {
      fetchOpname();
    }
    if (isNew) setLoading(false);
    fetchItems();
  }, [id]);

  // Entrance animations
  useEffect(() => {
    if (!pageRef.current || !navRef.current) return;
    anime({
      targets: pageRef.current,
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 500,
      easing: 'easeOutCubic',
    });
    anime({
      targets: navRef.current,
      opacity: [0, 1],
      translateX: [-12, 0],
      duration: 400,
      delay: 60,
      easing: 'easeOutCubic',
    });
    if (infoCardRef.current) {
      anime({
        targets: infoCardRef.current,
        opacity: [0, 1],
        translateY: [12, 0],
        duration: 400,
        delay: 120,
        easing: 'easeOutCubic',
      });
    }
    if (formCardRef.current) {
      anime({
        targets: formCardRef.current,
        opacity: [0, 1],
        translateY: [12, 0],
        duration: 400,
        delay: 180,
        easing: 'easeOutCubic',
      });
    }
    if (tableCardRef.current) {
      anime({
        targets: tableCardRef.current,
        opacity: [0, 1],
        translateY: [12, 0],
        duration: 400,
        delay: 240,
        easing: 'easeOutCubic',
      });
    }
  }, [isNew]);

  // Stagger table rows when opname items change
  useEffect(() => {
    const itemList = opname?.items ?? [];
    if (itemList.length === 0) return;
    rowRefs.current = rowRefs.current.slice(0, itemList.length);
    const targets = rowRefs.current.filter(Boolean);
    if (targets.length === 0) return;
    anime({
      targets,
      opacity: [0, 1],
      translateX: [-8, 0],
      duration: 320,
      delay: anime.stagger(35, { start: 100 }),
      easing: 'easeOutCubic',
    });
  }, [opname?.items?.length]);

  const fetchOpname = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/stock-opnames/${id}`);
      setOpname(res.data);
    } catch (error) {
      console.error('Error fetching opname:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await api.get('/items?status=Active');
      setItems(res.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const handleAddItem = async () => {
    try {
      setAdding(true);
      if (isNew) {
        const opnameRes = await api.post('/stock-opnames', {
          opname_date: new Date().toISOString().split('T')[0],
          items: [
            {
              item_id: newItem.item_id,
              recorded_stock: parseInt(newItem.recorded_stock),
              opname_stock: parseInt(newItem.opname_stock),
              expiration_match: newItem.expiration_match,
            },
          ],
        });
        navigate(`/stock-opname/${opnameRes.data.id}`);
      } else {
        await api.post(`/stock-opnames/${id}/items`, newItem);
        setNewItem({
          item_id: '',
          recorded_stock: '',
          opname_stock: '',
          expiration_match: 'Sesuai',
          recorded_expiration: '',
        });
        setItemSearch('');
        await fetchOpname();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal menambah item');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Hapus item ini dari stock opname?')) return;
    try {
      setDeletingId(itemId);
      await api.delete(`/stock-opnames/${id}/items/${itemId}`);
      await fetchOpname();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal menghapus item');
    } finally {
      setDeletingId(null);
    }
  };

  const selectItem = (item: { id: number; name: string }) => {
    setNewItem((prev) => ({ ...prev, item_id: item.id.toString() }));
    setItemSearch(item.name);
    api.get(`/items/${item.id}`).then((res) => {
      setNewItem((prev) => ({
        ...prev,
        recorded_stock: res.data.total_stock?.toString() ?? '',
        recorded_expiration: res.data.expiration_date ?? '',
      }));
    });
  };

  const filteredItems = itemSearch
    ? items.filter((i) => i.name.toLowerCase().includes(itemSearch.toLowerCase()))
    : [];

  if (loading && !isNew) {
    return (
      <main className="flex min-h-[280px] items-center justify-center" aria-busy="true">
        <div className="flex flex-col items-center gap-3 text-muted-foreground" role="status">
          <Loader2 className="h-10 w-10 animate-spin" aria-hidden />
          <span>Memuat detail stock opname...</span>
        </div>
      </main>
    );
  }

  return (
    <main ref={pageRef} className="space-y-6" aria-label="Detail Stock Opname">
      <nav ref={navRef} aria-label="Navigasi">
        <Button
          variant="outline"
          onClick={() => navigate('/stock-opname')}
          aria-label="Kembali ke daftar stock opname"
        >
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden />
          Kembali
        </Button>
      </nav>

      {opname && (
        <section
          ref={infoCardRef}
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
          aria-labelledby="opname-info-heading"
        >
          <h2 id="opname-info-heading" className="text-lg font-semibold text-foreground mb-1">
            Informasi Stock Opname
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary/70" aria-hidden />
              <strong className="text-foreground">Tanggal:</strong>{' '}
              {new Date(opname.opname_date).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </section>
      )}

      <section
        ref={formCardRef}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
        aria-labelledby="form-opname-heading"
      >
        <h2 id="form-opname-heading" className="text-lg font-semibold text-foreground mb-4">
          Tambah Item Stock Opname
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-7 md:gap-4">
          <div className="md:col-span-2">
            <label htmlFor="item-search" className="mb-2 block text-sm font-medium text-foreground">
              Nama Barang
            </label>
            <Input
              id="item-search"
              type="text"
              placeholder="Ketik nama barang..."
              value={itemSearch}
              onChange={(e) => {
                setItemSearch(e.target.value);
                const found = items.find(
                  (i) => i.name.toLowerCase() === e.target.value.toLowerCase()
                );
                if (found) selectItem(found);
              }}
              aria-autocomplete="list"
              aria-expanded={filteredItems.length > 0}
              aria-controls="item-search-list"
              aria-describedby="item-search-hint"
            />
            <p id="item-search-hint" className="mt-1 text-xs text-muted-foreground">
              Pilih dari daftar atau ketik nama barang
            </p>
            {itemSearch && (
              <ul
                id="item-search-list"
                role="listbox"
                className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-border bg-background shadow-sm"
              >
                {filteredItems.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground" role="option">
                    Tidak ada barang cocok
                  </li>
                ) : (
                  filteredItems.map((item) => (
                    <li
                      key={item.id}
                      role="option"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectItem(item);
                        }
                      }}
                      onClick={() => selectItem(item)}
                      className="cursor-pointer px-3 py-2.5 text-sm transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded-md"
                    >
                      {item.name}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="recorded-stock" className="mb-2 block text-sm font-medium text-foreground">
              Stock Tercatat
            </label>
            <Input
              id="recorded-stock"
              type="number"
              value={newItem.recorded_stock}
              onChange={(e) => setNewItem((prev) => ({ ...prev, recorded_stock: e.target.value }))}
              readOnly
              aria-readonly="true"
              className="bg-muted/50"
            />
          </div>
          <div>
            <label htmlFor="opname-stock" className="mb-2 block text-sm font-medium text-foreground">
              Stock Opname <span className="text-destructive">*</span>
            </label>
            <Input
              id="opname-stock"
              type="number"
              min={0}
              value={newItem.opname_stock}
              onChange={(e) => setNewItem((prev) => ({ ...prev, opname_stock: e.target.value }))}
              aria-required="true"
            />
          </div>
          <div>
            <label
              htmlFor="recorded-expiration"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Kadaluarsa Tercatat
            </label>
            <Input
              id="recorded-expiration"
              type="text"
              value={
                newItem.recorded_expiration
                  ? new Date(newItem.recorded_expiration).toLocaleDateString('id-ID')
                  : '-'
              }
              readOnly
              aria-readonly="true"
              className="bg-muted/50"
            />
          </div>
          <div>
            <label
              htmlFor="expiration-match"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Kadaluarsa
            </label>
            <select
              id="expiration-match"
              value={newItem.expiration_match}
              onChange={(e) =>
                setNewItem((prev) => ({ ...prev, expiration_match: e.target.value }))
              }
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Status kesesuaian tanggal kadaluarsa"
            >
              <option value="Sesuai">Sesuai</option>
              <option value="Tidak sesuai">Tidak sesuai</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleAddItem}
              className="w-full"
              disabled={adding || !newItem.item_id || !newItem.opname_stock}
              aria-label="Tambah item ke stock opname"
            >
              {adding ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
              ) : (
                <Plus className="w-4 h-4 mr-2" aria-hidden />
              )}
              Tambah
            </Button>
          </div>
        </div>
      </section>

      {opname && (
        <section
          ref={tableCardRef}
          className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
          aria-labelledby="daftar-barang-heading"
        >
          <div className="border-b border-border bg-muted/30 px-5 py-4">
            <h2 id="daftar-barang-heading" className="text-lg font-semibold text-foreground">
              Daftar Barang
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {opname.items?.length ?? 0} item dalam stock opname ini
            </p>
          </div>
          <div className="overflow-x-auto">
            {!opname.items?.length ? (
              <div
                className="flex flex-col items-center justify-center py-16 text-muted-foreground"
                role="status"
                aria-live="polite"
              >
                <Package className="h-12 w-12 mb-3 opacity-50" aria-hidden />
                <p className="font-medium">Belum ada item</p>
                <p className="text-sm">Gunakan form di atas untuk menambah item</p>
              </div>
            ) : (
              <table
                className="w-full min-w-[800px]"
                role="table"
                aria-labelledby="daftar-barang-heading"
              >
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Nama Barang
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Stock Tercatat
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Stock Opname
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Selisih
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Sesuai Stock
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Kadaluarsa Tercatat
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Kadaluarsa Opname
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {opname.items?.map((item: any, index: number) => {
                    const stockDiff = item.opname_stock - item.recorded_stock;
                    const stockMatch = stockDiff === 0;
                    const expMatch = item.expiration_match === 'Sesuai';
                    return (
                      <tr
                        key={item.id}
                        ref={(el) => {
                          if (el) rowRefs.current[index] = el;
                        }}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                          {item.item_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {item.recorded_stock}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {item.opname_stock}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={
                              stockDiff === 0
                                ? 'text-muted-foreground'
                                : stockDiff > 0
                                ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                : 'text-red-600 dark:text-red-400 font-medium'
                            }
                          >
                            {stockDiff > 0 ? '+' : ''}
                            {stockDiff}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                              stockMatch
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                            }`}
                            role="status"
                          >
                            {stockMatch ? (
                              <CheckCircle className="h-3.5 w-3.5" aria-hidden />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" aria-hidden />
                            )}
                            {stockMatch ? 'Sesuai' : 'Tidak sesuai'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {item.recorded_expiration
                            ? new Date(item.recorded_expiration).toLocaleDateString('id-ID')
                            : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                              expMatch
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                            }`}
                            role="status"
                          >
                            {item.expiration_match}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {opname.validation_status === 'Belum' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={deletingId === item.id}
                              aria-label={`Hapus ${item.item_name} dari stock opname`}
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden />
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
