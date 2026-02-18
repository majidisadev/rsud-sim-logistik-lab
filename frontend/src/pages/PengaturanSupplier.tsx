import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Plus, Edit, Trash2, Eye, Truck, Inbox } from "lucide-react";
import anime from "animejs";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import RightSidePanel from "../components/ui/RightSidePanel";

export default function PengaturanSupplier() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cover_image: "",
  });
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (loading || suppliers.length === 0 || !tableBodyRef.current) return;
    const rows = tableBodyRef.current.querySelectorAll("tr");
    if (rows.length === 0) return;
    anime({
      targets: rows,
      opacity: [0, 1],
      translateX: [-12, 0],
      delay: anime.stagger(40, { start: 80 }),
      duration: 360,
      easing: "easeOutCubic",
    });
  }, [loading, suppliers]);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await api.post("/suppliers", form);
      setShowPanel(false);
      setForm({ name: "", email: "", phone: "", cover_image: "" });
      fetchSuppliers();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error creating supplier");
    }
  };

  const handleEdit = async () => {
    try {
      await api.put(`/suppliers/${selectedSupplier.id}`, form);
      setShowEditPanel(false);
      setSelectedSupplier(null);
      setForm({ name: "", email: "", phone: "", cover_image: "" });
      fetchSuppliers();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error updating supplier");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus supplier ini?")) return;
    try {
      await api.delete(`/suppliers/${id}`);
      fetchSuppliers();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error deleting supplier");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section aria-labelledby="page-title">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1
              id="page-title"
              className="text-2xl font-bold text-gray-900 tracking-tight"
            >
              Pengaturan Supplier
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Kelola data supplier dan kontak pemasok barang.
            </p>
          </div>
          <Button
            onClick={() => setShowPanel(true)}
            className="shadow-sm"
            aria-label="Tambah supplier baru"
          >
            <Plus className="w-4 h-4 mr-2" aria-hidden />
            Tambah Supplier
          </Button>
        </div>
      </section>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Supplier
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Telp
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody ref={tableBodyRef} className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="text-sm">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <Inbox className="w-12 h-12 text-gray-300" aria-hidden />
                      <p className="text-sm font-medium">Belum ada supplier</p>
                      <p className="text-sm">
                        Klik &quot;Tambah Supplier&quot; untuk menambah data.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setShowPanel(true)}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Tambah Supplier
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
                        <span className="font-medium text-gray-900">
                          {supplier.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {supplier.email || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {supplier.phone || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(`/pengaturan/supplier/${supplier.id}`)
                          }
                          aria-label={`Lihat detail ${supplier.name}`}
                        >
                          <Eye className="w-4 h-4 mr-1" aria-hidden />
                          Detail
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setForm({
                              name: supplier.name,
                              email: supplier.email || "",
                              phone: supplier.phone || "",
                              cover_image: supplier.cover_image || "",
                            });
                            setShowEditPanel(true);
                          }}
                          aria-label={`Edit ${supplier.name}`}
                        >
                          <Edit className="w-4 h-4 mr-1" aria-hidden />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(supplier.id)}
                          aria-label={`Hapus ${supplier.name}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" aria-hidden />
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

      <RightSidePanel
        isOpen={showPanel}
        onClose={() => setShowPanel(false)}
        title="Tambah Supplier"
        width="md"
        titleId="panel-tambah-supplier"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="supplier-name"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Nama Supplier <span className="text-red-500">*</span>
            </label>
            <Input
              id="supplier-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Nama perusahaan / pemasok"
              aria-required="true"
            />
          </div>
          <div>
            <label
              htmlFor="supplier-email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Email
            </label>
            <Input
              id="supplier-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@supplier.com"
            />
          </div>
          <div>
            <label
              htmlFor="supplier-phone"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Telp
            </label>
            <Input
              id="supplier-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowPanel(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit}>Simpan</Button>
          </div>
        </div>
      </RightSidePanel>

      <RightSidePanel
        isOpen={showEditPanel}
        onClose={() => {
          setShowEditPanel(false);
          setSelectedSupplier(null);
          setForm({ name: "", email: "", phone: "", cover_image: "" });
        }}
        title="Edit Supplier"
        width="md"
        titleId="panel-edit-supplier"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="supplier-edit-name"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Nama Supplier <span className="text-red-500">*</span>
            </label>
            <Input
              id="supplier-edit-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Nama perusahaan / pemasok"
              aria-required="true"
            />
          </div>
          <div>
            <label
              htmlFor="supplier-edit-email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Email
            </label>
            <Input
              id="supplier-edit-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@supplier.com"
            />
          </div>
          <div>
            <label
              htmlFor="supplier-edit-phone"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Telp
            </label>
            <Input
              id="supplier-edit-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditPanel(false);
                setSelectedSupplier(null);
              }}
            >
              Batal
            </Button>
            <Button onClick={handleEdit}>Simpan</Button>
          </div>
        </div>
      </RightSidePanel>
    </div>
  );
}
