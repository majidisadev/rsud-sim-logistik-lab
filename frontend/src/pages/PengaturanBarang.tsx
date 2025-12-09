import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Plus, Eye, Power } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

export default function PengaturanBarang() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category_id: '',
    unit: '',
    temperature: '',
    min_stock: 1,
    stock_awal: 0,
    expiration_date: '',
    image: '',
    suppliers: [] as string[],
  });
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchSuppliers();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/items?include_inactive=true');
      setItems(res.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
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
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setForm({ ...form, image: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    try {
      await api.post('/items', {
        ...form,
        image: form.image || undefined,
        category_id: form.category_id ? parseInt(form.category_id) : undefined,
        suppliers: form.suppliers
          .map((s) => parseInt(s))
          .filter((id) => !isNaN(id)),
      });
      setShowModal(false);
      setForm({
        name: '',
        description: '',
        category_id: '',
        unit: '',
        temperature: '',
        min_stock: 1,
        stock_awal: 0,
        expiration_date: '',
        image: '',
        suppliers: [],
      });
      setImageMode('url');
      setImageFile(null);
      setImagePreview('');
      fetchItems();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error creating item');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await api.patch(`/items/${id}/toggle-status`);
      fetchItems();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error toggling status');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pengaturan Barang</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Barang
        </Button>
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
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Expiration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Min Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Satuan
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.expiration_date
                        ? new Date(item.expiration_date).toLocaleDateString('id-ID')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.total_stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.min_stock}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.unit || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/barang/${item.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Detail
                        </Button>
                        {item.status === 'Active' ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleToggleStatus(item.id)}
                          >
                            <Power className="w-4 h-4 mr-1" />
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(item.id)}
                          >
                            <Power className="w-4 h-4 mr-1" />
                            Activate
                          </Button>
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

      {/* Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setForm({
            name: '',
            description: '',
            category_id: '',
            unit: '',
            temperature: '',
            min_stock: 1,
            stock_awal: 0,
            expiration_date: '',
            image: '',
            suppliers: [],
          });
          setImageMode('url');
          setImageFile(null);
          setImagePreview('');
        }}
        title="Tambah Barang"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Barang</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Deskripsi</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Kategori</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2"
              >
                <option value="">Pilih Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Satuan</label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Suhu</label>
              <Input
                value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Min Stock</label>
              <Input
                type="number"
                value={form.min_stock}
                onChange={(e) =>
                  setForm({ ...form, min_stock: parseInt(e.target.value) || 1 })
                }
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Stock Awal</label>
              <Input
                type="number"
                value={form.stock_awal}
                onChange={(e) =>
                  setForm({ ...form, stock_awal: parseInt(e.target.value) || 0 })
                }
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Expiration</label>
              <Input
                type="date"
                value={form.expiration_date}
                onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
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
                    setForm({ ...form, image: '' });
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
                    setForm({ ...form, image: '' });
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
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
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
            {form.image && imageMode === 'url' && (
              <div className="mt-2">
                <img
                  src={form.image}
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
                    checked={form.suppliers.includes(supplier.id.toString())}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({
                          ...form,
                          suppliers: [...form.suppliers, supplier.id.toString()],
                        });
                      } else {
                        setForm({
                          ...form,
                          suppliers: form.suppliers.filter((s) => s !== supplier.id.toString()),
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
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

