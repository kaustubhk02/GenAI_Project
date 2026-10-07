import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from './Layout.jsx';

export default function ProtectedRoute() {
  const { user } = useAuth();
  return user ? <Layout /> : <Navigate to="/login" replace />;
}
