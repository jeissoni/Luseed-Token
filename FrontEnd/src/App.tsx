import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import RoleGuard from "@/components/RoleGuard";
import HomeRedirect from "@/components/HomeRedirect";
import InvestorLayout from "@/pages/investor/InvestorLayout";
import InvestorDashboard from "@/pages/investor/Dashboard";
import InvestorInvest from "@/pages/investor/Invest";
import InvestorPortfolio from "@/pages/investor/Portfolio";
import BuyLst from "@/pages/managers/BuyLst";
import Admin from "@/pages/Admin";
import Governance from "@/pages/Governance";
import NoAccess from "@/pages/NoAccess";
import { UserRolesProvider } from "@/contexts/UserRolesContext";
import { useWallet } from "@/hooks/useWallet";
import { BRAND_NAME } from "@/config/branding";

export default function App() {
  const { address, isConnecting, error, connect, disconnect } = useWallet();

  return (
    <UserRolesProvider address={address}>
      <div className="min-h-screen flex flex-col">
        <Navbar
          address={address}
          isConnecting={isConnecting}
          onConnect={connect}
          onDisconnect={disconnect}
        />

        {error && (
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4">
            <div className="bg-red-900/30 border border-red-800 text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          </div>
        )}

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/sin-acceso" element={<NoAccess />} />
            <Route
              path="/inversor"
              element={
                <RoleGuard role="investor">
                  <InvestorLayout address={address} />
                </RoleGuard>
              }
            >
              <Route path="resumen" element={<InvestorDashboard />} />
              <Route path="invertir" element={<InvestorInvest />} />
              <Route path="cartera" element={<InvestorPortfolio />} />
            </Route>
            <Route
              path="/managers"
              element={
                <RoleGuard role="manager">
                  <BuyLst address={address} />
                </RoleGuard>
              }
            />
            <Route
              path="/gobernanza"
              element={
                <RoleGuard role="manager">
                  <Governance address={address} />
                </RoleGuard>
              }
            />
            <Route
              path="/operaciones"
              element={
                <RoleGuard role="operator">
                  <Admin address={address} />
                </RoleGuard>
              }
            />
            {/* Rutas legacy */}
            <Route path="/admin" element={<Navigate to="/operaciones" replace />} />
            <Route path="/governance" element={<Navigate to="/gobernanza" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-gray-800 py-4 text-center text-xs text-gray-600">
          {BRAND_NAME} &mdash; Activos en Colombia &middot; Sepolia Testnet
        </footer>
      </div>
    </UserRolesProvider>
  );
}
