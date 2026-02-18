import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Plus, Edit, Trash2, Eye, FolderTree, Inbox } from "lucide-react";
import anime from "animejs";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import RightSidePanel from "../components/ui/RightSidePanel";

export default function PengaturanKategori() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [form, setForm] = useState({ name: "" });
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (loading || categories.length === 0 || !tableBodyRef.current) return;
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
  }, [loading, categories]);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      setCategories(res.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await api.post("/categories", form);
      setShowPanel(false);
      setForm({ name: "" });
      fetchCategories();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error creating category");
    }
  };

  const handleEdit = async () => {
    try {
      await api.put(`/categories/${selectedCategory.id}`, form);
      setShowEditPanel(false);
      setSelectedCategory(null);
      setForm({ name: "" });
      fetchCategories();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error updating category");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus kategori ini?")) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error deleting category");
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
              Pengaturan Kategori
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Kelola kategori barang untuk pengelompokan inventori.
            </p>
          </div>
          <Button
            onClick={() => setShowPanel(true)}
            className="shadow-sm"
            aria-label="Tambah kategori baru"
          >
            <Plus className="w-4 h-4 mr-2" aria-hidden />
            Tambah Kategori
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
                  Kategori
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
                  <td colSpan={2} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="text-sm">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <Inbox className="w-12 h-12 text-gray-300" aria-hidden />
                      <p className="text-sm font-medium">Belum ada kategori</p>
                      <p className="text-sm">
                        Klik &quot;Tambah Kategori&quot; untuk menambah data.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setShowPanel(true)}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Tambah Kategori
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr
                    key={category.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FolderTree className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
                        <span className="font-medium text-gray-900">
                          {category.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(`/pengaturan/kategori/${category.id}`)
                          }
                          aria-label={`Lihat detail ${category.name}`}
                        >
                          <Eye className="w-4 h-4 mr-1" aria-hidden />
                          Detail
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCategory(category);
                            setForm({ name: category.name });
                            setShowEditPanel(true);
                          }}
                          aria-label={`Edit ${category.name}`}
                        >
                          <Edit className="w-4 h-4 mr-1" aria-hidden />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(category.id)}
                          aria-label={`Hapus ${category.name}`}
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
        title="Tambah Kategori"
        width="sm"
        titleId="panel-tambah-kategori"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="kategori-name"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Nama Kategori <span className="text-red-500">*</span>
            </label>
            <Input
              id="kategori-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Contoh: Bahan Kimia"
              aria-required="true"
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
          setSelectedCategory(null);
          setForm({ name: "" });
        }}
        title="Edit Kategori"
        width="sm"
        titleId="panel-edit-kategori"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="kategori-edit-name"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Nama Kategori <span className="text-red-500">*</span>
            </label>
            <Input
              id="kategori-edit-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Contoh: Bahan Kimia"
              aria-required="true"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditPanel(false);
                setSelectedCategory(null);
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
