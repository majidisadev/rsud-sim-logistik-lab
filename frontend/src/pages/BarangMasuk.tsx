import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import anime from "animejs";
import api from "../lib/api";
import { Plus, Edit, Trash2, ArrowDownCircle, Package, Filter } from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";

export default function BarangMasuk() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [form, setForm] = useState({
    item_id: "",
    lot_id: "",
    lot_number: "",
    expiration_date: "",
    quantity: "",
    notes: "",
  });
  const [itemSearch, setItemSearch] = useState("");
  const [filterItem, setFilterItem] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [selectedItemDetails, setSelectedItemDetails] = useState<any>(null);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);

  const pageRef = useRef<HTMLDivElement>(null);
  const filterCardRef = useRef<HTMLDivElement>(null);
  const tableCardRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<HTMLTableRowElement[]>([]);

  useEffect(() => {
    fetchTransactions();
    fetchItems();
    setCurrentPage(1);
  }, [filterItem, filterStartDate, filterEndDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  useEffect(() => {
    if (form.item_id) {
      fetchItemDetails(parseInt(form.item_id));
    }
  }, [form.item_id]);

  // Entrance animations on mount
  useEffect(() => {
    if (!pageRef.current || !filterCardRef.current || !tableCardRef.current) return;
    anime({
      targets: pageRef.current,
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 500,
      easing: "easeOutCubic",
    });
    anime({
      targets: filterCardRef.current,
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 450,
      delay: 100,
      easing: "easeOutCubic",
    });
    anime({
      targets: tableCardRef.current,
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 450,
      delay: 180,
      easing: "easeOutCubic",
    });
  }, []);

  const fetchTransactions = async () => {
    try {
      const params: any = { type: "Masuk" };
      if (filterItem) params.item_id = filterItem;
      if (filterStartDate) params.start_date = filterStartDate;
      if (filterEndDate) params.end_date = filterEndDate;

      const res = await api.get("/transactions", { params });
      setAllTransactions(res.data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await api.get("/items?status=Active");
      setItems(res.data);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  const fetchItemDetails = async (itemId: number) => {
    try {
      const res = await api.get(`/items/${itemId}`);
      setSelectedItemDetails(res.data);
    } catch (error) {
      console.error("Error fetching item details:", error);
    }
  };

  const handleSubmit = async () => {
    try {
      await api.post("/transactions", {
        type: "Masuk",
        item_id: form.item_id,
        lot_id: form.lot_id && form.lot_id !== "new" ? form.lot_id : undefined,
        lot_number: form.lot_id === "new" ? form.lot_number : undefined,
        expiration_date:
          form.lot_id === "new" ? form.expiration_date || undefined : undefined,
        quantity: parseInt(form.quantity),
        notes: form.notes.substring(0, 25),
      });
      setShowModal(false);
      setForm({
        item_id: "",
        lot_id: "",
        lot_number: "",
        expiration_date: "",
        quantity: "",
        notes: "",
      });
      fetchTransactions();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error creating transaction");
    }
  };

  const handleEdit = async () => {
    try {
      await api.put(`/transactions/${selectedTransaction.id}`, {
        quantity: parseInt(form.quantity),
        notes: form.notes.substring(0, 25),
      });
      setShowEditModal(false);
      setSelectedTransaction(null);
      fetchTransactions();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error updating transaction");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      fetchTransactions();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error deleting transaction");
    }
  };

  const itemLots = selectedItemDetails?.lots || [];

  // Calculate pagination
  const totalPages = Math.ceil(allTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = allTransactions.slice(startIndex, endIndex);

  const totalMasuk = allTransactions.reduce((sum, tx) => sum + (tx.quantity || 0), 0);

  // Stagger rows when data loads
  useEffect(() => {
    if (loading || paginatedTransactions.length === 0) return;
    rowRefs.current = rowRefs.current.slice(0, paginatedTransactions.length);
    const targets = rowRefs.current.filter(Boolean);
    if (targets.length === 0) return;
    anime({
      targets,
      opacity: [0, 1],
      translateX: [-12, 0],
      duration: 360,
      delay: anime.stagger(40, { start: 100 }),
      easing: "easeOutCubic",
    });
  }, [loading, paginatedTransactions.length]);

  return (
    <div ref={pageRef} className="space-y-5" role="main" aria-label="Halaman Barang Masuk">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600" aria-hidden>
            <ArrowDownCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Barang Masuk</h1>
            <p className="text-sm text-gray-500 mt-0.5">Kelola transaksi barang masuk ke gudang</p>
          </div>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/25 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/30"
          aria-label="Tambah transaksi barang masuk baru"
        >
          <Plus className="w-4 h-4 mr-2" aria-hidden />
          Tambah Barang Masuk
        </Button>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-4 sm:p-5 rounded-xl bg-white border border-gray-100 shadow-sm">
          <div className="p-2 rounded-lg bg-emerald-50">
            <Package className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Transaksi</p>
            <p className="text-xl font-bold text-gray-900">{allTransactions.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 sm:p-5 rounded-xl bg-white border border-gray-100 shadow-sm">
          <div className="p-2 rounded-lg bg-blue-50">
            <ArrowDownCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Jumlah Masuk</p>
            <p className="text-xl font-bold text-gray-900">{totalMasuk.toLocaleString("id-ID")}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        ref={filterCardRef}
        className="p-4 sm:p-5 space-y-4 bg-white rounded-xl border border-gray-100 shadow-sm"
        role="search"
        aria-label="Filter transaksi barang masuk"
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" aria-hidden />
          <span className="text-sm font-medium text-gray-700">Filter</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="filter-item-masuk" className="block mb-2 text-sm font-medium text-gray-700">
              Barang
            </label>
            <select
              id="filter-item-masuk"
              value={filterItem}
              onChange={(e) => setFilterItem(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            >
              <option value="">Semua barang</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-start-masuk" className="block mb-2 text-sm font-medium text-gray-700">
              Tanggal Mulai
            </label>
            <Input
              id="filter-start-masuk"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="filter-end-masuk" className="block mb-2 text-sm font-medium text-gray-700">
              Tanggal Akhir
            </label>
            <Input
              id="filter-end-masuk"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="items-per-page-masuk" className="block mb-2 text-sm font-medium text-gray-700">
              Tampilan per halaman
            </label>
            <select
              id="items-per-page-masuk"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        ref={tableCardRef}
        className="overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm"
        role="region"
        aria-label="Tabel transaksi barang masuk"
      >
        <div className="overflow-x-auto">
          <table className="w-full" role="table" aria-label="Daftar transaksi barang masuk">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-xs font-semibold text-left text-gray-600 uppercase tracking-wider">
                  Waktu
                </th>
                <th scope="col" className="px-6 py-3.5 text-xs font-semibold text-left text-gray-600 uppercase tracking-wider">
                  Barang
                </th>
                <th scope="col" className="px-6 py-3.5 text-xs font-semibold text-left text-gray-600 uppercase tracking-wider">
                  Lot
                </th>
                <th scope="col" className="px-6 py-3.5 text-xs font-semibold text-left text-gray-600 uppercase tracking-wider">
                  Jumlah Masuk
                </th>
                <th scope="col" className="px-6 py-3.5 text-xs font-semibold text-left text-gray-600 uppercase tracking-wider">
                  Penerima
                </th>
                <th scope="col" className="px-6 py-3.5 text-xs font-semibold text-left text-gray-600 uppercase tracking-wider">
                  Keterangan
                </th>
                <th scope="col" className="px-6 py-3.5 text-xs font-semibold text-left text-gray-600 uppercase tracking-wider">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                      <td className="px-6 py-4"><div className="h-8 bg-gray-200 rounded w-20" /></td>
                    </tr>
                  ))}
                </>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center" role="status">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <Package className="w-12 h-12 text-gray-300" aria-hidden />
                      <p className="font-medium">Tidak ada data transaksi</p>
                      <p className="text-sm">Gunakan filter atau tambah transaksi baru</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    ref={(el) => { if (el) rowRefs.current[idx] = el; }}
                    className="hover:bg-emerald-50/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/barang/${tx.item_id}`)}
                        className="text-emerald-700 hover:text-emerald-800 hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded px-1 -mx-1 transition-colors"
                        aria-label={`Lihat detail ${tx.item_name}`}
                      >
                        {tx.item_name}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.lot_number || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-semibold text-sm">
                        {tx.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.user_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.notes || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {/* Show edit button only if user is Admin/PJ Gudang OR if user is User and owns the transaction */}
                        {(user?.role === "Admin" ||
                          user?.role === "PJ Gudang" ||
                          (user?.role === "User" &&
                            tx.user_id === user?.id)) && (
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label={`Edit transaksi ${tx.item_name}`}
                            onClick={() => {
                              setSelectedTransaction(tx);
                              setForm({
                                item_id: tx.item_id.toString(),
                                lot_id: tx.lot_id.toString(),
                                lot_number: "",
                                expiration_date: "",
                                quantity: tx.quantity.toString(),
                                notes: tx.notes || "",
                              });
                              setShowEditModal(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {(user?.role === "Admin" ||
                          user?.role === "PJ Gudang") && (
                          <Button
                            size="sm"
                            variant="destructive"
                            aria-label={`Hapus transaksi ${tx.item_name}`}
                            onClick={() => handleDelete(tx.id)}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden />
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
        {/* Pagination Controls */}
        {allTransactions.length > 0 && (
          <nav
            className="px-6 py-4 border-t border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            aria-label="Navigasi halaman"
          >
            <p className="text-sm text-gray-600" role="status">
              Menampilkan <span className="font-medium">{startIndex + 1}</span> sampai{" "}
              <span className="font-medium">{Math.min(endIndex, allTransactions.length)}</span> dari{" "}
              <span className="font-medium">{allTransactions.length}</span> data
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                aria-label="Halaman sebelumnya"
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-gray-600 px-3 py-1 bg-gray-50 rounded-lg font-medium" aria-current="page">
                {currentPage} / {totalPages}
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
            </div>
          </nav>
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Tambah Barang Masuk"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Barang</label>
            <Input
              type="text"
              placeholder="Ketik nama barang..."
              value={itemSearch}
              onChange={(e) => {
                setItemSearch(e.target.value);
                const found = items.find(
                  (i) => i.name.toLowerCase() === e.target.value.toLowerCase()
                );
                if (found) setForm({ ...form, item_id: found.id.toString() });
              }}
            />
            {itemSearch && (
              <div className="mt-2 overflow-y-auto border border-gray-200 rounded-lg max-h-40">
                {items
                  .filter((i) =>
                    i.name.toLowerCase().includes(itemSearch.toLowerCase())
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setForm({ ...form, item_id: item.id.toString() });
                        setItemSearch(item.name);
                      }}
                      className="p-2 cursor-pointer hover:bg-gray-100"
                    >
                      {item.name}
                    </div>
                  ))}
              </div>
            )}
          </div>
          {form.item_id && (
            <>
              <div>
                <label className="block mb-2 text-sm font-medium">Lot</label>
                <select
                  value={form.lot_id}
                  onChange={(e) => {
                    if (e.target.value === "new") {
                      setForm({
                        ...form,
                        lot_id: "new",
                        lot_number: "",
                        expiration_date: "",
                      });
                    } else {
                      setForm({
                        ...form,
                        lot_id: e.target.value,
                        lot_number: "",
                        expiration_date: "",
                      });
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Pilih Lot</option>
                  <option value="new">+Buat lot baru</option>
                  {itemLots.map((lot: any) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.lot_number} -{" "}
                      {lot.expiration_date
                        ? new Date(lot.expiration_date).toLocaleDateString(
                            "id-ID"
                          )
                        : "No expiration"}{" "}
                      (Stock: {lot.stock || 0})
                    </option>
                  ))}
                </select>
              </div>
              {form.lot_id === "new" && (
                <>
                  <div>
                    <label className="block mb-2 text-sm font-medium">
                      Nomor Lot
                    </label>
                    <Input
                      value={form.lot_number}
                      onChange={(e) =>
                        setForm({ ...form, lot_number: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium">
                      Tanggal Expiration
                    </label>
                    <Input
                      type="date"
                      value={form.expiration_date}
                      onChange={(e) =>
                        setForm({ ...form, expiration_date: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
            </>
          )}
          <div>
            <label className="block mb-2 text-sm font-medium">
              Jumlah Masuk
            </label>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              min="1"
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">
              Keterangan (max 25 karakter)
            </label>
            <Input
              value={form.notes}
              onChange={(e) =>
                setForm({ ...form, notes: e.target.value.substring(0, 25) })
              }
              maxLength={25}
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

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Barang Masuk"
      >
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">
              Jumlah Masuk
            </label>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              min="1"
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">
              Keterangan (max 25 karakter)
            </label>
            <Input
              value={form.notes}
              onChange={(e) =>
                setForm({ ...form, notes: e.target.value.substring(0, 25) })
              }
              maxLength={25}
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
