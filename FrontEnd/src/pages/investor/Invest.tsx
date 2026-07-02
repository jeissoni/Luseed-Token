import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "@/components/Card";
import { useInvestorPortal } from "@/contexts/InvestorPortalContext";
import { formatCop } from "@/hooks/useContractReads";

export default function InvestorInvest() {
  const { address, protocol, busy, handleInvest } = useInvestorPortal();
  const [investAmount, setInvestAmount] = useState("");

  async function onSubmit() {
    await handleInvest(investAmount);
    setInvestAmount("");
  }

  return (
    <Card title="Nueva inversión">
      {!address ? (
        <p className="text-gray-500">Conecta tu wallet para invertir.</p>
      ) : !protocol.investmentOpen ? (
        <div className="space-y-2">
          <p className="text-gray-500">La ventana de inversión está cerrada.</p>
          <p className="text-xs text-gray-600">
            Vuelve al{" "}
            <Link to="/inversor/resumen" className="text-luseed-400 hover:underline">
              resumen
            </Link>{" "}
            para consultar el estado del fondo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Inversión mínima: <span className="text-white font-medium">{formatCop(protocol.minInvestment)}</span>
          </p>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-400 mb-1">Monto (COP)</label>
              <input
                type="number"
                value={investAmount}
                onChange={(e) => setInvestAmount(e.target.value)}
                placeholder={`Mínimo ${formatCop(protocol.minInvestment)}`}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
              />
            </div>
            <button
              onClick={onSubmit}
              disabled={busy || !investAmount}
              className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Invertir
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
