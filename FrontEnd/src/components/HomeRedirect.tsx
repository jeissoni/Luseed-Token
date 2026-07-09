import { Navigate } from "react-router-dom";
import { useUserRolesContext } from "@/contexts/UserRolesContext";

export default function HomeRedirect() {
  const { address, loading, defaultRoute } = useUserRolesContext();

  if (!address) {
    return <Navigate to="/sin-acceso" replace />;
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm animate-pulse">
        Cargando tu portal...
      </div>
    );
  }

  return <Navigate to={defaultRoute} replace />;
}
