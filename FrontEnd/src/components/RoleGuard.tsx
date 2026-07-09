import { type ReactNode } from "react";
import { ROLE_LABELS, type UserRole } from "@/config/roles";
import { useUserRolesContext } from "@/contexts/UserRolesContext";

interface RoleGuardProps {
  role: UserRole;
  children: ReactNode;
}

export default function RoleGuard({ role, children }: RoleGuardProps) {
  const { address, hasRole, loading } = useUserRolesContext();

  if (!address) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-6 text-yellow-400 text-sm">
        Conecta tu wallet para acceder al portal de {ROLE_LABELS[role].toLowerCase()}.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 text-gray-400 text-sm animate-pulse">
        Verificando permisos...
      </div>
    );
  }

  if (!hasRole(role)) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 space-y-2">
        <p className="text-red-400 font-medium">Acceso restringido</p>
        <p className="text-red-300/80 text-sm">
          Tu wallet no tiene permisos de <strong>{ROLE_LABELS[role]}</strong>.
          {role === "investor" && " Completa el KYC con el operador del fondo para invertir."}
          {role === "manager" && " Solo socios autorizados (KYC) pueden acceder a este portal."}
          {role === "operator" && " Solo wallets de operador configuradas pueden acceder."}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
