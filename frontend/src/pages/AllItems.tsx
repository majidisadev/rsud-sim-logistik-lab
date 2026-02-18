import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import anime from 'animejs';
import api from '../lib/api';
import {
  Eye,
  Search,
  FileSpreadsheet,
  FileText,
  Package,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const TABLE_COLUMNS = 7;

export default function AllItems() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);
  const filterCardRef = useRef<HTMLDivElement>(null);
  const tableCardRef = useRef<HTMLDivElement>(null);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const rowRefs = useRef<HTMLTableRowElement[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [searchParams, pageSize, currentPage, sortConfig, selectedCategories, search]);

  // Entrance animations on mount
  useEffect(() => {
    if (!pageRef.current || !filterCardRef.current || !tableCardRef.current) return;
    anime({
      targets: pageRef.current,
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 400,
      easing: 'easeOutCubic',
    });
    anime({
      targets: filterCardRef.current,
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 400,
      delay: 80,
      easing: 'easeOutCubic',
    });
    anime({
      targets: tableCardRef.current,
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 400,
      delay: 160,
      easing: 'easeOutCubic',
    });
  }, []);

  // Stagger rows when items change (after load)
  useEffect(() => {
    if (loading || items.length === 0) return;
    rowRefs.current = rowRefs.current.slice(0, items.length);
    const targets = rowRefs.current.filter(Boolean);
    if (targets.length === 0) return;
    anime({
      targets,
      opacity: [0, 1],
      translateX: [-16, 0],
      duration: 320,
      delay: anime.stagger(30, { start: 80 }),
      easing: 'easeOutCubic',
    });
  }, [loading, items]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params: any = {
        expired: searchParams.get('expired') || undefined,
        soon_expired: searchParams.get('soon_expired') || undefined,
        out_of_stock: searchParams.get('out_of_stock') || undefined,
        low_stock: searchParams.get('low_stock') || undefined,
      };

      if (search) params.search = search;

      const res = await api.get('/items', { params });
      let filteredItems = [...res.data];

      if (selectedCategories.length > 0) {
        filteredItems = filteredItems.filter((item) =>
          selectedCategories.includes(item.category_id?.toString())
        );
      }

      if (sortConfig) {
        filteredItems.sort((a, b) => {
          let aVal = a[sortConfig.key];
          let bVal = b[sortConfig.key];

          if (sortConfig.key === 'expiration_date' || sortConfig.key === 'last_opname_date') {
            aVal = aVal ? new Date(aVal).getTime() : 0;
            bVal = bVal ? new Date(bVal).getTime() : 0;
          }

          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      setTotalFilteredCount(filteredItems.length);
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      setItems(filteredItems.slice(start, end));
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const hasActiveFilters =
    search.trim() !== '' || selectedCategories.length > 0 || searchParams.toString() !== '';

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategories([]);
    setCurrentPage(1);
  };

  const exportToExcel = async () => {
    setExporting('excel');
    try {
      const params: any = {
        expired: searchParams.get('expired') || undefined,
        soon_expired: searchParams.get('soon_expired') || undefined,
        out_of_stock: searchParams.get('out_of_stock') || undefined,
        low_stock: searchParams.get('low_stock') || undefined,
      };
      if (search) params.search = search;

      const res = await api.get('/items', { params });
      let allItems = [...res.data];

      if (selectedCategories.length > 0) {
        allItems = allItems.filter((item) =>
          selectedCategories.includes(item.category_id?.toString())
        );
      }

      const data = allItems.map((item) => ({
        Barang: item.name,
        Kategori: item.category_name || '-',
        Stock: item.total_stock,
        Satuan: item.unit || '-',
        Expiration: item.expiration_date
          ? new Date(item.expiration_date).toLocaleDateString('id-ID')
          : '-',
        Supplier: item.supplier_names || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Barang');
      XLSX.writeFile(wb, 'barang.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Gagal mengekspor ke Excel');
    } finally {
      setExporting(null);
    }
  };

  const exportToPDF = async () => {
    setExporting('pdf');
    try {
      const params: any = {
        expired: searchParams.get('expired') || undefined,
        soon_expired: searchParams.get('soon_expired') || undefined,
        out_of_stock: searchParams.get('out_of_stock') || undefined,
        low_stock: searchParams.get('low_stock') || undefined,
      };
      if (search) params.search = search;

      const res = await api.get('/items', { params });
      let allItems = [...res.data];

      if (selectedCategories.length > 0) {
        allItems = allItems.filter((item) =>
          selectedCategories.includes(item.category_id?.toString())
        );
      }

      const doc = new jsPDF();
      doc.text('Daftar Barang', 14, 15);

      const tableData = allItems.map((item) => [
        item.name,
        item.category_name || '-',
        item.total_stock.toString(),
        item.unit || '-',
        item.expiration_date
          ? new Date(item.expiration_date).toLocaleDateString('id-ID')
          : '-',
        item.supplier_names || '-',
      ]);

      (doc as any).autoTable({
        head: [['Barang', 'Kategori', 'Stock', 'Satuan', 'Expiration', 'Supplier']],
        body: tableData,
        startY: 20,
      });

      doc.save('barang.pdf');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Gagal mengekspor ke PDF');
    } finally {
      setExporting(null);
    }
  };

  const isExpired = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) {
      return (
        <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 ml-1 inline-block opacity-60" aria-hidden />
      );
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary ml-1 inline-block" aria-hidden />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary ml-1 inline-block" aria-hidden />
    );
  };

  return (
    <main ref={pageRef} className="space-y-6" role="main" aria-label="Daftar semua barang">
      {/* Header */}
      <section aria-labelledby="page-title">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 id="page-title" className="text-2xl font-bold text-gray-900 tracking-tight">
              Semua Barang
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Kelola dan pantau stok barang di gudang
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={exportToExcel}
              variant="outline"
              size="sm"
              disabled={!!exporting}
              aria-label="Ekspor ke Excel"
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" aria-hidden />
              Excel
            </Button>
            <Button
              onClick={exportToPDF}
              variant="outline"
              size="sm"
              disabled={!!exporting}
              aria-label="Ekspor ke PDF"
              className="gap-2"
            >
              <FileText className="w-4 h-4" aria-hidden />
              PDF
            </Button>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section ref={filterCardRef} aria-label="Filter dan pencarian">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Cari barang..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                onKeyDown={(e) => e.key === 'Enter' && fetchItems()}
                className="pl-10 w-full"
                aria-label="Cari barang berdasarkan nama"
                autoComplete="off"
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                aria-label="Hapus semua filter"
                className="gap-1.5 text-gray-600 shrink-0"
              >
                <X className="w-4 h-4" aria-hidden />
                Hapus filter
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label id="filter-category-label" className="block text-sm font-medium text-gray-700 mb-2">
                Kategori
              </label>
              <div
                className="border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2 bg-gray-50/50"
                role="group"
                aria-labelledby="filter-category-label"
              >
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.id.toString())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories([...selectedCategories, cat.id.toString()]);
                        } else {
                          setSelectedCategories(
                            selectedCategories.filter((id) => id !== cat.id.toString())
                          );
                        }
                        setCurrentPage(1);
                      }}
                      className="rounded border-gray-300 text-primary focus:ring-primary size-4"
                      aria-describedby={`cat-${cat.id}`}
                    />
                    <span id={`cat-${cat.id}`}>{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="shrink-0">
              <label id="page-size-label" className="block text-sm font-medium text-gray-700 mb-2">
                Tampilkan per halaman
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:border-primary min-w-[100px]"
                aria-labelledby="page-size-label"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Table */}
      <section ref={tableCardRef} aria-label="Tabel daftar barang">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" role="table" aria-label="Tabel barang">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th
                    scope="col"
                    className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('name')}
                      className="inline-flex items-center hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                      aria-sort={sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      Barang
                      <SortIcon columnKey="name" />
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('category_name')}
                      className="inline-flex items-center hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                      aria-sort={sortConfig?.key === 'category_name' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      Kategori
                      <SortIcon columnKey="category_name" />
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('expiration_date')}
                      className="inline-flex items-center hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                      aria-sort={sortConfig?.key === 'expiration_date' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      Kadaluarsa
                      <SortIcon columnKey="expiration_date" />
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('total_stock')}
                      className="inline-flex items-center hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                      aria-sort={sortConfig?.key === 'total_stock' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      Stock
                      <SortIcon columnKey="total_stock" />
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider normal-case"
                  >
                    Satuan
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort('last_opname_date')}
                      className="inline-flex items-center hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                      aria-sort={sortConfig?.key === 'last_opname_date' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      Tanggal Opname
                      <SortIcon columnKey="last_opname_date" />
                    </button>
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody ref={tableBodyRef} className="divide-y divide-gray-100">
                {loading ? (
                  <>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`skeleton-${i}`} className="animate-pulse">
                        <td colSpan={TABLE_COLUMNS} className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-4 w-48 bg-gray-200 rounded" />
                            <div className="h-5 w-16 bg-gray-200 rounded-full" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COLUMNS} className="px-5 py-16 text-center">
                      <div
                        className="flex flex-col items-center gap-3 text-gray-500"
                        role="status"
                        aria-live="polite"
                      >
                        <div className="rounded-full bg-gray-100 p-4" aria-hidden>
                          <Package className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="font-medium">Tidak ada barang ditemukan</p>
                        <p className="text-sm max-w-sm">
                          Coba ubah filter atau kata kunci pencarian, atau pastikan data barang sudah tersedia.
                        </p>
                        <Button variant="outline" size="sm" onClick={clearFilters} className="mt-1">
                          Hapus filter
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr
                      key={item.id}
                      ref={(el) => {
                        if (el) rowRefs.current[index] = el;
                      }}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{item.name}</span>
                          {item.status === 'Inactive' && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
                              aria-label="Status: Non-aktif"
                            >
                              Non-aktif
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{item.category_name || '–'}</td>
                      <td className="px-5 py-4">
                        <span
                          className={
                            item.expiration_date && isExpired(item.expiration_date)
                              ? 'text-red-600 font-semibold'
                              : 'text-gray-700'
                          }
                        >
                          {item.expiration_date
                            ? new Date(item.expiration_date).toLocaleDateString('id-ID')
                            : '–'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={
                            Number(item.total_stock) === 0
                              ? 'text-red-600 font-semibold'
                              : 'text-gray-900'
                          }
                        >
                          {item.total_stock}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{item.unit || '–'}</td>
                      <td className="px-5 py-4 text-gray-600">
                        {item.last_opname_date
                          ? new Date(item.last_opname_date).toLocaleDateString('id-ID')
                          : '–'}
                      </td>
                      <td className="px-5 py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/barang/${item.id}`)}
                          aria-label={`Lihat detail ${item.name}`}
                          className="gap-1.5"
                        >
                          <Eye className="w-4 h-4" aria-hidden />
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && items.length > 0 && totalPages > 1 && (
            <div
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-gray-50/50 border-t border-gray-100"
              role="navigation"
              aria-label="Navigasi halaman"
            >
              <p className="text-sm text-gray-600">
                Menampilkan{' '}
                <span className="font-medium">
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalFilteredCount)}
                </span>{' '}
                dari <span className="font-medium">{totalFilteredCount}</span> barang
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden />
                </Button>
                <span className="px-3 py-1.5 text-sm text-gray-700" aria-live="polite">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden />
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
