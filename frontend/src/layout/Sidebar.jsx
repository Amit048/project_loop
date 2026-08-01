import { NavLink } from 'react-router-dom';
import {
  FiGrid,
  FiInbox,
  FiTrendingUp,
  FiMessageSquare,
  FiFileText,
  FiTag,
  FiSettings,
} from 'react-icons/fi';
import useUiStore from '../store/uiStore';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: FiGrid },
  { to: '/inbox', label: 'Inbox', icon: FiInbox },
  { to: '/trends', label: 'Trends', icon: FiTrendingUp },
  { to: '/themes', label: 'Themes', icon: FiTag },
  { to: '/ask', label: 'Ask LOOP', icon: FiMessageSquare },
  { to: '/reports', label: 'Reports', icon: FiFileText },
  { to: '/settings', label: 'Settings', icon: FiSettings },
];

const Sidebar = () => {
  const { sidebarOpen, closeSidebar } = useUiStore();

  return (
    <>
      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800
          transform transition-transform duration-200 md:translate-x-0 md:static md:shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-800">
          <span className="text-2xl">🤖</span>
          <span className="text-white font-bold">Project LOOP</span>
        </div>

        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
                 ${isActive
                   ? 'bg-loop-purple/20 text-white border border-loop-purple/40'
                   : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
              }
            >
              <Icon className="text-lg" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;
