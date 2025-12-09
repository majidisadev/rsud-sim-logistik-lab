import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Download } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Laporan() {
  const [reports, setReports] = useState<any[]>([]);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [period, year, month]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params: any = { period, year };
      if (period === 'monthly') params.month = month;

      const res = await api.get('/reports', { params });
      setReports(res.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const data = reports.map((r) => ({
      Barang: r.item_name,
      Satuan: r.unit || '-',
      'Jumlah Masuk': r.total_masuk,
      'Jumlah Keluar': r.total_keluar,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, `laporan-${period}-${year}${period === 'monthly' ? `-${month}` : ''}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(
      `Laporan ${period === 'monthly' ? 'Bulanan' : 'Tahunan'} ${year}${period === 'monthly' ? ` - ${month}` : ''}`,
      14,
      15
    );

    const tableData = reports.map((r) => [
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
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Laporan</h1>
        <div className="flex space-x-2">
          <Button onClick={exportToExcel} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Periode</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'monthly' | 'yearly')}
              className="w-full border border-gray-300 rounded-lg p-2"
            >
              <option value="monthly">Bulanan</option>
              <option value="yearly">Tahunan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Tahun</label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min="2020"
              max="2099"
            />
          </div>
          {period === 'monthly' && (
            <div>
              <label className="block text-sm font-medium mb-2">Bulan</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Barang
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Satuan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Jumlah Masuk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Jumlah Keluar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{report.item_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{report.unit || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{report.total_masuk}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{report.total_keluar}</td>
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

