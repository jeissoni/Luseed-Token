import Card from "@/components/Card";
import MoneyAmount from "@/components/MoneyAmount";
import { useInvestorPortal } from "@/contexts/InvestorPortalContext";
import { formatCop, formatRate, formatDuration } from "@/hooks/useContractReads";

export default function InvestorDashboard() {
  const { address, protocol, notes, usdcBalance } = useInvestorPortal();

  const totalPrincipal = notes.reduce((sum, n) => sum + n.balance, 0n);
  const totalPendingYield = notes.reduce((sum, n) => sum + n.pendingYield, 0n);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Tu saldo disponible">
          <p className="text-2xl font-bold">{address ? formatCop(usdcBalance) : "—"}</p>
        </Card>
        <Card title="Capital invertido">
          <p className="text-2xl font-bold text-luseed-400">
            {address && notes.length > 0 ? formatCop(totalPrincipal) : address ? formatCop(0n) : "—"}
          </p>
        </Card>
        <Card title="Rendimiento pendiente">
          <p className="text-2xl font-bold text-luseed-400">
            {address ? <MoneyAmount amount={totalPendingYield} showUsd={false} /> : "—"}
          </p>
        </Card>
        <Card title="Inversiones activas">
          <p className="text-2xl font-bold">{address ? notes.length.toString() : "—"}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Tasa actual del fondo">
          <p className="text-2xl font-bold text-luseed-400">{formatRate(protocol.currentRate)}</p>
          <p className="text-xs text-gray-500 mt-1">anual, interés simple</p>
        </Card>
        <Card title="Plazo">
          <p className="text-2xl font-bold">{formatDuration(protocol.termDuration)}</p>
        </Card>
        <Card title="Total invertido en el fondo">
          <p className="text-2xl font-bold text-luseed-400">{formatCop(protocol.totalInvested)}</p>
        </Card>
      </div>

      {!address && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-gray-400 text-sm">
          Conecta tu wallet para ver tu cartera y realizar inversiones.
        </div>
      )}
    </div>
  );
}
