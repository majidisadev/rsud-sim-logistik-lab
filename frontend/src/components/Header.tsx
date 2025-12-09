import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { Package } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      Admin: 'Admin',
      'PJ Gudang': 'PJ Gudang',
      User: 'User',
    };
    return labels[role] || role;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">SIM Logistik Lab</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium">{user?.username}</span>
            <span className="text-xs text-gray-500">{getRoleLabel(user?.role || '')}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

