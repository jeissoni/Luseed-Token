import { NavLink } from "react-router-dom";
import { type Address } from "viem";

interface NavbarProps {
  address: Address | null;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

function shortenAddress(addr: Address): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function Navbar({ address, isConnecting, onConnect, onDisconnect }: NavbarProps) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-luseed-600 text-white"
        : "text-gray-400 hover:text-white hover:bg-gray-800"
    }`;

  return (
    <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-luseed-400">Luseed</span>
            <span className="text-sm text-gray-500">Energy DAO</span>
          </div>

          <div className="flex items-center gap-1">
            <NavLink to="/" className={linkClass}>
              Inversiones
            </NavLink>
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
            <NavLink to="/governance" className={linkClass}>
              Gobernanza
            </NavLink>
          </div>

          <div>
            {address ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-luseed-400 font-mono bg-gray-800 px-3 py-1.5 rounded-lg">
                  {shortenAddress(address)}
                </span>
                <button
                  onClick={onDisconnect}
                  className="text-sm text-gray-400 hover:text-red-400 transition-colors"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isConnecting ? "Conectando..." : "Conectar Wallet"}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
