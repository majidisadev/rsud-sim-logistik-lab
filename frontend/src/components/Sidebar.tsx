import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  FileText,
  ClipboardList,
  Users,
  Truck,
  Tag,
  Box,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ open, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Admin', 'PJ Gudang', 'User'] },
    { path: '/barang', icon: Package, label: 'Semua Barang', roles: ['Admin', 'PJ Gudang', 'User'] },
    { path: '/barang-masuk', icon: ArrowDownCircle, label: 'Barang Masuk', roles: ['Admin', 'PJ Gudang', 'User'] },
    { path: '/barang-keluar', icon: ArrowUpCircle, label: 'Barang Keluar', roles: ['Admin', 'PJ Gudang', 'User'] },
    { path: '/stock-opname', icon: ClipboardList, label: 'Stock Opname', roles: ['Admin', 'PJ Gudang'] },
    { path: '/laporan', icon: FileText, label: 'Laporan', roles: ['Admin', 'PJ Gudang'] },
  ];

  const settingsItems = [
    { path: '/pengaturan/barang', icon: Box, label: 'Pengaturan Barang', roles: ['Admin'] },
    { path: '/pengaturan/kategori', icon: Tag, label: 'Pengaturan Kategori', roles: ['Admin'] },
    { path: '/pengaturan/supplier', icon: Truck, label: 'Pengaturan Supplier', roles: ['Admin'] },
    { path: '/pengaturan/akun', icon: Users, label: 'Pengaturan Akun', roles: ['Admin'] },
  ];

  const filteredMenuItems = menuItems.filter((item) => item.roles.includes(user?.role || ''));
  const filteredSettingsItems = settingsItems.filter((item) => item.roles.includes(user?.role || ''));

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'w-16 md:w-16' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Collapse button and close button */}
          <div className={cn(
            "flex items-center border-b border-gray-200",
            collapsed ? "justify-center p-4" : "justify-between p-4"
          )}>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden md:flex p-1 hover:bg-gray-100 rounded transition-colors"
                title={collapsed ? 'Expand' : 'Collapse'}
              >
                {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="md:hidden p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={cn(
                    'flex items-center px-3 py-2 rounded-lg transition-colors',
                    collapsed ? 'justify-center' : 'space-x-3',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}

            {filteredSettingsItems.length > 0 && (
              <>
                {!collapsed && (
                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Pengaturan
                    </div>
                  </div>
                )}
                {collapsed && <div className="pt-4 mt-4 border-t border-gray-200" />}
                {filteredSettingsItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={cn(
                        'flex items-center px-3 py-2 rounded-lg transition-colors',
                        collapsed ? 'justify-center' : 'space-x-3',
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}

