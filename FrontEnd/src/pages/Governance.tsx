import { useState } from "react";
import { type Address, encodeFunctionData, keccak256, toHex } from "viem";
import Card from "@/components/Card";
import { publicClient, writeContract } from "@/config/client";
import { addresses, luseedDAOAbi, luseedTokenAbi, erc20Abi, PROPOSAL_STATES } from "@/config/contracts";

interface GovernanceProps {
  address: Address | null;
}

interface ProposalInfo {
  id: string;
  state: number;
  description: string;
}

export default function Governance({ address }: GovernanceProps) {
  const [busy, setBusy] = useState(false);
  const [txStatus, setTxStatus] = useState("");

  // Proposal creation
  const [targetAddr, setTargetAddr] = useState("");
  const [description, setDescription] = useState("");

  // Vote
  const [voteProposalId, setVoteProposalId] = useState("");
  const [voteSupport, setVoteSupport] = useState("1");

  // Execute
  const [execProposalId, setExecProposalId] = useState("");

  // Proposal lookup
  const [lookupId, setLookupId] = useState("");
  const [lookupResult, setLookupResult] = useState<ProposalInfo | null>(null);

  // Delegate
  const [delegateTo, setDelegateTo] = useState("");

  // Votes info
  const [votingPower, setVotingPower] = useState<bigint | null>(null);
  const [lstBalance, setLstBalance] = useState<bigint | null>(null);

  async function exec(label: string, fn: () => Promise<`0x${string}`>) {
    setBusy(true);
    setTxStatus(label);
    try {
      const hash = await fn();
      await publicClient.waitForTransactionReceipt({ hash });
      setTxStatus("Transacción exitosa!");
    } catch (e) {
      setTxStatus(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setBusy(false);
      setTimeout(() => setTxStatus(""), 5000);
    }
  }

  async function refreshVotingPower() {
    if (!address) return;
    try {
      const [votes, balance] = await Promise.all([
        publicClient.readContract({ address: addresses.luseedToken, abi: luseedTokenAbi, functionName: "getVotes", args: [address] }),
        publicClient.readContract({ address: addresses.luseedToken, abi: erc20Abi, functionName: "balanceOf", args: [address] }),
      ]);
      setVotingPower(votes as bigint);
      setLstBalance(balance as bigint);
    } catch (e) {
      console.error("Failed to fetch voting power:", e);
    }
  }

  async function lookupProposal() {
    if (!lookupId) return;
    try {
      const state = (await publicClient.readContract({
        address: addresses.luseedDAO,
        abi: luseedDAOAbi,
        functionName: "state",
        args: [BigInt(lookupId)],
      })) as number;

      setLookupResult({
        id: lookupId,
        state,
        description: PROPOSAL_STATES[state] ?? "Unknown",
      });
    } catch (e) {
      setTxStatus(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    }
  }

  const stateColors: Record<number, string> = {
    0: "text-gray-400",    // Pending
    1: "text-blue-400",    // Active
    2: "text-red-400",     // Canceled
    3: "text-red-400",     // Defeated
    4: "text-luseed-400",  // Succeeded
    5: "text-yellow-400",  // Queued
    6: "text-gray-500",    // Expired
    7: "text-luseed-300",  // Executed
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gobernanza</h1>

      {txStatus && (
        <div className={`p-3 rounded-lg text-sm ${txStatus.startsWith("Error") ? "bg-red-900/30 text-red-400" : "bg-luseed-900/30 text-luseed-400"}`}>
          {txStatus}
        </div>
      )}

      {/* Voting Power */}
      <Card title="Tu Poder de Voto">
        {!address ? (
          <p className="text-gray-500">Conecta tu wallet.</p>
        ) : (
          <div className="space-y-3">
            <button
              onClick={refreshVotingPower}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Actualizar
            </button>
            {votingPower !== null && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">LST Balance</p>
                  <p className="text-xl font-bold">{lstBalance !== null ? (Number(lstBalance) / 1e18).toLocaleString() : "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Poder de Voto (delegado)</p>
                  <p className="text-xl font-bold text-luseed-400">{(Number(votingPower) / 1e18).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Delegate */}
      <Card title="Delegar Votos">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Delegar a (o a ti mismo)</label>
            <input
              type="text"
              value={delegateTo}
              onChange={(e) => setDelegateTo(e.target.value)}
              placeholder={address ?? "0x..."}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
            />
          </div>
          <button
            onClick={() =>
              exec("Delegando votos...", () =>
                writeContract({
                  account: address!,
                  address: addresses.luseedToken,
                  abi: luseedTokenAbi,
                  functionName: "delegate",
                  args: [(delegateTo || address!) as Address],
                })
              )
            }
            disabled={busy || !address}
            className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Delegar
          </button>
        </div>
      </Card>

      {/* Create Proposal */}
      <Card title="Crear Propuesta">
        <p className="text-xs text-gray-500 mb-3">
          Ejemplo: proponer abrir la ventana de inversión en el PromissoryNote.
        </p>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contrato destino</label>
            <input
              type="text"
              value={targetAddr}
              onChange={(e) => setTargetAddr(e.target.value)}
              placeholder={addresses.promissoryNote}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Abrir ventana de inversión..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luseed-500 resize-none"
            />
          </div>
          <button
            onClick={() => {
              const target = (targetAddr || addresses.promissoryNote) as Address;
              const calldata = encodeFunctionData({
                abi: [{ type: "function", name: "setInvestmentOpen", inputs: [{ type: "bool", name: "open" }], outputs: [], stateMutability: "nonpayable" }],
                functionName: "setInvestmentOpen",
                args: [true],
              });
              exec("Creando propuesta...", () =>
                writeContract({
                  account: address!,
                  address: addresses.luseedDAO,
                  abi: luseedDAOAbi,
                  functionName: "propose",
                  args: [[target], [0n], [calldata], description || "Proposal"],
                })
              );
            }}
            disabled={busy || !address}
            className="bg-luseed-600 hover:bg-luseed-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Crear Propuesta
          </button>
        </div>
      </Card>

      {/* Vote */}
      <Card title="Votar">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Proposal ID</label>
            <input
              type="text"
              value={voteProposalId}
              onChange={(e) => setVoteProposalId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-luseed-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Voto</label>
            <select
              value={voteSupport}
              onChange={(e) => setVoteSupport(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-luseed-500"
            >
              <option value="1">A favor</option>
              <option value="0">En contra</option>
              <option value="2">Abstención</option>
            </select>
          </div>
          <button
            onClick={() =>
              exec("Votando...", () =>
                writeContract({
                  account: address!,
                  address: addresses.luseedDAO,
                  abi: luseedDAOAbi,
                  functionName: "castVote",
                  args: [BigInt(voteProposalId), parseInt(voteSupport)],
                })
              )
            }
            disabled={busy || !address || !voteProposalId}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Votar
          </button>
        </div>
      </Card>

      {/* Execute */}
      <Card title="Ejecutar Propuesta Aprobada">
        <p className="text-xs text-gray-500 mb-3">
          Solo se puede ejecutar si la propuesta fue aprobada (estado: Succeeded).
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Proposal ID (para referencia)</label>
            <input
              type="text"
              value={execProposalId}
              onChange={(e) => setExecProposalId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-luseed-500"
            />
          </div>
          <button
            onClick={() => {
              const target = (targetAddr || addresses.promissoryNote) as Address;
              const calldata = encodeFunctionData({
                abi: [{ type: "function", name: "setInvestmentOpen", inputs: [{ type: "bool", name: "open" }], outputs: [], stateMutability: "nonpayable" }],
                functionName: "setInvestmentOpen",
                args: [true],
              });
              const descHash = keccak256(toHex(description || "Proposal"));
              exec("Ejecutando propuesta...", () =>
                writeContract({
                  account: address!,
                  address: addresses.luseedDAO,
                  abi: luseedDAOAbi,
                  functionName: "execute",
                  args: [[target], [0n], [calldata], descHash],
                })
              );
            }}
            disabled={busy || !address}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Ejecutar
          </button>
        </div>
      </Card>

      {/* Lookup */}
      <Card title="Consultar Estado de Propuesta">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Proposal ID</label>
            <input
              type="text"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-luseed-500"
            />
          </div>
          <button
            onClick={lookupProposal}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Consultar
          </button>
        </div>
        {lookupResult && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-400">ID: <span className="font-mono text-white">{lookupResult.id}</span></p>
            <p className={`text-sm mt-1 ${stateColors[lookupResult.state] ?? "text-gray-400"}`}>
              Estado: <span className="font-semibold">{lookupResult.description}</span>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
