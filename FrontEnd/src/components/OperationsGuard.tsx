import { type ReactNode } from "react";
import { type Address } from "viem";
import { isOperator } from "@/config/access";

interface OperationsGuardProps {
  address: Address | null;
  children: ReactNode;
}

export default function OperationsGuard({ address, children }: OperationsGuardProps) {
  if (!address) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-6 text-yellow-400 text-sm">
        Conecta la wallet de operador para acceder a este panel.
      </div>
    );
  }

  if (!isOperator(address)) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-red-400 text-sm">
        No tienes permisos para acceder al portal de operaciones.
      </div>
    );
  }

  return <>{children}</>;
}
