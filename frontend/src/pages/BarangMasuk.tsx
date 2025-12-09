import { useEffect, useState } from "react";
import api from "../lib/api";
import { Plus, Edit, Trash2 } from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";

export default function BarangMasuk() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
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

  useEffect(() => {
    fetchTransactions();
    fetchItems();
  }, [filterItem, filterStartDate, filterEndDate]);

  useEffect(() => {
    if (form.item_id) {
      fetchItemDetails(parseInt(form.item_id));
    }
  }, [form.item_id]);

  const fetchTransactions = async () => {
    try {
      const params: any = { type: "Masuk" };
      if (filterItem) params.item_id = filterItem;
      if (filterStartDate) params.start_date = filterStartDate;
      if (filterEndDate) params.end_date = filterEndDate;

      const res = await api.get("/transactions", { params });
      setTransactions(res.data);
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
        lot_id: form.lot_id || undefined,
        lot_number: form.lot_id ? undefined : form.lot_number,
        expiration_date: form.expiration_date || undefined,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Barang Masuk</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Barang Masuk
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Barang</label>
            <select
              value={filterItem}
              onChange={(e) => setFilterItem(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2"
            >
              <option value="">Semua</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Tanggal Mulai
            </label>
            <Input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Tanggal Akhir
            </label>
            <Input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Waktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Barang
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Jumlah Masuk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Penerima
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Keterangan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.item_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.user_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.notes || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
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
                        {(user?.role === "Admin" ||
                          user?.role === "PJ Gudang") && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(tx.id)}
                          >
                            <Trash2 className="w-4 h-4" />
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
        onClose={() => setShowModal(false)}
        title="Tambah Barang Masuk"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Barang</label>
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
              <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
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
                      className="p-2 hover:bg-gray-100 cursor-pointer"
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
                <label className="block text-sm font-medium mb-2">Lot</label>
                <select
                  value={form.lot_id}
                  onChange={(e) => {
                    if (e.target.value === "new") {
                      setForm({ ...form, lot_id: "", lot_number: "" });
                    } else {
                      setForm({ ...form, lot_id: e.target.value });
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg p-2"
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
                        : "No expiration"}
                    </option>
                  ))}
                </select>
              </div>
              {(!form.lot_id || form.lot_id === "new") && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
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
                    <label className="block text-sm font-medium mb-2">
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
            <label className="block text-sm font-medium mb-2">
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
            <label className="block text-sm font-medium mb-2">
              Keterangan (max 25)
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
            <label className="block text-sm font-medium mb-2">
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
            <label className="block text-sm font-medium mb-2">
              Keterangan (max 25)
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
