import { createContext, useContext, useState, type ReactNode } from "react";
import { type Address } from "viem";
import { useProtocolState, useUserNotes, parseCopToUsdcRaw } from "@/hooks/useContractReads";
import { publicClient, writeContract } from "@/config/client";
import { addresses, promissoryNoteAbi, erc20Abi } from "@/config/contracts";

interface InvestorPortalContextValue {
  address: Address | null;
  protocol: ReturnType<typeof useProtocolState>;
  notes: ReturnType<typeof useUserNotes>["notes"];
  usdcBalance: bigint;
  notesLoading: boolean;
  refreshNotes: () => void;
  busy: boolean;
  txStatus: string;
  handleInvest: (copAmount: string) => Promise<void>;
  handleClaim: (noteId: bigint) => Promise<void>;
  handleRedeem: (noteId: bigint) => Promise<void>;
  handleTransfer: (noteId: string, to: string, copAmount: string) => Promise<void>;
}

const InvestorPortalContext = createContext<InvestorPortalContextValue | null>(null);

export function useInvestorPortal() {
  const ctx = useContext(InvestorPortalContext);
  if (!ctx) throw new Error("useInvestorPortal debe usarse dentro de InvestorPortalProvider");
  return ctx;
}

interface ProviderProps {
  address: Address | null;
  children: ReactNode;
}

export function InvestorPortalProvider({ address, children }: ProviderProps) {
  const protocol = useProtocolState();
  const { notes, usdcBalance, loading: notesLoading, refresh: refreshNotes } = useUserNotes(address);
  const [busy, setBusy] = useState(false);
  const [txStatus, setTxStatus] = useState("");

  async function handleInvest(copAmount: string) {
    if (!address || !copAmount) return;
    setBusy(true);
    setTxStatus("Aprobando fondos...");
    try {
      const amount = parseCopToUsdcRaw(copAmount);
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

      setTxStatus("Inversión exitosa.");
      refreshNotes();
      protocol.refresh();
    } catch (e) {
      setTxStatus(`Error: ${e instanceof Error ? e.message : "desconocido"}`);
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
      setTxStatus("Rendimientos reclamados.");
      refreshNotes();
    } catch (e) {
      setTxStatus(`Error: ${e instanceof Error ? e.message : "desconocido"}`);
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
      setTxStatus("Capital redimido.");
      refreshNotes();
      protocol.refresh();
    } catch (e) {
      setTxStatus(`Error: ${e instanceof Error ? e.message : "desconocido"}`);
    } finally {
      setBusy(false);
      setTimeout(() => setTxStatus(""), 5000);
    }
  }

  async function handleTransfer(noteId: string, to: string, copAmount: string) {
    if (!address || !noteId || !to || !copAmount) return;
    setBusy(true);
    setTxStatus("Transfiriendo posición...");
    try {
      const hash = await writeContract({
        account: address,
        address: addresses.promissoryNote,
        abi: promissoryNoteAbi,
        functionName: "safeTransferFrom",
        args: [address, to as Address, BigInt(noteId), parseCopToUsdcRaw(copAmount), "0x"],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setTxStatus("Transferencia exitosa.");
      refreshNotes();
    } catch (e) {
      setTxStatus(`Error: ${e instanceof Error ? e.message : "desconocido"}`);
    } finally {
      setBusy(false);
      setTimeout(() => setTxStatus(""), 5000);
    }
  }

  return (
    <InvestorPortalContext.Provider
      value={{
        address,
        protocol,
        notes,
        usdcBalance,
        notesLoading,
        refreshNotes,
        busy,
        txStatus,
        handleInvest,
        handleClaim,
        handleRedeem,
        handleTransfer,
      }}
    >
      {children}
    </InvestorPortalContext.Provider>
  );
}
