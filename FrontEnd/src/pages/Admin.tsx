import { useState } from "react";
import { type Address } from "viem";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import { USD_TO_COP_RATE } from "@/config/branding";
import { useProtocolState, formatCop, formatRate, formatDuration, parseCopToUsdcRaw } from "@/hooks/useContractReads";
import { publicClient, writeContract } from "@/config/client";
import { addresses, promissoryNoteAbi, erc20Abi, mockUsdcAbi } from "@/config/contracts";

interface AdminProps {
  address: Address | null;
}

export default function Admin({ address }: AdminProps) {
  const protocol = useProtocolState();
  const [busy, setBusy] = useState(false);
  const [txStatus, setTxStatus] = useState("");

  const [newRateBps, setNewRateBps] = useState("");
  const [rateEffectiveDate, setRateEffectiveDate] = useState("");
  const [newTermDays, setNewTermDays] = useState("");
  const [whitelistAddr, setWhitelistAddr] = useState("");
  const [whitelistStatus, setWhitelistStatus] = useState(true);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [faucetMintAddr, setFaucetMintAddr] = useState("");
  const [faucetMintAmount, setFaucetMintAmount] = useState("100000");

  async function exec(label: string, fn: () => Promise<`0x${string}`>) {
    setBusy(true);
    setTxStatus(label);
    try {
      const hash = await fn();
      await publicClient.waitForTransactionReceipt({ hash });
      setTxStatus("Transacción exitosa!");
      protocol.refresh();
    } catch (e) {
      setTxStatus(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setBusy(false);
      setTimeout(() => setTxStatus(""), 5000);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Portal de Operaciones</h1>
        <StatusBadge active={protocol.investmentOpen} labelOn="Ventana Abierta" labelOff="Ventana Cerrada" />
      </div>

      <p className="text-sm text-gray-400">
        Montos en COP (activos en Colombia). Liquidación on-chain en USDC (1 USD ={" "}
        {USD_TO_COP_RATE.toLocaleString("es-CO")} COP).
      </p>

      {txStatus && (
        <div className={`p-3 rounded-lg text-sm ${txStatus.startsWith("Error") ? "bg-red-900/30 text-red-400" : "bg-luseed-900/30 text-luseed-400"}`}>
          {txStatus}
        </div>
      )}

      {!address && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 text-yellow-400 text-sm">
          Conecta tu wallet de operador para gestionar el protocolo.
        </div>
      )}

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card title="Tasa"><p className="text-xl font-bold text-luseed-400">{formatRate(protocol.currentRate)}</p></Card>
        <Card title="Plazo"><p className="text-xl font-bold">{formatDuration(protocol.termDuration)}</p></Card>
        <Card title="Invertido">
          <p className="text-xl font-bold text-luseed-400">{formatCop(protocol.totalInvested)}</p>
        </Card>
        <Card title="Fondos en Contrato">
          <p className="text-xl font-bold">{formatCop(protocol.contractUsdcBalance)}</p>
        </Card>
        <Card title="Notas Emitidas"><p className="text-xl font-bold">{(protocol.nextNoteId - 1n).toString()}</p></Card>
      </div>

      {/* Investment Window */}
      <Card title="Ventana de Inversión">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-400">Estado actual: {protocol.investmentOpen ? "Abierta" : "Cerrada"}</p>
          <button
            onClick={() =>
              exec("Cambiando ventana...", () =>
                writeContract({
                  account: address!,
                  address: addresses.promissoryNote,
                  abi: promissoryNoteAbi,
                  functionName: "setInvestmentOpen",
                  args: [!protocol.investmentOpen],
                })
              )
            }
            disabled={busy || !address}
            className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {protocol.investmentOpen ? "Cerrar" : "Abrir"} Ventana
          </button>
        </div>
      </Card>

      {/* Rate */}
      <Card title="Cambiar Tasa de Interés">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nueva tasa (%)</label>
            <input
              type="number"
              step="0.01"
              value={newRateBps}
              onChange={(e) => setNewRateBps(e.target.value)}
              placeholder="8.00"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Fecha efectiva</label>
            <input
              type="datetime-local"
              value={rateEffectiveDate}
              onChange={(e) => setRateEffectiveDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-luseed-500"
            />
          </div>
          <button
            onClick={() => {
              const bps = BigInt(Math.round(parseFloat(newRateBps) * 100));
              const ts = BigInt(Math.floor(new Date(rateEffectiveDate).getTime() / 1000));
              exec("Actualizando tasa...", () =>
                writeContract({
                  account: address!,
                  address: addresses.promissoryNote,
                  abi: promissoryNoteAbi,
                  functionName: "setRate",
                  args: [bps, ts],
                })
              );
            }}
            disabled={busy || !address || !newRateBps || !rateEffectiveDate}
            className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Programar Tasa
          </button>
        </div>
      </Card>

      {/* Term Duration */}
      <Card title="Cambiar Plazo (notas nuevas)">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Nuevo plazo (días)</label>
            <input
              type="number"
              value={newTermDays}
              onChange={(e) => setNewTermDays(e.target.value)}
              placeholder="365"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
            />
          </div>
          <button
            onClick={() =>
              exec("Actualizando plazo...", () =>
                writeContract({
                  account: address!,
                  address: addresses.promissoryNote,
                  abi: promissoryNoteAbi,
                  functionName: "setTermDuration",
                  args: [BigInt(parseInt(newTermDays)) * 86400n],
                })
              )
            }
            disabled={busy || !address || !newTermDays}
            className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Actualizar Plazo
          </button>
        </div>
      </Card>

      {/* Whitelist */}
      <Card title="Lista blanca KYC">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Dirección</label>
            <input
              type="text"
              value={whitelistAddr}
              onChange={(e) => setWhitelistAddr(e.target.value)}
              placeholder="0x..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Acción</label>
            <select
              value={whitelistStatus ? "add" : "remove"}
              onChange={(e) => setWhitelistStatus(e.target.value === "add")}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-luseed-500"
            >
              <option value="add">Agregar</option>
              <option value="remove">Remover</option>
            </select>
          </div>
          <button
            onClick={() =>
              exec("Actualizando whitelist...", () =>
                writeContract({
                  account: address!,
                  address: addresses.promissoryNote,
                  abi: promissoryNoteAbi,
                  functionName: "setWhitelisted",
                  args: [whitelistAddr as Address, whitelistStatus],
                })
              )
            }
            disabled={busy || !address || !whitelistAddr}
            className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            {whitelistStatus ? "Agregar" : "Remover"}
          </button>
        </div>
      </Card>

      {/* Deposit Yield Funds */}
      <Card title="Depositar Fondos para Rendimientos">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Monto (COP)</label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
            />
          </div>
          <button
            onClick={async () => {
              const amount = parseCopToUsdcRaw(depositAmount);
              setBusy(true);
              setTxStatus("Aprobando USDC...");
              try {
                const approveHash = await writeContract({
                  account: address!,
                  address: addresses.usdc,
                  abi: erc20Abi,
                  functionName: "approve",
                  args: [addresses.promissoryNote, amount],
                });
                await publicClient.waitForTransactionReceipt({ hash: approveHash });

                setTxStatus("Depositando...");
                const hash = await writeContract({
                  account: address!,
                  address: addresses.promissoryNote,
                  abi: promissoryNoteAbi,
                  functionName: "depositYieldFunds",
                  args: [amount],
                });
                await publicClient.waitForTransactionReceipt({ hash });
                setTxStatus("Depósito exitoso!");
                setDepositAmount("");
                protocol.refresh();
              } catch (e) {
                setTxStatus(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
              } finally {
                setBusy(false);
                setTimeout(() => setTxStatus(""), 5000);
              }
            }}
            disabled={busy || !address || !depositAmount}
            className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Depositar
          </button>
        </div>
      </Card>

      {/* MockUSDC — acreditar USDC de prueba */}
      <Card title="Acreditar USDC de prueba (MockUSDC)">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Mint público en testnet. Los usuarios pueden imprimir USDC desde el banner en
            Inversiones; aquí puedes acreditar a otra wallet si lo necesitas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Destinatario</label>
              <input
                type="text"
                value={faucetMintAddr}
                onChange={(e) => setFaucetMintAddr(e.target.value)}
                placeholder="0x..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
              />
              {address && (
                <button
                  type="button"
                  onClick={() => setFaucetMintAddr(address)}
                  className="text-xs text-luseed-400 hover:underline mt-1"
                >
                  Usar mi wallet
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Monto (USDC)</label>
              <input
                type="number"
                value={faucetMintAmount}
                onChange={(e) => setFaucetMintAmount(e.target.value)}
                placeholder="100000"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
              />
              <div className="flex gap-2 mt-1">
                {["10000", "100000", "500000"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFaucetMintAmount(preset)}
                    className="text-xs text-gray-500 hover:text-luseed-400"
                  >
                    {Number(preset).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                const amount = BigInt(Math.round(parseFloat(faucetMintAmount) * 1e6));
                exec("Acreditando USDC...", () =>
                  writeContract({
                    account: address!,
                    address: addresses.usdc,
                    abi: mockUsdcAbi,
                    functionName: "mint",
                    args: [faucetMintAddr as Address, amount],
                  })
                );
              }}
              disabled={busy || !address || !faucetMintAddr || !faucetMintAmount}
              className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              Acreditar USDC
            </button>
          </div>
        </div>
      </Card>

      {/* Withdraw */}
      <Card title="Retirar Fondos Excedentes">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Destinatario</label>
            <input
              type="text"
              value={withdrawAddr}
              onChange={(e) => setWithdrawAddr(e.target.value)}
              placeholder="0x..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Monto (COP)</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
            />
          </div>
          <button
            onClick={() =>
              exec("Retirando USDC...", () =>
                writeContract({
                  account: address!,
                  address: addresses.promissoryNote,
                  abi: promissoryNoteAbi,
                  functionName: "withdrawExcessUsdc",
                  args: [withdrawAddr as Address, parseCopToUsdcRaw(withdrawAmount)],
                })
              )
            }
            disabled={busy || !address || !withdrawAddr || !withdrawAmount}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Retirar
          </button>
        </div>
      </Card>
    </div>
  );
}
