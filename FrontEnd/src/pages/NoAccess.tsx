import { Link } from "react-router-dom";
import { useUserRolesContext } from "@/contexts/UserRolesContext";
import { ROLE_LABELS } from "@/config/roles";
import TestUsdcFaucet from "@/components/TestUsdcFaucet";

export default function NoAccess() {
  const { address, roles, loading, defaultRoute } = useUserRolesContext();

  if (!address) {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-12">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Bienvenido</h1>
          <p className="text-gray-400 text-sm">
            Conecta tu wallet para acceder a tu portal según tu rol: inversor, socio o operador.
          </p>
        </div>
        <TestUsdcFaucet address={null} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 text-gray-400 text-sm animate-pulse">
        Verificando permisos de tu wallet...
      </div>
    );
  }

  if (roles.length > 0) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-12">
        <p className="text-gray-400 text-sm">Redirigiendo a tu portal...</p>
        <Link to={defaultRoute} className="text-luseed-400 hover:underline text-sm">
          Ir ahora
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 py-12">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Sin acceso</h1>
        <p className="text-gray-400 text-sm">
          La wallet conectada no tiene ningún rol asignado en el protocolo.
        </p>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 space-y-3 text-sm text-gray-400">
        <p>Para obtener acceso:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong className="text-gray-300">{ROLE_LABELS.investor}</strong>: completa KYC y pide whitelist en el
            contrato de notas.
          </li>
          <li>
            <strong className="text-gray-300">{ROLE_LABELS.manager}</strong>: solicita autorización KYC para tokens
            LST como socio del fondo.
          </li>
          <li>
            <strong className="text-gray-300">{ROLE_LABELS.operator}</strong>: contacta al equipo técnico si
            administras el protocolo.
          </li>
        </ul>
      </div>

      <p className="text-xs text-gray-600 text-center font-mono">{address}</p>

      <TestUsdcFaucet address={address} />
    </div>
  );
}
