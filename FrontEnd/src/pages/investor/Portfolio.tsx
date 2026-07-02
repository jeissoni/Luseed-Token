import { useState } from "react";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";
import MoneyAmount from "@/components/MoneyAmount";
import { useInvestorPortal } from "@/contexts/InvestorPortalContext";

export default function InvestorPortfolio() {
  const { address, notes, notesLoading, busy, handleClaim, handleRedeem, handleTransfer } =
    useInvestorPortal();

  const [transferNoteId, setTransferNoteId] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const now = BigInt(Math.floor(Date.now() / 1000));

  async function onTransfer() {
    await handleTransfer(transferNoteId, transferTo, transferAmount);
    setTransferNoteId("");
    setTransferTo("");
    setTransferAmount("");
  }

  return (
    <div className="space-y-6">
      <Card title="Mis inversiones">
        {!address ? (
          <p className="text-gray-500">Conecta tu wallet.</p>
        ) : notesLoading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : notes.length === 0 ? (
          <p className="text-gray-500">Aún no tienes inversiones registradas.</p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => {
              const isMature = now >= note.termEnd;
              const daysLeft = isMature ? 0 : Number(note.termEnd - now) / 86400;
              return (
                <div
                  key={note.noteId.toString()}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-mono text-gray-400">
                      Inversión #{note.noteId.toString()}
                    </span>
                    <StatusBadge
                      active={!isMature}
                      labelOn={`${daysLeft.toFixed(0)} días restantes`}
                      labelOff="Vencida"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Capital</p>
                      <p className="font-semibold">
                        <MoneyAmount amount={note.balance} showUsd={false} />
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Rendimiento pendiente</p>
                      <p className="font-semibold text-luseed-400">
                        <MoneyAmount amount={note.pendingYield} showUsd={false} />
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Vencimiento</p>
                      <p className="font-semibold">
                        {new Date(Number(note.termEnd) * 1000).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 flex-wrap">
                    <button
                      onClick={() => handleClaim(note.noteId)}
                      disabled={busy || note.pendingYield === 0n}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm transition-colors"
                    >
                      Reclamar rendimiento
                    </button>
                    {isMature && (
                      <button
                        onClick={() => handleRedeem(note.noteId)}
                        disabled={busy}
                        className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm transition-colors"
                      >
                        Redimir capital
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <details className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <summary className="px-6 py-4 cursor-pointer text-sm font-medium text-gray-300 hover:text-white">
          Avanzado: transferir una inversión a otra wallet
        </summary>
        <div className="px-6 pb-6 pt-2 border-t border-gray-800">
          {!address ? (
            <p className="text-gray-500 text-sm">Conecta tu wallet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-sm text-gray-400 mb-1">N.º de inversión</label>
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
                <label className="block text-sm text-gray-400 mb-1">Monto (COP)</label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-luseed-500"
                />
              </div>
              <button
                onClick={onTransfer}
                disabled={busy || !transferNoteId || !transferTo || !transferAmount}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                Transferir
              </button>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
