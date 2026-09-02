import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated } from './auth';

export default function ProtectedRoute() {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/" replace />;
}
