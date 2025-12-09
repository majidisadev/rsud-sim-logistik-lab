import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

export default function PengaturanSupplier() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', cover_image: '' });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await api.post('/suppliers', form);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', cover_image: '' });
      fetchSuppliers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error creating supplier');
    }
  };

  const handleEdit = async () => {
    try {
      await api.put(`/suppliers/${selectedSupplier.id}`, form);
      setShowEditModal(false);
      setSelectedSupplier(null);
      setForm({ name: '', email: '', phone: '', cover_image: '' });
      fetchSuppliers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error updating supplier');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus supplier ini?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      fetchSuppliers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting supplier');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pengaturan Supplier</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Supplier
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Telp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Aksi
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
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{supplier.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{supplier.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{supplier.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/pengaturan/supplier/${supplier.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Detail
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setForm({
                              name: supplier.name,
                              email: supplier.email || '',
                              phone: supplier.phone || '',
                              cover_image: supplier.cover_image || '',
                            });
                            setShowEditModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(supplier.id)}
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
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Tambah Supplier">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Supplier</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Telp</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
        title="Edit Supplier"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Supplier</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Telp</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
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

