import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Plus, Eye, Power, Package, Inbox } from "lucide-react";
import anime from "animejs";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import RightSidePanel from "../components/ui/RightSidePanel";

export default function PengaturanBarang() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: "",
    unit: "",
    temperature: "",
    min_stock: 1,
    stock_awal: 0,
    expiration_date: "",
    image: "",
    suppliers: [] as string[],
  });
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (loading || items.length === 0 || !tableBodyRef.current) return;
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
  }, [loading, items]);

  const fetchItems = async () => {
    try {
      const res = await api.get("/items?include_inactive=true");
      setItems(res.data);
    } catch (error) {
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      setCategories(res.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
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
      await api.post("/items", {
        ...form,
        image: form.image || undefined,
        category_id: form.category_id ? parseInt(form.category_id) : undefined,
        suppliers: form.suppliers
          .map((s) => parseInt(s))
          .filter((id) => !isNaN(id)),
      });
      setShowPanel(false);
      setForm({
        name: "",
        description: "",
        category_id: "",
        unit: "",
        temperature: "",
        min_stock: 1,
        stock_awal: 0,
        expiration_date: "",
        image: "",
        suppliers: [],
      });
      setImageMode("url");
      setImageFile(null);
      setImagePreview("");
      fetchItems();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error creating item");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      category_id: "",
      unit: "",
      temperature: "",
      min_stock: 1,
      stock_awal: 0,
      expiration_date: "",
      image: "",
      suppliers: [],
    });
    setImageMode("url");
    setImageFile(null);
    setImagePreview("");
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await api.patch(`/items/${id}/toggle-status`);
      fetchItems();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error toggling status");
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
              Pengaturan Barang
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Kelola daftar barang, kategori, dan stok minimum.
            </p>
          </div>
          <Button
            onClick={() => setShowPanel(true)}
            className="shadow-sm"
            aria-label="Tambah barang baru"
          >
            <Plus className="w-4 h-4 mr-2" aria-hidden />
            Tambah Barang
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
                  Barang
                </th>
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
                  Expiration
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Stock
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Min Stock
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Satuan
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
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="text-sm">Memuat data...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <Inbox className="w-12 h-12 text-gray-300" aria-hidden />
                      <p className="text-sm font-medium">Belum ada barang</p>
                      <p className="text-sm">
                        Klik &quot;Tambah Barang&quot; untuk menambah data.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setShowPanel(true)}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Tambah Barang
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
                        <span className="font-medium text-gray-900">
                          {item.name}
                        </span>
                        {item.status === "Inactive" && (
                          <span
                            className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-md"
                            aria-label="Status non-aktif"
                          >
                            Non-Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {item.category_name || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {item.expiration_date
                        ? new Date(item.expiration_date).toLocaleDateString(
                            "id-ID",
                          )
                        : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {item.total_stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {item.min_stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {item.unit || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/barang/${item.id}`)}
                          aria-label={`Lihat detail ${item.name}`}
                        >
                          <Eye className="w-4 h-4 mr-1" aria-hidden />
                          Detail
                        </Button>
                        {item.status === "Active" ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleToggleStatus(item.id)}
                            aria-label={`Nonaktifkan ${item.name}`}
                          >
                            <Power className="w-4 h-4 mr-1" aria-hidden />
                            Nonaktifkan
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(item.id)}
                            aria-label={`Aktifkan ${item.name}`}
                          >
                            <Power className="w-4 h-4 mr-1" aria-hidden />
                            Aktifkan
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

      <RightSidePanel
        isOpen={showPanel}
        onClose={() => {
          setShowPanel(false);
          resetForm();
        }}
        title="Tambah Barang"
        width="xl"
        titleId="panel-tambah-barang"
      >
        <div className="space-y-5">
          <div>
            <label htmlFor="barang-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nama Barang <span className="text-red-500">*</span>
            </label>
            <Input
              id="barang-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Contoh: Alkohol 70%"
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="barang-desc" className="block text-sm font-medium text-gray-700 mb-1.5">
              Deskripsi
            </label>
            <textarea
              id="barang-desc"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              rows={3}
              placeholder="Deskripsi singkat barang"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="barang-kategori" className="block text-sm font-medium text-gray-700 mb-1.5">
                Kategori
              </label>
              <select
                id="barang-kategori"
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                aria-describedby="barang-kategori-desc"
              >
                <option value="">Pilih Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <span id="barang-kategori-desc" className="sr-only">Pilih satu kategori</span>
            </div>
            <div>
              <label htmlFor="barang-satuan" className="block text-sm font-medium text-gray-700 mb-1.5">
                Satuan
              </label>
              <Input
                id="barang-satuan"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="ml, pcs, box"
              />
            </div>
            <div>
              <label htmlFor="barang-suhu" className="block text-sm font-medium text-gray-700 mb-1.5">
                Suhu
              </label>
              <Input
                id="barang-suhu"
                value={form.temperature}
                onChange={(e) =>
                  setForm({ ...form, temperature: e.target.value })
                }
                placeholder="Contoh: 2-8°C"
              />
            </div>
            <div>
              <label htmlFor="barang-min-stock" className="block text-sm font-medium text-gray-700 mb-1.5">
                Min Stock
              </label>
              <Input
                id="barang-min-stock"
                type="number"
                value={form.min_stock}
                onChange={(e) =>
                  setForm({ ...form, min_stock: parseInt(e.target.value) || 1 })
                }
                min={1}
                aria-describedby="barang-min-stock-desc"
              />
              <span id="barang-min-stock-desc" className="sr-only">Minimum stok yang diizinkan</span>
            </div>
            <div>
              <label htmlFor="barang-stock-awal" className="block text-sm font-medium text-gray-700 mb-1.5">
                Stock Awal
              </label>
              <Input
                id="barang-stock-awal"
                type="number"
                value={form.stock_awal}
                onChange={(e) =>
                  setForm({
                    ...form,
                    stock_awal: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
              />
            </div>
            <div>
              <label htmlFor="barang-expiration" className="block text-sm font-medium text-gray-700 mb-1.5">
                Tanggal Kadaluarsa
              </label>
              <Input
                id="barang-expiration"
                type="date"
                value={form.expiration_date}
                onChange={(e) =>
                  setForm({ ...form, expiration_date: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Gambar</span>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  setImageMode("url");
                  setImageFile(null);
                  setImagePreview("");
                  setForm({ ...form, image: "" });
                }}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  imageMode === "url"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                aria-pressed={imageMode === "url"}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageMode("upload");
                  setForm({ ...form, image: "" });
                }}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  imageMode === "upload"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                aria-pressed={imageMode === "upload"}
              >
                Upload
              </button>
            </div>
            {imageMode === "url" ? (
              <Input
                type="url"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="https://..."
                aria-label="URL gambar"
              />
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700"
                  aria-label="Pilih file gambar"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview gambar"
                      className="max-w-full h-32 object-contain rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>
            )}
            {form.image && imageMode === "url" && (
              <div className="mt-2">
                <img
                  src={form.image}
                  alt="Preview dari URL"
                  className="max-w-full h-32 object-contain rounded-lg border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Supplier
            </label>
            <div
              className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50/50"
              role="group"
              aria-label="Pilih supplier"
            >
              {suppliers.map((supplier) => (
                <label
                  key={supplier.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-white cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.suppliers.includes(supplier.id.toString())}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({
                          ...form,
                          suppliers: [
                            ...form.suppliers,
                            supplier.id.toString(),
                          ],
                        });
                      } else {
                        setForm({
                          ...form,
                          suppliers: form.suppliers.filter(
                            (s) => s !== supplier.id.toString(),
                          ),
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                    aria-describedby={`supplier-${supplier.id}`}
                  />
                  <span id={`supplier-${supplier.id}`}>{supplier.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setShowPanel(false);
                resetForm();
              }}
            >
              Batal
            </Button>
            <Button onClick={handleSubmit}>Simpan</Button>
          </div>
        </div>
      </RightSidePanel>
    </div>
  );
}
