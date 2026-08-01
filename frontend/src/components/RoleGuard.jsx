import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../utils/authStore';

// Usage: <Route element={<RoleGuard allow={['admin','analyst']} />}> ... </Route>
// Note: hiding a button/route is a UX nicety only — the API enforces roles
// server-side regardless (see backend/src/middleware/authMiddleware.js).
const RoleGuard = ({ allow = [] }) => {
  const { user } = useAuthStore();

  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RoleGuard;
