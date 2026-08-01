import { Outlet, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiMenu, FiLogOut } from 'react-icons/fi';
import useAuthStore from '../utils/authStore';
import useUiStore from '../store/uiStore';
import Sidebar from './Sidebar';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUiStore();

  const handleLogout = async () => {
    await logout();
    toast.success('👋 Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
          <button className="md:hidden text-slate-300 text-xl" onClick={toggleSidebar}>
            <FiMenu />
          </button>

          <div className="hidden md:block text-slate-400 text-sm">
            Workspace overview
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm hidden sm:inline">
              👤 {user?.name}
              <span className="ml-2 px-2 py-0.5 bg-loop-purple/20 text-loop-purple text-xs rounded-full border border-loop-purple/40 capitalize">
                {user?.role}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition"
            >
              <FiLogOut /> Logout
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
