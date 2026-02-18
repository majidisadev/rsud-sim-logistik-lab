import { useEffect, useState, useRef } from "react";
import api from "../lib/api";
import { Plus, Edit, UserPlus, Inbox } from "lucide-react";
import anime from "animejs";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import RightSidePanel from "../components/ui/RightSidePanel";

export default function PengaturanAkun() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "User",
    status: "Active",
  });
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (loading || users.length === 0 || !tableBodyRef.current) return;
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
  }, [loading, users]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      const sortedUsers = [...res.data].sort((a, b) =>
        a.username.localeCompare(b.username),
      );
      setUsers(sortedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await api.post("/users", form);
      setShowPanel(false);
      setForm({ username: "", password: "", role: "User", status: "Active" });
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error creating user");
    }
  };

  const handleEdit = async () => {
    try {
      await api.put(`/users/${selectedUser.id}`, {
        username: form.username,
        role: form.role,
        status: form.status,
        password: form.password || undefined,
      });
      setShowEditPanel(false);
      setSelectedUser(null);
      setForm({ username: "", password: "", role: "User", status: "Active" });
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || "Error updating user");
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
              Pengaturan Akun
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Kelola pengguna, role, dan status akun sistem.
            </p>
          </div>
          <Button
            onClick={() => setShowPanel(true)}
            className="shadow-sm"
            aria-label="Tambah akun baru"
          >
            <Plus className="w-4 h-4 mr-2" aria-hidden />
            Tambah Akun
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
                  Username
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Role
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Status
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
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <Inbox className="w-12 h-12 text-gray-300" aria-hidden />
                      <p className="text-sm font-medium">Belum ada akun</p>
                      <p className="text-sm">
                        Klik &quot;Tambah Akun&quot; untuk menambah pengguna.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setShowPanel(true)}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Tambah Akun
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
                        <span className="font-medium text-gray-900">
                          {user.username}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {user.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md ${
                          user.status === "Active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                        role="status"
                        aria-label={`Status: ${user.status}`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(user);
                          setForm({
                            username: user.username,
                            password: "",
                            role: user.role,
                            status: user.status,
                          });
                          setShowEditPanel(true);
                        }}
                        aria-label={`Edit akun ${user.username}`}
                      >
                        <Edit className="w-4 h-4 mr-1" aria-hidden />
                        Edit
                      </Button>
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
        title="Tambah Akun"
        width="md"
        titleId="panel-tambah-akun"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="akun-username"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Username <span className="text-red-500">*</span>
            </label>
            <Input
              id="akun-username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              placeholder="Nama pengguna login"
              aria-required="true"
            />
          </div>
          <div>
            <label
              htmlFor="akun-password"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Password <span className="text-red-500">*</span>
            </label>
            <Input
              id="akun-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              placeholder="Minimal 6 karakter"
              aria-required="true"
            />
          </div>
          <div>
            <label
              htmlFor="akun-role"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Role
            </label>
            <select
              id="akun-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              aria-describedby="akun-role-desc"
            >
              <option value="Admin">Admin</option>
              <option value="PJ Gudang">PJ Gudang</option>
              <option value="User">User</option>
            </select>
            <span id="akun-role-desc" className="sr-only">
              Pilih peran pengguna
            </span>
          </div>
          <div>
            <label
              htmlFor="akun-status"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Status
            </label>
            <select
              id="akun-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
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
          setSelectedUser(null);
          setForm({ username: "", password: "", role: "User", status: "Active" });
        }}
        title="Edit Akun"
        width="md"
        titleId="panel-edit-akun"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="akun-edit-username"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Username <span className="text-red-500">*</span>
            </label>
            <Input
              id="akun-edit-username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              placeholder="Nama pengguna login"
              aria-required="true"
            />
          </div>
          <div>
            <label
              htmlFor="akun-edit-password"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Password Baru{" "}
              <span className="text-gray-500 font-normal">
                (kosongkan jika tidak diubah)
              </span>
            </label>
            <Input
              id="akun-edit-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label
              htmlFor="akun-edit-role"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Role
            </label>
            <select
              id="akun-edit-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="Admin">Admin</option>
              <option value="PJ Gudang">PJ Gudang</option>
              <option value="User">User</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="akun-edit-status"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Status
            </label>
            <select
              id="akun-edit-status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditPanel(false);
                setSelectedUser(null);
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
