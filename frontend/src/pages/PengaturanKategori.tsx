import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

export default function PengaturanKategori() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [form, setForm] = useState({ name: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await api.post('/categories', form);
      setShowModal(false);
      setForm({ name: '' });
      fetchCategories();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error creating category');
    }
  };

  const handleEdit = async () => {
    try {
      await api.put(`/categories/${selectedCategory.id}`, form);
      setShowEditModal(false);
      setSelectedCategory(null);
      setForm({ name: '' });
      fetchCategories();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error updating category');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus kategori ini?')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting category');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pengaturan Kategori</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Kategori
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{category.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/pengaturan/kategori/${category.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Detail
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCategory(category);
                            setForm({ name: category.name });
                            setShowEditModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modals */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Tambah Kategori">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Kategori</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit}>Simpan</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Kategori"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Kategori</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Batal
            </Button>
            <Button onClick={handleEdit}>Simpan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

