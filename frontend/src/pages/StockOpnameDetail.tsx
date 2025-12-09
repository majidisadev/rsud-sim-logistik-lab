import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function StockOpnameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opname, setOpname] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({
    item_id: '',
    recorded_stock: '',
    opname_stock: '',
    expiration_match: 'Sesuai',
  });

  useEffect(() => {
    if (id && id !== 'new') {
      fetchOpname();
    }
    fetchItems();
  }, [id]);

  const fetchOpname = async () => {
    try {
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
      if (id === 'new') {
        // Create new opname
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
        });
        fetchOpname();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error adding item');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Hapus item ini?')) return;
    try {
      await api.delete(`/stock-opnames/${id}/items/${itemId}`);
      fetchOpname();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting item');
    }
  };

  if (loading && id !== 'new') {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate('/stock-opname')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Kembali
      </Button>

      {opname && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Tanggal Opname: {new Date(opname.opname_date).toLocaleDateString('id-ID')}
          </h2>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Tambah Stock Opname</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Nama Barang</label>
            <Input
              type="text"
              placeholder="Ketik nama barang..."
              value={itemSearch}
              onChange={(e) => {
                setItemSearch(e.target.value);
                const found = items.find(
                  (i) => i.name.toLowerCase() === e.target.value.toLowerCase()
                );
                if (found) {
                  setNewItem({ ...newItem, item_id: found.id.toString() });
                  // Fetch item details to get recorded stock
                  api.get(`/items/${found.id}`).then((res) => {
                    setNewItem((prev) => ({
                      ...prev,
                      recorded_stock: res.data.total_stock.toString(),
                    }));
                  });
                }
              }}
            />
            {itemSearch && (
              <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                {items
                  .filter((i) => i.name.toLowerCase().includes(itemSearch.toLowerCase()))
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setNewItem({ ...newItem, item_id: item.id.toString() });
                        setItemSearch(item.name);
                        api.get(`/items/${item.id}`).then((res) => {
                          setNewItem((prev) => ({
                            ...prev,
                            recorded_stock: res.data.total_stock.toString(),
                          }));
                        });
                      }}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {item.name}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Stock Tercatat</label>
            <Input
              type="number"
              value={newItem.recorded_stock}
              onChange={(e) => setNewItem({ ...newItem, recorded_stock: e.target.value })}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Stock Opname</label>
            <Input
              type="number"
              value={newItem.opname_stock}
              onChange={(e) => setNewItem({ ...newItem, opname_stock: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Kadaluarsa</label>
            <select
              value={newItem.expiration_match}
              onChange={(e) =>
                setNewItem({ ...newItem, expiration_match: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg p-2"
            >
              <option value="Sesuai">Sesuai</option>
              <option value="Tidak sesuai">Tidak sesuai</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleAddItem} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </Button>
          </div>
        </div>
      </div>

      {opname && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Daftar Barang</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Nama Barang</th>
                  <th className="px-4 py-2 text-left">Stock Tercatat</th>
                  <th className="px-4 py-2 text-left">Stock Opname</th>
                  <th className="px-4 py-2 text-left">Selisih</th>
                  <th className="px-4 py-2 text-left">Sesuai Stock</th>
                  <th className="px-4 py-2 text-left">Kadaluarsa Tercatat</th>
                  <th className="px-4 py-2 text-left">Kadaluarsa Opname</th>
                  <th className="px-4 py-2 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {opname.items?.map((item: any) => {
                  const stockDiff = item.opname_stock - item.recorded_stock;
                  const stockMatch = stockDiff === 0;
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-2">{item.item_name}</td>
                      <td className="px-4 py-2">{item.recorded_stock}</td>
                      <td className="px-4 py-2">{item.opname_stock}</td>
                      <td className="px-4 py-2">{stockDiff}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            stockMatch
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {stockMatch ? 'Sesuai' : 'Tidak sesuai'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {item.recorded_expiration
                          ? new Date(item.recorded_expiration).toLocaleDateString('id-ID')
                          : '-'}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            item.expiration_match === 'Sesuai'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.expiration_match}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {opname.validation_status === 'Belum' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

