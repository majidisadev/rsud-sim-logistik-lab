import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useState } from 'react';
import { Menu } from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[110] focus:px-4 focus:py-2.5 focus:bg-white focus:text-primary focus:rounded-lg focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none transition-colors font-medium"
      >
        Langsung ke konten utama
      </a>
      <Sidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile menu button - bottom right */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-4 right-4 md:hidden z-50 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Buka menu navigasi"
      >
        <Menu className="w-6 h-6" aria-hidden="true" />
      </button>
    </div>
  );
}

