import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './utils/authStore';

import Login from './auth/Login';
import Signup from './auth/Signup';

import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layout/DashboardLayout';
import GlobalLoader from './components/GlobalLoader';

import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import Trends from './pages/Trends';
import ThemesList, { ThemeDetail } from './pages/Themes';
import AskLoop from './pages/AskLoop';
import ReportsList, { ReportDetail } from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  const { user, accessToken } = useAuthStore();
  const isAuthenticated = !!(user && accessToken);

  return (
    <>
      <GlobalLoader />
      <Routes>
      {/* -- Public auth routes -- */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Signup />}
      />

      {/* -- Protected app shell (Day 4 / Day 6) -- */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/inbox" element={<Inbox />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/themes" element={<ThemesList />} />
          <Route path="/themes/:id" element={<ThemeDetail />} />
          <Route path="/ask" element={<AskLoop />} />
          <Route path="/reports" element={<ReportsList />} />
          <Route path="/reports/:id" element={<ReportDetail />} />

          {/* Settings: viewable by everyone, edit actions gated inside the page itself */}
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />

      {/* 404 Fallback */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">404</div>
              <p className="text-slate-400">Page not found</p>
            </div>
          </div>
        }
      />
    </Routes>
    </>
  );
}

export default App;
