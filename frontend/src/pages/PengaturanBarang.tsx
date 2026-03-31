import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Plus, Eye, Power, Package, Inbox } from "lucide-react";
import anime from "animejs";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Dialog from "../components/ui/Dialog";
import { useToast } from "../components/ui/toast";
import { useConfirmDialog } from "../components/ui/confirm-dialog";
import { getErrorMessage } from "../lib/getErrorMessage";
import { usePrefersReducedMotion } from "../lib/hooks/usePrefersReducedMotion";

export default function PengaturanBarang() {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const reduceMotion = usePrefersReducedMotion();
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
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const addNameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
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
  }, [loading, items, reduceMotion]);

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

  const handleDownloadTemplate = () => {
    // Template sesuai requirement import:
    // - nama barang
    // - stock
    void (async () => {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet([["nama barang", "stock"]]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, "template-import-barang.xlsx");
    })();
  };

  const normalizeHeader = (value: any) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\s+/g, " ");

  const normalizeName = (value: any) =>
    String(value || "").trim().toLowerCase();

  const handleImportExcel = async () => {
    if (!importFile) {
      toast({
        variant: "error",
        title: "Pilih file terlebih dahulu",
        description: "Silakan pilih file Excel sebelum melakukan import.",
      });
      return;
    }

    try {
      setImporting(true);

      const buffer = await importFile.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "array" });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        toast({
          variant: "error",
          title: "File tidak valid",
          description: "File Excel tidak memiliki sheet.",
        });
        return;
      }

      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
      }) as any[][];

      if (!rows || rows.length < 2) {
        toast({
          variant: "error",
          title: "Format Excel tidak valid",
          description: "Excel harus memiliki header dan minimal 1 baris data.",
        });
        return;
      }

      const headerRow = (rows[0] || []).map(normalizeHeader);
      const nameColIndex = headerRow.findIndex((h) => h === "nama barang");
      const stockColIndex = headerRow.findIndex((h) => h === "stock");

      if (nameColIndex === -1 || stockColIndex === -1) {
        toast({
          variant: "error",
          title: "Header Excel tidak sesuai",
          description: "Kolom wajib: nama barang dan stock.",
        });
        return;
      }

      const existingNames = new Set(
        items.map((i) => normalizeName(i?.name)).filter(Boolean),
      );

      const fileErrors: string[] = [];
      const payload: Array<{ row: number; name: string; stock: number }> = [];
      const byNameInFile = new Map<string, number>(); // normalizedName -> rowExcelNumber

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const rowExcelNumber = r + 1; // 1-based including header row

        const rawName = row?.[nameColIndex];
        const rawStock = row?.[stockColIndex];

        const name =
          typeof rawName === "string" ? rawName.trim() : String(rawName || "").trim();
        const stockRawString =
          typeof rawStock === "string" ? rawStock.trim() : String(rawStock ?? "").trim();

        const rowIsEmpty =
          (!name && !stockRawString) || (name === "" && stockRawString === "");

        if (rowIsEmpty) continue;

        if (!name) {
          fileErrors.push(`Baris ${rowExcelNumber}: nama barang wajib diisi`);
          continue;
        }

        if (!stockRawString) {
          fileErrors.push(`Baris ${rowExcelNumber}: stock wajib diisi`);
          continue;
        }

        const stockNumber = parseFloat(stockRawString.replace(",", "."));
        if (!Number.isFinite(stockNumber)) {
          fileErrors.push(`Baris ${rowExcelNumber}: stock harus berupa angka`);
          continue;
        }

        if (stockNumber < 0) {
          fileErrors.push(`Baris ${rowExcelNumber}: stock tidak boleh negatif`);
          continue;
        }

        if (!Number.isInteger(stockNumber)) {
          fileErrors.push(`Baris ${rowExcelNumber}: stock harus bilangan bulat`);
          continue;
        }

        const normalized = normalizeName(name);
        const firstRow = byNameInFile.get(normalized);
        if (firstRow !== undefined) {
          fileErrors.push(
            `Duplikasi dalam file: "${name}" (baris ${firstRow} dan ${rowExcelNumber})`
          );
          continue;
        }

        byNameInFile.set(normalized, rowExcelNumber);
        payload.push({ row: rowExcelNumber, name, stock: stockNumber });
      }

      if (fileErrors.length > 0) {
        toast({
          variant: "error",
          title: "Periksa data Excel",
          description: fileErrors.slice(0, 3).join(" • ") + (fileErrors.length > 3 ? ` • (+${fileErrors.length - 3} lainnya)` : ""),
          durationMs: 7000,
        });
        return;
      }

      // Validate duplicates against existing items (case-insensitive)
      const dupErrors: string[] = [];
      for (const item of payload) {
        const normalized = normalizeName(item.name);
        if (existingNames.has(normalized)) {
          dupErrors.push(
            `Nama barang sudah ada: "${item.name}" (baris ${item.row})`
          );
        }
      }

      if (dupErrors.length > 0) {
        toast({
          variant: "error",
          title: "Duplikasi dengan data yang sudah ada",
          description: dupErrors.slice(0, 3).join(" • ") + (dupErrors.length > 3 ? ` • (+${dupErrors.length - 3} lainnya)` : ""),
          durationMs: 7000,
        });
        return;
      }

      const res = await api.post("/items/import", { items: payload });
      toast({
        variant: "success",
        title: res.data?.message || "Import berhasil",
        description: `${res.data?.imported ?? payload.length} barang ditambahkan.`,
      });

      await fetchItems();

      setImportFile(null);
      if (importFileRef.current) importFileRef.current.value = "";
    } catch (error: any) {
      toast({
        variant: "error",
        title: "Gagal import Excel",
        description: getErrorMessage(error, "Gagal mengimport Excel."),
      });
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async () => {
    const normalizedName = form.name.trim().toLowerCase();
    if (!normalizedName) {
      toast({ variant: "error", title: "Nama barang wajib diisi" });
      addNameInputRef.current?.focus();
      return;
    }

    // Client-side duplicate check (server tetap validasi juga)
    const isDuplicate = items.some((i) => {
      const itemName = (i?.name || "").trim().toLowerCase();
      return itemName === normalizedName;
    });
    if (isDuplicate) {
      toast({ variant: "error", title: "Nama barang sudah ada" });
      addNameInputRef.current?.focus();
      return;
    }

    try {
      await api.post("/items", {
        ...form,
        name: form.name.trim(),
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
      fetchItems();
      toast({ variant: "success", title: "Barang berhasil ditambahkan" });
    } catch (error: any) {
      toast({
        variant: "error",
        title: "Gagal menambahkan barang",
        description: getErrorMessage(error, "Error creating item"),
      });
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
  };

  const handleToggleStatus = async (id: number) => {
    try {
      const ok = await confirm({
        title: "Ubah status barang?",
        description: "Barang akan diaktifkan/nonaktifkan. Anda bisa mengubahnya lagi nanti.",
        confirmText: "Ya, ubah status",
        cancelText: "Batal",
        variant: "destructive",
      });
      if (!ok) return;
      await api.patch(`/items/${id}/toggle-status`);
      fetchItems();
      toast({ variant: "success", title: "Status barang diperbarui" });
    } catch (error: any) {
      toast({
        variant: "error",
        title: "Gagal memperbarui status",
        description: getErrorMessage(error, "Error toggling status"),
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {dialog}
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={importing || loading}
              aria-label="Download template Excel"
            >
              Download Template Excel
            </Button>

            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                setImportFile(e.target.files?.[0] || null);
              }}
              aria-label="Pilih file Excel"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => importFileRef.current?.click()}
              disabled={importing || loading}
              aria-label="Pilih file Excel untuk import"
            >
              Pilih Excel
            </Button>

            <Button
              size="sm"
              onClick={handleImportExcel}
              disabled={!importFile || importing || loading}
              aria-label="Import Excel"
            >
              {importing ? "Mengimpor..." : "Import"}
            </Button>

            <Button
              onClick={() => setShowPanel(true)}
              className="shadow-sm"
              aria-label="Tambah barang baru"
            >
              <Plus className="w-4 h-4 mr-2" aria-hidden />
              Tambah Barang
            </Button>
          </div>
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
                        <Link
                          to={`/barang/${item.id}`}
                          aria-label={`Lihat detail ${item.name}`}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <Eye className="w-4 h-4" aria-hidden />
                        </Link>
                        {item.status === "Active" ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleToggleStatus(item.id)}
                            aria-label={`Nonaktifkan ${item.name}`}
                          >
                            <Power className="w-4 h-4" aria-hidden />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(item.id)}
                            aria-label={`Aktifkan ${item.name}`}
                          >
                            <Power className="w-4 h-4" aria-hidden />
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

      <Dialog
        open={showPanel}
        onClose={() => {
          setShowPanel(false);
          resetForm();
        }}
        title="Tambah Barang"
        titleId="panel-tambah-barang"
        size="xl"
      >
        <div className="space-y-5">
          <div>
            <label htmlFor="barang-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Nama Barang <span className="text-red-500">*</span>
            </label>
            <Input
              id="barang-name"
              name="item_name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Contoh: Alkohol 70%"
              aria-required="true"
              autoComplete="off"
              ref={addNameInputRef}
              data-autofocus
            />
          </div>
          <div>
            <label htmlFor="barang-desc" className="block text-sm font-medium text-gray-700 mb-1.5">
              Deskripsi
            </label>
            <textarea
              id="barang-desc"
              name="item_description"
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
                name="category_id"
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
                name="unit"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="ml, pcs, box"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="barang-suhu" className="block text-sm font-medium text-gray-700 mb-1.5">
                Suhu
              </label>
              <Input
                id="barang-suhu"
                name="temperature"
                value={form.temperature}
                onChange={(e) =>
                  setForm({ ...form, temperature: e.target.value })
                }
                placeholder="Contoh: 2-8°C"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="barang-min-stock" className="block text-sm font-medium text-gray-700 mb-1.5">
                Min Stock
              </label>
              <Input
                id="barang-min-stock"
                type="number"
                name="min_stock"
                value={form.min_stock}
                onChange={(e) =>
                  setForm({ ...form, min_stock: parseInt(e.target.value) || 1 })
                }
                min={1}
                aria-describedby="barang-min-stock-desc"
                inputMode="numeric"
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
                name="stock_awal"
                value={form.stock_awal}
                onChange={(e) =>
                  setForm({
                    ...form,
                    stock_awal: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
                inputMode="numeric"
              />
            </div>
            <div>
              <label htmlFor="barang-expiration" className="block text-sm font-medium text-gray-700 mb-1.5">
                Tanggal Kadaluarsa
              </label>
              <Input
                id="barang-expiration"
                type="date"
                name="expiration_date"
                value={form.expiration_date}
                onChange={(e) =>
                  setForm({ ...form, expiration_date: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Gambar</span>
            <Input
              type="url"
              name="image_url"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://..."
              aria-label="URL gambar"
              autoComplete="off"
            />
            {form.image && (
              <div className="mt-2">
                <img
                  src={form.image}
                  alt="Preview dari URL"
                  className="max-w-full h-32 object-contain rounded-lg border border-gray-200"
                  width={512}
                  height={256}
                  loading="lazy"
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
      </Dialog>
    </div>
  );
}
