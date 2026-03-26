import { useEffect, useState } from "react";
import { type Address, parseUnits } from "viem";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import {
  useProtocolState,
  useUserNotes,
  formatUsdc,
  formatRate,
  formatDuration,
} from "@/hooks/useContractReads";
import { publicClient, writeContract } from "@/config/client";
import {
  addresses,
  promissoryNoteAbi,
  erc20Abi,
  luseedInvestmentAbi,
  luseedTokenAbi,
} from "@/config/contracts";

interface InvestorProps {
  address: Address | null;
}

export default function Investor({ address }: InvestorProps) {
  const protocol = useProtocolState();
  const { notes, usdcBalance, loading: notesLoading, refresh: refreshNotes } = useUserNotes(address);
  const [investAmount, setInvestAmount] = useState("");
  const [transferNoteId, setTransferNoteId] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [buyLstAmount, setBuyLstAmount] = useState("");
  const [isTokenAuthorized, setIsTokenAuthorized] = useState<boolean | null>(null);
  const [lstRemainingCap, setLstRemainingCap] = useState<bigint | null>(null);
  const [lstExpected, setLstExpected] = useState<bigint | null>(null);
  const [buyStatus, setBuyStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [txStatus, setTxStatus] = useState("");

  // Constants del contrato LuseedInvestment (10_000 USDC -> 1_000 LST)
  // Esto es solo para estimar; la compra real respeta el cap on-chain.
  const USDC_PER_OFFER_RAW = 10_000n * 10n ** 6n; // 10,000 USDC con 6 decimales
  const LST_PER_OFFER_RAW = 1_000n * 10n ** 18n; // 1,000 LST con 18 decimales

  function estimateLstRaw(usdcRaw: bigint): bigint {
    return (usdcRaw * LST_PER_OFFER_RAW) / USDC_PER_OFFER_RAW;
  }

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

  // Recalcular estimación local del LST esperado (sin llamadas RPC)
  function recalcExpected() {
    try {
      if (!buyLstAmount) {
        setLstExpected(null);
        return;
      }
      const amountRaw = parseUnits(buyLstAmount, 6);
      if (amountRaw === 0n) {
        setLstExpected(null);
        return;
      }
      setLstExpected(estimateLstRaw(amountRaw));
    } catch {
      setLstExpected(null);
    }
  }

  useEffect(() => {
    recalcExpected();
  }, [buyLstAmount]);

  useEffect(() => {
    refreshBuySide();
  }, [address]);

  async function handleInvest() {
    if (!address || !investAmount) return;
    setBusy(true);
    setTxStatus("Aprobando USDC...");
    try {
      const amount = parseUnits(investAmount, 6);
      const approveHash = await writeContract({
        account: address,
        address: addresses.usdc,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.promissoryNote, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      setTxStatus("Invirtiendo...");
      const investHash = await writeContract({
        account: address,
        address: addresses.promissoryNote,
        abi: promissoryNoteAbi,
        functionName: "invest",
        args: [amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: investHash });

      setTxStatus("Inversión exitosa!");
      setInvestAmount("");
      refreshNotes();
      protocol.refresh();
    } catch (e) {
      setTxStatus(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setBusy(false);
      setTimeout(() => setTxStatus(""), 5000);
    }
  }

  async function handleClaim(noteId: bigint) {
    if (!address) return;
    setBusy(true);
    setTxStatus("Reclamando rendimientos...");
    try {
      const hash = await writeContract({
        account: address,
        address: addresses.promissoryNote,
        abi: promissoryNoteAbi,
        functionName: "claimYield",
        args: [noteId],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTxStatus("Rendimientos reclamados!");
      refreshNotes();
    } catch (e) {
      setTxStatus(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setBusy(false);
      setTimeout(() => setTxStatus(""), 5000);
    }
  }

  async function handleRedeem(noteId: bigint) {
    if (!address) return;
    setBusy(true);
    setTxStatus("Redimiendo capital...");
    try {
      const hash = await writeContract({
        account: address,
        address: addresses.promissoryNote,
        abi: promissoryNoteAbi,
        functionName: "redeemCapital",
        args: [noteId],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTxStatus("Capital redimido!");
      refreshNotes();
      protocol.refresh();
    } catch (e) {
      setTxStatus(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setBusy(false);
      setTimeout(() => setTxStatus(""), 5000);
    }
  }

  async function handleTransfer() {
    if (!address || !transferNoteId || !transferTo || !transferAmount) return;
    setBusy(true);
    setTxStatus("Transfiriendo posición...");
    try {
      const hash = await writeContract({
        account: address,
        address: addresses.promissoryNote,
        abi: promissoryNoteAbi,
        functionName: "safeTransferFrom",
        args: [address, transferTo as Address, BigInt(transferNoteId), parseUnits(transferAmount, 6), "0x"],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTxStatus("Transferencia exitosa!");
      setTransferNoteId("");
      setTransferTo("");
      setTransferAmount("");
      refreshNotes();
    } catch (e) {
      setTxStatus(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setBusy(false);
      setTimeout(() => setTxStatus(""), 5000);
    }
  }

  const now = BigInt(Math.floor(Date.now() / 1000));

  async function handleBuyLst() {
    if (!address || !buyLstAmount) return;
    setBusy(true);
    setBuyStatus("Preparando compra...");
    try {
      if (isTokenAuthorized === false) {
        setBuyStatus("Tu cuenta NO está autorizada (KYC) para recibir LST.");
        return;
      }

      const amount = parseUnits(buyLstAmount, 6);

      setBuyStatus("Aprobando USDC...");
      const approveHash = await writeContract({
        account: address,
        address: addresses.usdc,
        abi: erc20Abi,
        functionName: "approve",
        args: [addresses.luseedInvestment, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      setBuyStatus("Comprando LST...");
      const buyHash = await writeContract({
        account: address,
        address: addresses.luseedInvestment,
        abi: luseedInvestmentAbi,
        functionName: "buy",
        args: [amount],
      });
      await publicClient.waitForTransactionReceipt({ hash: buyHash });

      setBuyStatus("Compra exitosa!");
      setBuyLstAmount("");
      setLstExpected(null);
      refreshNotes();
      await refreshBuySide();
      protocol.refresh();
    } catch (e) {
      setBuyStatus(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setBusy(false);
      setTimeout(() => setBuyStatus(""), 6000);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel de Inversor</h1>
        <StatusBadge active={protocol.investmentOpen} labelOn="Ventana Abierta" labelOff="Ventana Cerrada" />
      </div>

      {txStatus && (
        <div className={`p-3 rounded-lg text-sm ${txStatus.startsWith("Error") ? "bg-red-900/30 text-red-400" : "bg-luseed-900/30 text-luseed-400"}`}>
          {txStatus}
        </div>
      )}

      {/* Buy LST */}
      <Card title="Comprar LST (con USDC)">
        <div className="space-y-4">
          {!address ? (
            <p className="text-gray-500">Conecta tu wallet para comprar LST.</p>
          ) : (
            <>
              <div className="flex gap-3 flex-wrap items-center">
                <span className="text-sm text-gray-400">KYC (recibir LST):</span>
                <span
                  className={`text-sm font-medium ${
                    isTokenAuthorized === null
                      ? "text-gray-400"
                      : isTokenAuthorized
                        ? "text-luseed-400"
                        : "text-red-400"
                  }`}
                >
                  {isTokenAuthorized === null ? "—" : isTokenAuthorized ? "Autorizado" : "No autorizado"}
                </span>
              </div>

              <div className="text-sm text-gray-400">
                Cap restante:{" "}
                <span className="font-semibold text-gray-100">
                  {lstRemainingCap !== null ? (Number(lstRemainingCap) / 1e18).toLocaleString() : "—"} LST
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Monto (USDC)</label>
                  <input
                    type="number"
                    value={buyLstAmount}
                    onChange={(e) => setBuyLstAmount(e.target.value)}
                    onBlur={recalcExpected}
                    placeholder="Ej: 2000"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
                  />
                </div>
                <button
                  onClick={handleBuyLst}
                  disabled={busy || !buyLstAmount || isTokenAuthorized === false || (lstRemainingCap !== null && lstRemainingCap === 0n)}
                  className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Comprar LST
                </button>
              </div>

              <div className="text-xs text-gray-500">
                Estimación:{" "}
                <span className="font-semibold text-gray-200">
                  {lstExpected !== null ? (Number(lstExpected) / 1e18).toLocaleString() : "—"} LST
                </span>
                <div>Nota: el contrato puede tomar menos USDC si el cap limita la venta.</div>
              </div>

              {buyStatus && (
                <div className={`p-3 rounded-lg text-sm ${buyStatus.startsWith("Error") ? "bg-red-900/30 text-red-400" : "bg-luseed-900/30 text-luseed-400"}`}>
                  {buyStatus}
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Protocol Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Tasa Actual">
          <p className="text-2xl font-bold text-luseed-400">{formatRate(protocol.currentRate)}</p>
          <p className="text-xs text-gray-500 mt-1">anual, interés simple</p>
        </Card>
        <Card title="Plazo">
          <p className="text-2xl font-bold">{formatDuration(protocol.termDuration)}</p>
        </Card>
        <Card title="Total Invertido">
          <p className="text-2xl font-bold">${formatUsdc(protocol.totalInvested)}</p>
        </Card>
        <Card title="Tu Saldo USDC">
          <p className="text-2xl font-bold">${address ? formatUsdc(usdcBalance) : "—"}</p>
        </Card>
      </div>

      {/* Invest */}
      <Card title="Invertir USDC">
        {!address ? (
          <p className="text-gray-500">Conecta tu wallet para invertir.</p>
        ) : !protocol.investmentOpen ? (
          <p className="text-gray-500">La ventana de inversión está cerrada.</p>
        ) : (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Monto (USDC)</label>
              <input
                type="number"
                value={investAmount}
                onChange={(e) => setInvestAmount(e.target.value)}
                placeholder={`Mínimo ${formatUsdc(protocol.minInvestment)}`}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
              />
            </div>
            <button
              onClick={handleInvest}
              disabled={busy || !investAmount}
              className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Invertir
            </button>
          </div>
        )}
      </Card>

      {/* Notes */}
      <Card title="Mis Notas de Inversión">
        {!address ? (
          <p className="text-gray-500">Conecta tu wallet.</p>
        ) : notesLoading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : notes.length === 0 ? (
          <p className="text-gray-500">No tienes notas de inversión.</p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => {
              const isMature = now >= note.termEnd;
              const daysLeft = isMature ? 0 : Number(note.termEnd - now) / 86400;
              return (
                <div key={note.noteId.toString()} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-mono text-gray-400">Note #{note.noteId.toString()}</span>
                    <StatusBadge active={!isMature} labelOn={`${daysLeft.toFixed(0)}d restantes`} labelOff="Vencida" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Principal</p>
                      <p className="font-semibold">${formatUsdc(note.balance)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Rendimiento Pendiente</p>
                      <p className="font-semibold text-luseed-400">${formatUsdc(note.pendingYield)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Vence</p>
                      <p className="font-semibold">{new Date(Number(note.termEnd) * 1000).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleClaim(note.noteId)}
                      disabled={busy || note.pendingYield === 0n}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm transition-colors"
                    >
                      Reclamar Yield
                    </button>
                    {isMature && (
                      <button
                        onClick={() => handleRedeem(note.noteId)}
                        disabled={busy}
                        className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm transition-colors"
                      >
                        Redimir Capital
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Transfer */}
      <Card title="Transferir Posición">
        {!address ? (
          <p className="text-gray-500">Conecta tu wallet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Note ID</label>
              <input
                type="number"
                value={transferNoteId}
                onChange={(e) => setTransferNoteId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-luseed-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Destinatario</label>
              <input
                type="text"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                placeholder="0x..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Monto (USDC)</label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-luseed-500"
              />
            </div>
            <button
              onClick={handleTransfer}
              disabled={busy || !transferNoteId || !transferTo || !transferAmount}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Transferir
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
