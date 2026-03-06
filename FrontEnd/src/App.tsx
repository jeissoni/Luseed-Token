import { Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Investor from "@/pages/Investor";
import Admin from "@/pages/Admin";
import Governance from "@/pages/Governance";
import { useWallet } from "@/hooks/useWallet";

export default function App() {
  const { address, isConnecting, error, connect, disconnect } = useWallet();

  return (
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
          <Route path="/" element={<Investor address={address} />} />
          <Route path="/admin" element={<Admin address={address} />} />
          <Route path="/governance" element={<Governance address={address} />} />
        </Routes>
      </main>

      <footer className="border-t border-gray-800 py-4 text-center text-xs text-gray-600">
        Luseed Energy DAO &mdash; Sepolia Testnet
      </footer>
    </div>
  );
}
