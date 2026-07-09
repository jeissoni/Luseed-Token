import { Outlet } from "react-router-dom";
import { type Address } from "viem";
import StatusBadge from "@/components/StatusBadge";
import TabNav from "@/components/TabNav";
import TxBanner from "@/components/TxBanner";
import TestUsdcFaucet from "@/components/TestUsdcFaucet";
import { USD_TO_COP_RATE } from "@/config/branding";
import { InvestorPortalProvider, useInvestorPortal } from "@/contexts/InvestorPortalContext";

const INVESTOR_TABS = [
  { to: "/inversor/resumen", label: "Resumen", end: true },
  { to: "/inversor/invertir", label: "Invertir" },
  { to: "/inversor/cartera", label: "Mis inversiones" },
];

interface InvestorLayoutProps {
  address: Address | null;
}

function InvestorLayoutContent() {
  const { address, protocol, txStatus } = useInvestorPortal();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Portal del Inversor</h1>
        <StatusBadge active={protocol.investmentOpen} labelOn="Ventana abierta" labelOff="Ventana cerrada" />
      </div>

      <p className="text-sm text-gray-400">
        Montos en pesos colombianos (COP). Liquidación on-chain en USDC (1 USD ={" "}
        {USD_TO_COP_RATE.toLocaleString("es-CO")} COP). Activos en Colombia.
      </p>

      <TabNav tabs={INVESTOR_TABS} />
      <TestUsdcFaucet address={address} compact />
      <TxBanner message={txStatus} />
      <Outlet />
    </div>
  );
}

export default function InvestorLayout({ address }: InvestorLayoutProps) {
  return (
    <InvestorPortalProvider address={address}>
      <InvestorLayoutContent />
    </InvestorPortalProvider>
  );
}
