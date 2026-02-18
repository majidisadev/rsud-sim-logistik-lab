import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import anime from 'animejs';
import api from '../lib/api';
import { Download, Search, Eye, FileText, ArrowDownCircle, ArrowUpCircle, BarChart3 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Laporan() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const pageRef = useRef<HTMLDivElement>(null);
  const filterCardRef = useRef<HTMLDivElement>(null);
  const tableCardRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<HTMLTableRowElement[]>([]);

  useEffect(() => {
    fetchReports();
  }, [period, year, month]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredReports(reports);
    } else {
      const filtered = reports.filter((report) =>
        report.item_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredReports(filtered);
    }
  }, [searchTerm, reports]);

  // Entrance animations on mount
  useEffect(() => {
    if (!pageRef.current || !filterCardRef.current || !tableCardRef.current) return;
    anime({
      targets: pageRef.current,
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 500,
      easing: 'easeOutCubic',
    });
    anime({
      targets: filterCardRef.current,
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 450,
      delay: 100,
      easing: 'easeOutCubic',
    });
    anime({
      targets: tableCardRef.current,
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 450,
      delay: 180,
      easing: 'easeOutCubic',
    });
  }, []);

  // Stagger rows when data loads
  useEffect(() => {
    if (loading || filteredReports.length === 0) return;
    rowRefs.current = rowRefs.current.slice(0, filteredReports.length);
    const targets = rowRefs.current.filter(Boolean);
    if (targets.length === 0) return;
    anime({
      targets,
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 360,
      delay: anime.stagger(35, { start: 80 }),
      easing: 'easeOutCubic',
    });
  }, [loading, filteredReports.length]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params: any = { period, year };
      if (period === 'monthly') params.month = month;

      const res = await api.get('/reports', { params });
      setReports(res.data);
      setFilteredReports(res.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    setExporting('excel');
    const data = filteredReports.map((r) => ({
      Barang: r.item_name,
      Satuan: r.unit || '-',
      'Jumlah Masuk': r.total_masuk,
      'Jumlah Keluar': r.total_keluar,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, `laporan-${period}-${year}${period === 'monthly' ? `-${month}` : ''}.xlsx`);
    setExporting(null);
  };

  const exportToPDF = () => {
    setExporting('pdf');
    const doc = new jsPDF();
    doc.text(
      `Laporan ${period === 'monthly' ? 'Bulanan' : 'Tahunan'} ${year}${period === 'monthly' ? ` - ${month}` : ''}`,
      14,
      15
    );

    const tableData = filteredReports.map((r) => [
      r.item_name,
      r.unit || '-',
      r.total_masuk.toString(),
      r.total_keluar.toString(),
    ]);

    (doc as any).autoTable({
      head: [['Barang', 'Satuan', 'Jumlah Masuk', 'Jumlah Keluar']],
      body: tableData,
      startY: 20,
    });

    doc.save(`laporan-${period}-${year}${period === 'monthly' ? `-${month}` : ''}.pdf`);
    setExporting(null);
  };

  const totalMasuk = filteredReports.reduce((sum, r) => sum + (r.total_masuk || 0), 0);
  const totalKeluar = filteredReports.reduce((sum, r) => sum + (r.total_keluar || 0), 0);

  return (
    <div ref={pageRef} className="space-y-5" role="main" aria-label="Halaman Laporan">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600" aria-hidden>
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Laporan</h1>
            <p className="text-sm text-gray-500 mt-0.5">Ringkasan barang masuk dan keluar per periode</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={exportToExcel}
            variant="outline"
            size="sm"
            disabled={loading || filteredReports.length === 0 || exporting !== null}
            aria-label="Ekspor ke Excel"
          >
            <Download className={`w-4 h-4 mr-2 ${exporting === 'excel' ? 'animate-pulse' : ''}`} aria-hidden />
            {exporting === 'excel' ? 'Mengekspor...' : 'Excel'}
          </Button>
          <Button
            onClick={exportToPDF}
            variant="outline"
            size="sm"
            disabled={loading || filteredReports.length === 0 || exporting !== null}
            aria-label="Ekspor ke PDF"
          >
            <Download className={`w-4 h-4 mr-2 ${exporting === 'pdf' ? 'animate-pulse' : ''}`} aria-hidden />
            {exporting === 'pdf' ? 'Mengekspor...' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
          <div className="p-2 rounded-lg bg-indigo-50">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Jumlah Barang</p>
            <p className="text-xl font-bold text-gray-900">{filteredReports.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
          <div className="p-2 rounded-lg bg-emerald-50">
            <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Masuk</p>
            <p className="text-xl font-bold text-gray-900">{totalMasuk.toLocaleString('id-ID')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
          <div className="p-2 rounded-lg bg-amber-50">
            <ArrowUpCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Keluar</p>
            <p className="text-xl font-bold text-gray-900">{totalKeluar.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        ref={filterCardRef}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-4"
        role="search"
        aria-label="Filter dan cari laporan"
      >
        <div>
          <label htmlFor="search-laporan" className="block text-sm font-medium text-gray-700 mb-2">
            Cari Barang
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" aria-hidden />
            <Input
              id="search-laporan"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Masukkan nama barang..."
              className="pl-10 focus:ring-2 focus:ring-indigo-500"
              aria-describedby="search-laporan-desc"
            />
            <span id="search-laporan-desc" className="sr-only">Filter hasil laporan berdasarkan nama barang</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="period-laporan" className="block text-sm font-medium text-gray-700 mb-2">
              Periode
            </label>
            <select
              id="period-laporan"
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'monthly' | 'yearly')}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
            </select>
          </div>
          <div>
            <label htmlFor="year-laporan" className="block text-sm font-medium text-gray-700 mb-2">
              Tahun
            </label>
            <Input
              id="year-laporan"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min="2020"
              max="2099"
              className="focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {period === 'monthly' && (
            <div>
              <label htmlFor="month-laporan" className="block text-sm font-medium text-gray-700 mb-2">
                Bulan
              </label>
              <select
                id="month-laporan"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString('id-ID', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        ref={tableCardRef}
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        role="region"
        aria-label="Tabel laporan barang masuk dan keluar"
      >
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label="Daftar laporan per barang">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Barang
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Satuan
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Jumlah Masuk
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Jumlah Keluar
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                      <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-24" /></td>
                    </tr>
                  ))}
                </>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center" role="status">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <FileText className="w-12 h-12 text-gray-300" aria-hidden />
                      <p className="font-medium">
                        {searchTerm ? 'Tidak ada data yang sesuai dengan pencarian' : 'Tidak ada data laporan'}
                      </p>
                      <p className="text-sm">
                        {searchTerm ? 'Coba ubah kata kunci pencarian' : 'Pilih periode lain atau tunggu data tersedia'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report, idx) => (
                  <tr
                    key={report.id}
                    ref={(el) => { if (el) rowRefs.current[idx] = el; }}
                    className="hover:bg-indigo-50/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{report.item_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{report.unit || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-semibold text-sm">
                        {report.total_masuk}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-semibold text-sm">
                        {report.total_keluar}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/barang/${report.id}`)}
                        aria-label={`Lihat detail ${report.item_name}`}
                        className="focus:ring-2 focus:ring-indigo-500"
                      >
                        <Eye className="w-4 h-4 mr-2" aria-hidden />
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

