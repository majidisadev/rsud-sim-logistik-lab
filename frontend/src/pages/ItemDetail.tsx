import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import anime from "animejs";
import api from "../lib/api";
import { ArrowLeft, Edit, Plus, Filter, X, Package } from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../contexts/AuthContext";

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
  const [lotForm, setLotForm] = useState({
    lot_number: "",
    expiration_date: "",
    stock: 0,
  });
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [transactionFilter, setTransactionFilter] = useState({
    type: "",
    start_date: "",
    end_date: "",
  });
  const [tempFilter, setTempFilter] = useState({
    type: "",
    start_date: "",
    end_date: "",
  });
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    category_id: "",
    unit: "",
    temperature: "",
    min_stock: 1,
    image: "",
    suppliers: [] as string[],
  });
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const pageRef = useRef<HTMLDivElement>(null);
  const headerCardRef = useRef<HTMLElement>(null);
  const lotsCardRef = useRef<HTMLElement>(null);
  const chartCardRef = useRef<HTMLElement>(null);
  const transactionCardRef = useRef<HTMLElement>(null);
  const lotRowRefs = useRef<HTMLTableRowElement[]>([]);
  const txRowRefs = useRef<HTMLTableRowElement[]>([]);

  useEffect(() => {
    if (id) {
      fetchItem();
      fetchTransactions();
      fetchMonthlyStats();
      fetchSuppliers();
      fetchCategories();
      setCurrentPage(1);
    }
  }, [id]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, transactionFilter]);

  // Entrance animations
  useEffect(() => {
    if (loading || !item) return;
    const targets = [
      { el: pageRef.current, delay: 0 },
      { el: headerCardRef.current, delay: 80 },
      { el: lotsCardRef.current, delay: 160 },
      { el: chartCardRef.current, delay: 240 },
      { el: transactionCardRef.current, delay: 320 },
    ];
    targets.forEach(({ el, delay }) => {
      if (!el) return;
      anime({
        targets: el,
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 450,
        delay,
        easing: "easeOutCubic",
      });
    });
  }, [loading, item]);

  // Stagger lot rows
  useEffect(() => {
    if (!item?.lots?.length || loading) return;
    lotRowRefs.current = lotRowRefs.current.slice(0, item.lots.length);
    const targets = lotRowRefs.current.filter(Boolean);
    if (targets.length === 0) return;
    anime({
      targets,
      opacity: [0, 1],
      translateX: [-12, 0],
      duration: 320,
      delay: anime.stagger(35, { start: 300 }),
      easing: "easeOutCubic",
    });
  }, [item?.lots, loading]);

  // Stagger transaction rows (runs when we have transaction data)
  useEffect(() => {
    if (loading || !item || txCount === 0) return;
    txRowRefs.current = txRowRefs.current.slice(0, txCount);
    const targets = txRowRefs.current.filter(Boolean);
    if (targets.length === 0) return;
    anime({
      targets,
      opacity: [0, 1],
      translateX: [-8, 0],
      duration: 280,
      delay: anime.stagger(25, { start: 400 }),
      easing: "easeOutCubic",
    });
  }, [loading, item, allTransactions.length, currentPage, itemsPerPage]);

  const fetchItem = async () => {
    try {
      const res = await api.get(`/items/${id}`);
      setItem(res.data);
    } catch (error) {
      console.error("Error fetching item:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (filter?: {
    type: string;
    start_date: string;
    end_date: string;
  }) => {
    try {
      const activeFilter = filter || transactionFilter;
      const params: any = { item_id: id };
      if (activeFilter.type) params.type = activeFilter.type;
      if (activeFilter.start_date) params.start_date = activeFilter.start_date;
      if (activeFilter.end_date) params.end_date = activeFilter.end_date;

      const res = await api.get("/transactions", { params });
      setAllTransactions(res.data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const handleApplyFilter = () => {
    setTransactionFilter({ ...tempFilter });
    fetchTransactions(tempFilter);
  };

  const handleResetFilter = () => {
    const emptyFilter = { type: "", start_date: "", end_date: "" };
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

      const res = await api.get("/transactions", {
        params: {
          item_id: id,
          start_date: startDate,
          end_date: endDate,
        },
      });

      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];
      const monthlyData = months.map((month, idx) => {
        const monthStr = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;

        // Filter transactions for this month
        const monthTransactions = res.data.filter((tx: any) => {
          const txDate = new Date(tx.created_at);
          const txMonth = `${txDate.getFullYear()}-${String(
            txDate.getMonth() + 1,
          ).padStart(2, "0")}`;
          return txMonth === monthStr;
        });

        // Sum quantities by type
        const masukTotal = monthTransactions
          .filter((tx: any) => tx.type === "Masuk")
          .reduce(
            (sum: number, tx: any) => sum + (parseInt(tx.quantity) || 0),
            0,
          );

        const keluarTotal = monthTransactions
          .filter((tx: any) => tx.type === "Keluar")
          .reduce(
            (sum: number, tx: any) => sum + (parseInt(tx.quantity) || 0),
            0,
          );

        return {
          month,
          Masuk: masukTotal,
          Keluar: keluarTotal,
        };
      });
      setMonthlyStats(monthlyData);
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
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

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      setCategories(res.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
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
        name: item.name || "",
        description: item.description || "",
        category_id: item.category_id?.toString() || "",
        unit: item.unit || "",
        temperature: item.temperature || "",
        min_stock: item.min_stock || 1,
        image: item.image || "",
        suppliers: item.suppliers?.map((s: any) => s.id.toString()) || [],
      });
      setImageMode(item.image ? "url" : "url");
      setImageFile(null);
      setImagePreview(item.image || "");
      setShowEditItemModal(true);
    }
  };

  const handleUpdateItem = async () => {
    try {
      let imageUrl = editForm.image;

      // If image file is uploaded, convert to base64
      if (imageFile && imageMode === "upload") {
        imageUrl = imagePreview;
      }

      const updateData: any = {
        name: editForm.name,
        description: editForm.description,
        category_id: editForm.category_id
          ? parseInt(editForm.category_id)
          : null,
        unit: editForm.unit,
        temperature: editForm.temperature,
        min_stock: parseInt(editForm.min_stock.toString()),
        image: imageUrl || null,
        suppliers: editForm.suppliers.map((s) => parseInt(s)),
      };

      await api.put(`/items/${id}`, updateData);
      setShowEditItemModal(false);
      setImageFile(null);
      setImagePreview("");
      fetchItem();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error updating item");
    }
  };

  const handleAddLot = async () => {
    try {
      await api.post(`/items/${id}/lots`, {
        ...lotForm,
        stock: parseInt(lotForm.stock.toString()),
      });
      setShowLotModal(false);
      setLotForm({ lot_number: "", expiration_date: "", stock: 0 });
      fetchItem();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error adding lot");
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
      setLotForm({ lot_number: "", expiration_date: "", stock: 0 });
      fetchItem();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error updating lot");
    }
  };

  const handleDeleteLot = async (lotId: number) => {
    if (!confirm("Hapus lot ini?")) return;
    try {
      await api.delete(`/items/${id}/lots/${lotId}`);
      fetchItem();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error deleting lot");
    }
  };

  const txStart = (currentPage - 1) * itemsPerPage;
  const txCount = Math.min(
    itemsPerPage,
    Math.max(0, allTransactions.length - txStart)
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in" role="status" aria-live="polite">
        <div className="h-10 w-32 rounded-lg bg-muted animate-pulse" />
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="h-48 md:h-64 bg-muted animate-pulse" />
          <div className="p-6 space-y-4">
            <div className="h-8 w-2/3 bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <p className="sr-only">Memuat detail barang...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-fade-in"
        role="alert"
      >
        <Package className="w-16 h-16 text-muted-foreground" aria-hidden />
        <h2 className="text-xl font-semibold">Barang tidak ditemukan</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Barang yang Anda cari mungkin telah dihapus atau ID tidak valid.
        </p>
        <Button variant="outline" onClick={() => navigate("/barang")}>
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden />
          Kembali ke Daftar Barang
        </Button>
      </div>
    );
  }

  const isExpired = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  // Calculate pagination
  const totalPages = Math.ceil(allTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = allTransactions.slice(startIndex, endIndex);

  return (
    <div ref={pageRef} className="space-y-6" role="main">
      <Button
        variant="outline"
        onClick={() => navigate("/barang")}
        aria-label="Kembali ke daftar barang"
        className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" aria-hidden />
        Kembali
      </Button>

      <article
        ref={headerCardRef}
        className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
      >
        <div className="p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                {item.name}
              </h1>
            </div>
            {(user?.role === "Admin" || user?.role === "PJ Gudang") && (
              <Button
                onClick={handleOpenEditModal}
                aria-label="Edit barang"
                className="shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Edit className="w-4 h-4 mr-2" aria-hidden />
                Edit Barang
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {item.image && (
              <figure className="rounded-xl overflow-hidden ring-1 ring-border/50">
                <img
                  src={item.image}
                  alt={`Gambar ${item.name}`}
                  className="w-full h-56 md:h-72 object-cover"
                  loading="eager"
                />
              </figure>
            )}
            <div className="space-y-5">
              <section aria-labelledby="desc-heading">
                <h2 id="desc-heading" className="sr-only">
                  Deskripsi
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {item.description || "Tidak ada deskripsi."}
                </p>
              </section>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Kategori</dt>
                  <dd className="font-medium mt-0.5">{item.category_name || "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Expiration</dt>
                  <dd
                    className={`font-medium mt-0.5 ${
                      item.expiration_date && isExpired(item.expiration_date)
                        ? "text-destructive"
                        : ""
                    }`}
                  >
                    {item.expiration_date
                      ? new Date(item.expiration_date).toLocaleDateString("id-ID")
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Stock</dt>
                  <dd className="font-medium mt-0.5">{item.total_stock}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Min Stock</dt>
                  <dd className="font-medium mt-0.5">{item.min_stock}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Satuan</dt>
                  <dd className="font-medium mt-0.5">{item.unit || "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Suhu</dt>
                  <dd className="font-medium mt-0.5">{item.temperature || "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Opname Terakhir</dt>
                  <dd className="font-medium mt-0.5">
                    {item.last_opname_date
                      ? new Date(item.last_opname_date).toLocaleDateString(
                          "id-ID",
                        )
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Supplier</dt>
                  <dd className="font-medium mt-0.5">
                    {item.suppliers?.map((s: any) => s.name).join(", ") || "-"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </article>

      {/* Lots Section */}
      {(user?.role === "Admin" ||
        user?.role === "PJ Gudang" ||
        user?.role === "User") && (
        <section
          ref={lotsCardRef}
          className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
          aria-labelledby="lots-heading"
        >
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 id="lots-heading" className="text-xl font-semibold">
                Nomor Lot
              </h2>
              <Button
                onClick={() => setShowLotModal(true)}
                aria-label="Tambah lot baru"
              >
                <Plus className="w-4 h-4 mr-2" aria-hidden />
                Tambah Lot
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full" role="table">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Nomor Lot
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Expiration
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Lot Stock
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {item.lots?.map((lot: any, idx: number) => (
                    <tr
                      key={lot.id}
                      ref={(el) => {
                        if (el) lotRowRefs.current[idx] = el;
                      }}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">{lot.lot_number}</td>
                      <td className="px-4 py-3">
                        {lot.expiration_date
                          ? new Date(lot.expiration_date).toLocaleDateString(
                              "id-ID",
                            )
                          : "-"}
                      </td>
                      <td className="px-4 py-3">{lot.stock}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedLot(lot);
                              setLotForm({
                                lot_number: lot.lot_number,
                                expiration_date: lot.expiration_date || "",
                                stock: lot.stock,
                              });
                              setShowEditLotModal(true);
                            }}
                            aria-label={`Edit lot ${lot.lot_number}`}
                          >
                            <Edit className="w-4 h-4" aria-hidden />
                          </Button>
                          {(user?.role === "Admin" ||
                            user?.role === "PJ Gudang") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteLot(lot.id)}
                              aria-label={`Hapus lot ${lot.lot_number}`}
                            >
                              <X className="w-4 h-4" aria-hidden />
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
        </section>
      )}

      {/* Monthly Chart */}
      <section
        ref={chartCardRef}
        className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
        aria-labelledby="chart-heading"
      >
        <div className="p-6">
          <h2 id="chart-heading" className="text-xl font-semibold mb-6">
            Grafik Stok Bulanan
          </h2>
          <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyStats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Masuk"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Barang Masuk"
              dot
            />
            <Line
              type="monotone"
              dataKey="Keluar"
              stroke="#ef4444"
              strokeWidth={2}
              name="Barang Keluar"
              dot
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </section>

      {/* Transaction History */}
      <section
        ref={transactionCardRef}
        className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
        aria-labelledby="transactions-heading"
      >
        <div className="p-6">
          <h2 id="transactions-heading" className="text-xl font-semibold mb-6">
            Riwayat Transaksi
          </h2>
          <div className="mb-6 flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="filter-type" className="text-sm font-medium">
                Tipe
              </label>
              <select
                id="filter-type"
                value={tempFilter.type}
                onChange={(e) => {
                  setTempFilter({ ...tempFilter, type: e.target.value });
                }}
                className="border border-input rounded-lg px-3 py-2 min-w-[150px] focus:ring-2 focus:ring-ring focus:border-transparent"
                aria-label="Filter tipe transaksi"
              >
                <option value="">Semua</option>
                <option value="Masuk">Masuk</option>
                <option value="Keluar">Keluar</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="filter-start" className="text-sm font-medium">
                Tanggal
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="filter-start"
                  type="date"
                  value={tempFilter.start_date}
                  onChange={(e) => {
                    setTempFilter({ ...tempFilter, start_date: e.target.value });
                  }}
                  placeholder="Tanggal Mulai"
                  className="min-w-[160px]"
                  aria-label="Tanggal mulai filter"
                />
                <span className="text-muted-foreground" aria-hidden>-</span>
                <Input
                  type="date"
                  value={tempFilter.end_date}
                  onChange={(e) => {
                    setTempFilter({ ...tempFilter, end_date: e.target.value });
                  }}
                  placeholder="Tanggal Akhir"
                  className="min-w-[160px]"
                  aria-label="Tanggal akhir filter"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApplyFilter} aria-label="Terapkan filter">
                <Filter className="w-4 h-4 mr-2" aria-hidden />
                Filter
              </Button>
              <Button variant="outline" onClick={handleResetFilter} aria-label="Reset filter">
                <X className="w-4 h-4 mr-2" aria-hidden />
                Reset
              </Button>
            </div>
            <div className="ml-auto flex flex-col gap-1">
              <label htmlFor="items-per-page" className="text-sm font-medium">
                Per halaman
              </label>
              <select
                id="items-per-page"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-input rounded-lg px-3 py-2 focus:ring-2 focus:ring-ring"
                aria-label="Jumlah item per halaman"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full" role="table">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">In/Out</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Tanggal</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Jumlah</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      Tidak ada data transaksi
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((tx, idx) => (
                    <tr
                      key={tx.id}
                      ref={(el) => {
                        if (el) txRowRefs.current[idx] = el;
                      }}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tx.type === "Masuk"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                          }`}
                          role="status"
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3">{tx.user_name}</td>
                      <td className="px-4 py-3 font-medium">{tx.quantity}</td>
                      <td className="px-4 py-3 text-muted-foreground">{tx.notes || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {allTransactions.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              Menampilkan {startIndex + 1} sampai{" "}
              {Math.min(endIndex, allTransactions.length)} dari{" "}
              {allTransactions.length} data
            </div>
              <nav className="flex items-center gap-2" aria-label="Navigasi halaman">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  aria-label="Halaman sebelumnya"
                >
                  Sebelumnya
                </Button>
                <span className="text-sm text-muted-foreground" aria-live="polite">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  aria-label="Halaman berikutnya"
                >
                  Selanjutnya
                </Button>
              </nav>
            </div>
          )}
        </div>
      </section>

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
              onChange={(e) =>
                setLotForm({ ...lotForm, lot_number: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Tanggal Expiration
            </label>
            <Input
              type="date"
              value={lotForm.expiration_date}
              onChange={(e) =>
                setLotForm({ ...lotForm, expiration_date: e.target.value })
              }
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
              onChange={(e) =>
                setLotForm({ ...lotForm, lot_number: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Tanggal Expiration
            </label>
            <Input
              type="date"
              value={lotForm.expiration_date}
              onChange={(e) =>
                setLotForm({ ...lotForm, expiration_date: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowEditLotModal(false)}
            >
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
          setImagePreview("");
        }}
        title="Edit Barang"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nama Barang
            </label>
            <Input
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Deskripsi</label>
            <textarea
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg p-2"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Kategori</label>
            <select
              value={editForm.category_id}
              onChange={(e) =>
                setEditForm({ ...editForm, category_id: e.target.value })
              }
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Satuan</label>
              <Input
                value={editForm.unit}
                onChange={(e) =>
                  setEditForm({ ...editForm, unit: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Suhu</label>
              <Input
                value={editForm.temperature}
                onChange={(e) =>
                  setEditForm({ ...editForm, temperature: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Min Stock
              </label>
              <Input
                type="number"
                value={editForm.min_stock}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    min_stock: parseInt(e.target.value) || 1,
                  })
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
                    setImageMode("url");
                    setImageFile(null);
                    setImagePreview("");
                    setEditForm({ ...editForm, image: "" });
                  }}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    imageMode === "url"
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageMode("upload");
                    setEditForm({ ...editForm, image: "" });
                  }}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    imageMode === "upload"
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Upload
                </button>
              </div>
            </div>
            {imageMode === "url" ? (
              <Input
                type="url"
                value={editForm.image}
                onChange={(e) =>
                  setEditForm({ ...editForm, image: e.target.value })
                }
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
            {editForm.image && imageMode === "url" && (
              <div className="mt-2">
                <img
                  src={editForm.image}
                  alt="Preview"
                  className="max-w-full h-32 object-contain rounded-lg border border-gray-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Supplier</label>
            <div className="border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto">
              {suppliers.map((supplier) => (
                <label
                  key={supplier.id}
                  className="flex items-center space-x-2 p-2"
                >
                  <input
                    type="checkbox"
                    checked={editForm.suppliers.includes(
                      supplier.id.toString(),
                    )}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEditForm({
                          ...editForm,
                          suppliers: [
                            ...editForm.suppliers,
                            supplier.id.toString(),
                          ],
                        });
                      } else {
                        setEditForm({
                          ...editForm,
                          suppliers: editForm.suppliers.filter(
                            (s) => s !== supplier.id.toString(),
                          ),
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
                setImagePreview("");
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
