import { Navigate } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin } = useAdmin();

  if (!isAdmin) {
    return <Navigate to="/admin-login" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
