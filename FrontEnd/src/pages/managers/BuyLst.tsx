import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { type Address } from "viem";
import Card from "@/components/Card";
import TxBanner from "@/components/TxBanner";
import { USD_TO_COP_RATE } from "@/config/branding";
import { parseCopToUsdcRaw } from "@/hooks/useContractReads";
import { publicClient, writeContract } from "@/config/client";
import {
  addresses,
  luseedInvestmentAbi,
  luseedTokenAbi,
  erc20Abi,
} from "@/config/contracts";

const USDC_PER_OFFER_RAW = 10_000n * 10n ** 6n;
const LST_PER_OFFER_RAW = 1_000n * 10n ** 18n;

function estimateLstRaw(usdcRaw: bigint): bigint {
  return (usdcRaw * LST_PER_OFFER_RAW) / USDC_PER_OFFER_RAW;
}

interface BuyLstProps {
  address: Address | null;
}

export default function BuyLst({ address }: BuyLstProps) {
  const [buyLstAmount, setBuyLstAmount] = useState("");
  const [isTokenAuthorized, setIsTokenAuthorized] = useState<boolean | null>(null);
  const [lstRemainingCap, setLstRemainingCap] = useState<bigint | null>(null);
  const [lstExpected, setLstExpected] = useState<bigint | null>(null);
  const [txStatus, setTxStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function refreshBuySide() {
    if (!address) return;
    try {
      const [authorized, remaining] = await Promise.all([
        publicClient.readContract({
          address: addresses.luseedToken,
          abi: luseedTokenAbi,
          functionName: "isAuthorized",
          args: [address],
        }),
        publicClient.readContract({
          address: addresses.luseedInvestment,
          abi: luseedInvestmentAbi,
          functionName: "remainingCap",
        }),
      ]);
      setIsTokenAuthorized(authorized as boolean);
      setLstRemainingCap(remaining as bigint);
    } catch (e) {
      console.error("Failed to refresh buy side:", e);
      setIsTokenAuthorized(null);
      setLstRemainingCap(null);
    }
  }

  useEffect(() => {
    refreshBuySide();
  }, [address]);

  useEffect(() => {
    try {
      if (!buyLstAmount) {
        setLstExpected(null);
        return;
      }
      const amountRaw = parseCopToUsdcRaw(buyLstAmount);
      setLstExpected(amountRaw === 0n ? null : estimateLstRaw(amountRaw));
    } catch {
      setLstExpected(null);
    }
  }, [buyLstAmount]);

  async function handleBuyLst() {
    if (!address || !buyLstAmount) return;
    setBusy(true);
    setTxStatus("Preparando compra...");
    try {
      if (isTokenAuthorized === false) {
        setTxStatus("Tu cuenta no está autorizada (KYC) para recibir tokens de gobernanza.");
        return;
      }

      const amount = parseCopToUsdcRaw(buyLstAmount);

      setTxStatus("Aprobando fondos...");
      const approveHash = await writeContract({
        account: address,
        address: addresses.usdc,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.luseedInvestment, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      setTxStatus("Comprando tokens...");
      const buyHash = await writeContract({
        account: address,
        address: addresses.luseedInvestment,
        abi: luseedInvestmentAbi,
        functionName: "buy",
        args: [amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: buyHash });

      setTxStatus("Compra exitosa.");
      setBuyLstAmount("");
      setLstExpected(null);
      await refreshBuySide();
    } catch (e) {
      setTxStatus(`Error: ${e instanceof Error ? e.message : "desconocido"}`);
    } finally {
      setBusy(false);
      setTimeout(() => setTxStatus(""), 6000);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Portal de Socios</h1>
        <Link
          to="/gobernanza"
          className="text-sm text-luseed-400 hover:text-luseed-300 transition-colors"
        >
          Ir a gobernanza →
        </Link>
      </div>

      <p className="text-sm text-gray-400">
        Para managers y socios con KYC. Compra de tokens de gobernanza (LST). Montos en COP; liquidación
        en USDC (1 USD = {USD_TO_COP_RATE.toLocaleString("es-CO")} COP).
      </p>

      <TxBanner message={txStatus} />

      <Card title="Comprar tokens de gobernanza (LST)">
        <div className="space-y-4">
          {!address ? (
            <p className="text-gray-500">Conecta tu wallet para continuar.</p>
          ) : (
            <>
              <div className="flex gap-3 flex-wrap items-center">
                <span className="text-sm text-gray-400">Estado KYC:</span>
                <span
                  className={`text-sm font-medium ${
                    isTokenAuthorized === null
                      ? "text-gray-400"
                      : isTokenAuthorized
                        ? "text-luseed-400"
                        : "text-red-400"
                  }`}
                >
                  {isTokenAuthorized === null
                    ? "—"
                    : isTokenAuthorized
                      ? "Autorizado"
                      : "No autorizado"}
                </span>
              </div>

              <div className="text-sm text-gray-400">
                Cupo restante:{" "}
                <span className="font-semibold text-gray-100">
                  {lstRemainingCap !== null
                    ? (Number(lstRemainingCap) / 1e18).toLocaleString("es-CO")
                    : "—"}{" "}
                  LST
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Monto (COP)</label>
                  <input
                    type="number"
                    value={buyLstAmount}
                    onChange={(e) => setBuyLstAmount(e.target.value)}
                    placeholder={`Ej: ${(2_000 * USD_TO_COP_RATE).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
                  />
                </div>
                <button
                  onClick={handleBuyLst}
                  disabled={
                    busy ||
                    !buyLstAmount ||
                    isTokenAuthorized === false ||
                    (lstRemainingCap !== null && lstRemainingCap === 0n)
                  }
                  className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Comprar LST
                </button>
              </div>

              <div className="text-xs text-gray-500">
                Estimación:{" "}
                <span className="font-semibold text-gray-200">
                  {lstExpected !== null
                    ? (Number(lstExpected) / 1e18).toLocaleString("es-CO")
                    : "—"}{" "}
                  LST
                </span>
                <div className="mt-1">
                  Relación: 10.000 USDC = 1.000 LST. El contrato puede ajustar el monto si el cupo es
                  limitado.
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
