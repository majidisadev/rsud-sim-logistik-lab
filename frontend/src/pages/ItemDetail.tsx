import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, Edit, Trash2, Plus, Filter, X } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLotModal, setShowLotModal] = useState(false);
  const [showEditLotModal, setShowEditLotModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [lotForm, setLotForm] = useState({ lot_number: '', expiration_date: '', stock: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionFilter, setTransactionFilter] = useState({ type: '', start_date: '', end_date: '' });
  const [tempFilter, setTempFilter] = useState({ type: '', start_date: '', end_date: '' });
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    unit: '',
    temperature: '',
    min_stock: 1,
    image: '',
    suppliers: [] as string[],
  });
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchItem();
      fetchTransactions();
      fetchMonthlyStats();
      fetchSuppliers();
    }
  }, [id]);

  const fetchItem = async () => {
    try {
      const res = await api.get(`/items/${id}`);
      setItem(res.data);
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (filter?: { type: string; start_date: string; end_date: string }) => {
    try {
      const activeFilter = filter || transactionFilter;
      const params: any = { item_id: id };
      if (activeFilter.type) params.type = activeFilter.type;
      if (activeFilter.start_date) params.start_date = activeFilter.start_date;
      if (activeFilter.end_date) params.end_date = activeFilter.end_date;

      const res = await api.get('/transactions', { params });
      setTransactions(res.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleApplyFilter = () => {
    setTransactionFilter({ ...tempFilter });
    fetchTransactions(tempFilter);
  };

  const handleResetFilter = () => {
    const emptyFilter = { type: '', start_date: '', end_date: '' };
    setTempFilter(emptyFilter);
    setTransactionFilter(emptyFilter);
    fetchTransactions(emptyFilter);
  };

  const fetchMonthlyStats = async () => {
    try {
      // Fetch all transactions for this item for the current year
      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      
      const res = await api.get('/transactions', {
        params: {
          item_id: id,
          start_date: startDate,
          end_date: endDate,
        },
      });

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthlyData = months.map((month, idx) => {
        const monthStr = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
        
        // Filter transactions for this month
        const monthTransactions = res.data.filter((tx: any) => {
          const txDate = new Date(tx.created_at);
          const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
          return txMonth === monthStr;
        });

        // Sum quantities by type
        const masukTotal = monthTransactions
          .filter((tx: any) => tx.type === 'Masuk')
          .reduce((sum: number, tx: any) => sum + (parseInt(tx.quantity) || 0), 0);
        
        const keluarTotal = monthTransactions
          .filter((tx: any) => tx.type === 'Keluar')
          .reduce((sum: number, tx: any) => sum + (parseInt(tx.quantity) || 0), 0);

        return {
          month,
          Masuk: masukTotal,
          Keluar: keluarTotal,
        };
      });
      setMonthlyStats(monthlyData);
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setEditForm({ ...editForm, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenEditModal = () => {
    if (item) {
      setEditForm({
        name: item.name || '',
        description: item.description || '',
        unit: item.unit || '',
        temperature: item.temperature || '',
        min_stock: item.min_stock || 1,
        image: item.image || '',
        suppliers: item.suppliers?.map((s: any) => s.id.toString()) || [],
      });
      setImageMode(item.image ? 'url' : 'url');
      setImageFile(null);
      setImagePreview(item.image || '');
      setShowEditItemModal(true);
    }
  };

  const handleUpdateItem = async () => {
    try {
      let imageUrl = editForm.image;

      // If image file is uploaded, convert to base64
      if (imageFile && imageMode === 'upload') {
        imageUrl = imagePreview;
      }

      const updateData: any = {
        name: editForm.name,
        description: editForm.description,
        unit: editForm.unit,
        temperature: editForm.temperature,
        min_stock: parseInt(editForm.min_stock.toString()),
        image: imageUrl || null,
        suppliers: editForm.suppliers.map((s) => parseInt(s)),
      };

      await api.put(`/items/${id}`, updateData);
      setShowEditItemModal(false);
      setImageFile(null);
      setImagePreview('');
      fetchItem();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error updating item');
    }
  };

  const handleAddLot = async () => {
    try {
      await api.post(`/items/${id}/lots`, {
        ...lotForm,
        stock: parseInt(lotForm.stock.toString()),
      });
      setShowLotModal(false);
      setLotForm({ lot_number: '', expiration_date: '', stock: 0 });
      fetchItem();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error adding lot');
    }
  };

  const handleEditLot = async () => {
    try {
      await api.put(`/items/${id}/lots/${selectedLot.id}`, {
        lot_number: lotForm.lot_number,
        expiration_date: lotForm.expiration_date || null,
      });
      setShowEditLotModal(false);
      setSelectedLot(null);
      setLotForm({ lot_number: '', expiration_date: '', stock: 0 });
      fetchItem();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error updating lot');
    }
  };

  const handleDeleteLot = async (lotId: number) => {
    if (!confirm('Hapus lot ini?')) return;
    try {
      await api.delete(`/items/${id}/lots/${lotId}`);
      fetchItem();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting lot');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!item) {
    return <div>Item not found</div>;
  }

  const isExpired = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate('/barang')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Kembali
      </Button>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{item.name}</h1>
          </div>
          {(user?.role === 'Admin' || user?.role === 'PJ Gudang') && (
            <Button onClick={handleOpenEditModal}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Barang
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {item.image && (
            <img src={item.image} alt={item.name} className="w-full h-64 object-cover rounded-lg" />
          )}
          <div className="space-y-4">
            <p className="text-gray-600">{item.description || '-'}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Kategori</p>
                <p className="font-medium">{item.category_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Expiration</p>
                <p
                  className={`font-medium ${
                    item.expiration_date && isExpired(item.expiration_date)
                      ? 'text-red-600'
                      : ''
                  }`}
                >
                  {item.expiration_date
                    ? new Date(item.expiration_date).toLocaleDateString('id-ID')
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Stock</p>
                <p className="font-medium">{item.total_stock}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Min Stock</p>
                <p className="font-medium">{item.min_stock}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Satuan</p>
                <p className="font-medium">{item.unit || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Suhu</p>
                <p className="font-medium">{item.temperature || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Opname Terakhir</p>
                <p className="font-medium">
                  {item.last_opname_date
                    ? new Date(item.last_opname_date).toLocaleDateString('id-ID')
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Supplier</p>
                <p className="font-medium">
                  {item.suppliers?.map((s: any) => s.name).join(', ') || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lots Section */}
      {(user?.role === 'Admin' || user?.role === 'PJ Gudang' || user?.role === 'User') && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Nomor Lot</h2>
            <Button onClick={() => setShowLotModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Lot
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Nomor Lot</th>
                  <th className="px-4 py-2 text-left">Expiration</th>
                  <th className="px-4 py-2 text-left">Lot Stock</th>
                  <th className="px-4 py-2 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {item.lots?.map((lot: any) => (
                  <tr key={lot.id}>
                    <td className="px-4 py-2">{lot.lot_number}</td>
                    <td className="px-4 py-2">
                      {lot.expiration_date
                        ? new Date(lot.expiration_date).toLocaleDateString('id-ID')
                        : '-'}
                    </td>
                    <td className="px-4 py-2">{lot.stock}</td>
                    <td className="px-4 py-2">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedLot(lot);
                            setLotForm({
                              lot_number: lot.lot_number,
                              expiration_date: lot.expiration_date || '',
                              stock: lot.stock,
                            });
                            setShowEditLotModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {lot.stock === 0 && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteLot(lot.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Grafik Stok Bulanan</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Masuk" stroke="#3b82f6" strokeWidth={2} name="Barang Masuk" dot />
            <Line type="monotone" dataKey="Keluar" stroke="#ef4444" strokeWidth={2} name="Barang Keluar" dot />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Riwayat Transaksi</h2>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <select
            value={tempFilter.type}
            onChange={(e) => {
              setTempFilter({ ...tempFilter, type: e.target.value });
            }}
            className="border border-gray-300 rounded-lg p-2 min-w-[150px]"
          >
            <option value="">Semua</option>
            <option value="Masuk">Masuk</option>
            <option value="Keluar">Keluar</option>
          </select>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={tempFilter.start_date}
              onChange={(e) => {
                setTempFilter({ ...tempFilter, start_date: e.target.value });
              }}
              placeholder="Tanggal Mulai"
              className="min-w-[160px]"
            />
            <span className="text-gray-500">-</span>
            <Input
              type="date"
              value={tempFilter.end_date}
              onChange={(e) => {
                setTempFilter({ ...tempFilter, end_date: e.target.value });
              }}
              placeholder="Tanggal Akhir"
              className="min-w-[160px]"
            />
          </div>
          <Button onClick={handleApplyFilter}>
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" onClick={handleResetFilter}>
            <X className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">In/Out</th>
                <th className="px-4 py-2 text-left">Tanggal</th>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Jumlah</th>
                <th className="px-4 py-2 text-left">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        tx.type === 'Masuk'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {new Date(tx.created_at).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-2">{tx.user_name}</td>
                  <td className="px-4 py-2">{tx.quantity}</td>
                  <td className="px-4 py-2">{tx.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lot Modal */}
      <Modal
        isOpen={showLotModal}
        onClose={() => setShowLotModal(false)}
        title="Tambah Lot"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nomor Lot</label>
            <Input
              value={lotForm.lot_number}
              onChange={(e) => setLotForm({ ...lotForm, lot_number: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Tanggal Expiration</label>
            <Input
              type="date"
              value={lotForm.expiration_date}
              onChange={(e) => setLotForm({ ...lotForm, expiration_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Lot Stock</label>
            <Input
              type="number"
              value={lotForm.stock}
              onChange={(e) =>
                setLotForm({ ...lotForm, stock: parseInt(e.target.value) || 0 })
              }
              min="0"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowLotModal(false)}>
              Batal
            </Button>
            <Button onClick={handleAddLot}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Lot Modal */}
      <Modal
        isOpen={showEditLotModal}
        onClose={() => setShowEditLotModal(false)}
        title="Edit Lot"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nomor Lot</label>
            <Input
              value={lotForm.lot_number}
              onChange={(e) => setLotForm({ ...lotForm, lot_number: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Tanggal Expiration</label>
            <Input
              type="date"
              value={lotForm.expiration_date}
              onChange={(e) => setLotForm({ ...lotForm, expiration_date: e.target.value })}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditLotModal(false)}>
              Batal
            </Button>
            <Button onClick={handleEditLot}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={showEditItemModal}
        onClose={() => {
          setShowEditItemModal(false);
          setImageFile(null);
          setImagePreview('');
        }}
        title="Edit Barang"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nama Barang</label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Deskripsi</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Satuan</label>
              <Input
                value={editForm.unit}
                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Suhu</label>
              <Input
                value={editForm.temperature}
                onChange={(e) => setEditForm({ ...editForm, temperature: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Min Stock</label>
              <Input
                type="number"
                value={editForm.min_stock}
                onChange={(e) =>
                  setEditForm({ ...editForm, min_stock: parseInt(e.target.value) || 1 })
                }
                min="1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Gambar</label>
            <div className="mb-2">
              <div className="flex space-x-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setImageMode('url');
                    setImageFile(null);
                    setImagePreview('');
                    setEditForm({ ...editForm, image: '' });
                  }}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    imageMode === 'url'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageMode('upload');
                    setEditForm({ ...editForm, image: '' });
                  }}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    imageMode === 'upload'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Upload
                </button>
              </div>
            </div>
            {imageMode === 'url' ? (
              <Input
                type="url"
                value={editForm.image}
                onChange={(e) => setEditForm({ ...editForm, image: e.target.value })}
                placeholder="Masukkan URL gambar"
              />
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-full h-32 object-contain rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>
            )}
            {editForm.image && imageMode === 'url' && (
              <div className="mt-2">
                <img
                  src={editForm.image}
                  alt="Preview"
                  className="max-w-full h-32 object-contain rounded-lg border border-gray-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Supplier</label>
            <div className="border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto">
              {suppliers.map((supplier) => (
                <label key={supplier.id} className="flex items-center space-x-2 p-2">
                  <input
                    type="checkbox"
                    checked={editForm.suppliers.includes(supplier.id.toString())}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditForm({
                          ...editForm,
                          suppliers: [...editForm.suppliers, supplier.id.toString()],
                        });
                      } else {
                        setEditForm({
                          ...editForm,
                          suppliers: editForm.suppliers.filter((s) => s !== supplier.id.toString()),
                        });
                      }
                    }}
                  />
                  <span>{supplier.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditItemModal(false);
                setImageFile(null);
                setImagePreview('');
              }}
            >
              Batal
            </Button>
            <Button onClick={handleUpdateItem}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

