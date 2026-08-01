import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../utils/authStore';

// Wrap any set of routes that require a logged-in user. Preserves the
// attempted location so we could redirect back after login if desired.
const ProtectedRoute = () => {
  const { user, accessToken } = useAuthStore();
  const location = useLocation();
  const isAuthenticated = !!(user && accessToken);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
