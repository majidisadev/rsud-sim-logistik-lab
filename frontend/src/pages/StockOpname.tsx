import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Plus, Eye, CheckCircle, XCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

export default function StockOpname() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opnames, setOpnames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpnames();
  }, []);

  const fetchOpnames = async () => {
    try {
      const res = await api.get('/stock-opnames');
      setOpnames(res.data);
    } catch (error) {
      console.error('Error fetching opnames:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (id: number, status: 'Disetujui' | 'Tidak Disetujui') => {
    try {
      await api.patch(`/stock-opnames/${id}/validate`, { validation_status: status });
      fetchOpnames();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error validating opname');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Stock Opname</h1>
        <Button onClick={() => navigate('/stock-opname/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Stock Opname
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tanggal Opname
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Petugas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Jumlah Barang Sesuai
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Jumlah Barang Tidak Sesuai
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status Validasi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : opnames.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                opnames.map((opname) => (
                  <tr key={opname.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(opname.opname_date).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{opname.officer_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{opname.items_match || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{opname.items_mismatch || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          opname.validation_status === 'Disetujui'
                            ? 'bg-green-100 text-green-800'
                            : opname.validation_status === 'Tidak Disetujui'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {opname.validation_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/stock-opname/${opname.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Detail
                        </Button>
                        {user?.role === 'Admin' && opname.validation_status === 'Belum' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleValidate(opname.id, 'Disetujui')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Setujui
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleValidate(opname.id, 'Tidak Disetujui')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Tolak
                            </Button>
                          </>
                        )}
                      </div>
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

