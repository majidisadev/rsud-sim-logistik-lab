import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Eye, Download, Search } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function AllItems() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [searchParams, pageSize, currentPage, sortConfig, selectedCategories]);

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

      // Filter by selected categories on client side
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

      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      setItems(filteredItems.slice(start, end));
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const exportToExcel = async () => {
    // Fetch all items with supplier data for export
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

      // Filter by selected categories on client side
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
    }
  };

  const exportToPDF = async () => {
    try {
      // Fetch all items with supplier data for export
      const params: any = {
        expired: searchParams.get('expired') || undefined,
        soon_expired: searchParams.get('soon_expired') || undefined,
        out_of_stock: searchParams.get('out_of_stock') || undefined,
        low_stock: searchParams.get('low_stock') || undefined,
      };
      if (search) params.search = search;

      const res = await api.get('/items', { params });
      let allItems = [...res.data];

      // Filter by selected categories on client side
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
    }
  };

  const isExpired = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Semua Barang</h1>
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex items-center space-x-2">
          <Search className="w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Cari barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchItems()}
            className="flex-1"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Kategori</label>
            <div className="border border-gray-300 rounded-lg p-2 flex flex-wrap gap-3">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
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
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Items per Page</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg p-2"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  Barang
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('category_name')}
                >
                  Kategori
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('expiration_date')}
                >
                  Expiration
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total_stock')}
                >
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Satuan
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('last_opname_date')}
                >
                  Tanggal Opname
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.name}
                      {item.status === 'Inactive' && (
                        <span className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                          Non-Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.category_name || '-'}</td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap ${
                        item.expiration_date && isExpired(item.expiration_date)
                          ? 'text-red-600 font-semibold'
                          : ''
                      }`}
                    >
                      {item.expiration_date
                        ? new Date(item.expiration_date).toLocaleDateString('id-ID')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={
                          Number(item.total_stock) === 0
                            ? 'text-red-600 font-semibold'
                            : ''
                        }
                      >
                        {item.total_stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.unit || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.last_opname_date
                        ? new Date(item.last_opname_date).toLocaleDateString('id-ID')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/barang/${item.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Detail
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

