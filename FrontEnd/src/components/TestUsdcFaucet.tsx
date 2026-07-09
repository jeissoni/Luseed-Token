import { useCallback, useEffect, useState } from "react";
import { type Address, formatUnits } from "viem";
import Card from "@/components/Card";
import { publicClient, writeContract } from "@/config/client";
import { addresses, erc20Abi, mockUsdcAbi, MOCK_USDC_MINT_AMOUNT } from "@/config/contracts";
import { formatCop } from "@/hooks/useContractReads";

interface TestUsdcFaucetProps {
  address: Address | null;
  compact?: boolean;
}

const MINT_USDC_DISPLAY = Number(formatUnits(MOCK_USDC_MINT_AMOUNT, 6));

export default function TestUsdcFaucet({ address, compact = false }: TestUsdcFaucetProps) {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const refresh = useCallback(async () => {
    if (!address) {
      setBalance(null);
      return;
    }
    try {
      const bal = (await publicClient.readContract({
        address: addresses.usdc,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;
      setBalance(bal);
    } catch {
      setBalance(null);
    }
  }, [address]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleMint() {
    if (!address) return;
    setBusy(true);
    setStatus("Imprimiendo USDC de prueba...");
    try {
      const hash = await writeContract({
        account: address,
        address: addresses.usdc,
        abi: mockUsdcAbi,
        functionName: "mint",
        args: [address, MOCK_USDC_MINT_AMOUNT],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(`${MINT_USDC_DISPLAY.toLocaleString()} USDC acreditados en tu wallet.`);
      await refresh();
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : "desconocido"}`);
    } finally {
      setBusy(false);
      setTimeout(() => setStatus(""), 6000);
    }
  }

  const balanceText =
    address && balance !== null
      ? `${formatCop(balance)} (${Number(formatUnits(balance, 6)).toLocaleString()} USDC)`
      : null;

  if (compact) {
    return (
      <div className="bg-luseed-900/20 border border-luseed-800/50 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span className="text-luseed-300 font-medium">USDC de prueba</span>
          {balanceText && <span className="text-gray-400 ml-2">Saldo: {balanceText}</span>}
        </div>
        {!address ? (
          <span className="text-xs text-gray-500">Conecta wallet</span>
        ) : (
          <button
            onClick={handleMint}
            disabled={busy}
            className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            {busy ? "Procesando..." : `Obtener ${MINT_USDC_DISPLAY.toLocaleString()} USDC`}
          </button>
        )}
        {status && (
          <p className={`w-full text-xs ${status.startsWith("Error") ? "text-red-400" : "text-luseed-400"}`}>
            {status}
          </p>
        )}
      </div>
    );
  }

  return (
    <Card title="USDC de prueba (Sepolia)">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Token de prueba sin valor real. Cualquier wallet puede imprimir{" "}
          <strong className="text-white">{MINT_USDC_DISPLAY.toLocaleString()} USDC</strong> para
          probar inversiones en Sepolia.
        </p>

        {balanceText && (
          <p className="text-sm text-gray-400">
            Tu saldo: <span className="text-luseed-400 font-medium">{balanceText}</span>
          </p>
        )}

        {!address ? (
          <p className="text-sm text-yellow-400/90">Conecta tu wallet para imprimir USDC de prueba.</p>
        ) : (
          <button
            onClick={handleMint}
            disabled={busy}
            className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            {busy ? "Procesando..." : `Obtener ${MINT_USDC_DISPLAY.toLocaleString()} USDC de prueba`}
          </button>
        )}

        {status && (
          <p className={`text-sm ${status.startsWith("Error") ? "text-red-400" : "text-luseed-400"}`}>
            {status}
          </p>
        )}
      </div>
    </Card>
  );
}
