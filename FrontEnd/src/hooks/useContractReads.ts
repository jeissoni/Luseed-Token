import { useState, useEffect, useCallback } from "react";
import { type Address, formatUnits } from "viem";
import { publicClient } from "@/config/client";
import { addresses, promissoryNoteAbi, erc20Abi } from "@/config/contracts";

export interface ProtocolState {
  investmentOpen: boolean;
  currentRate: bigint;
  termDuration: bigint;
  totalInvested: bigint;
  nextNoteId: bigint;
  minInvestment: bigint;
  contractUsdcBalance: bigint;
}

export interface UserNoteInfo {
  noteId: bigint;
  balance: bigint;
  pendingYield: bigint;
  startTimestamp: bigint;
  termEnd: bigint;
  capitalRedeemed: boolean;
}

const DEFAULT_PROTOCOL: ProtocolState = {
  investmentOpen: false,
  currentRate: 0n,
  termDuration: 0n,
  totalInvested: 0n,
  nextNoteId: 1n,
  minInvestment: 0n,
  contractUsdcBalance: 0n,
};

export function useProtocolState() {
  const [state, setState] = useState<ProtocolState>(DEFAULT_PROTOCOL);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [investmentOpen, currentRate, termDuration, totalInvested, nextNoteId, minInvestment, contractBalance] =
        await Promise.all([
          publicClient.readContract({ address: addresses.promissoryNote, abi: promissoryNoteAbi, functionName: "investmentOpen" }),
          publicClient.readContract({ address: addresses.promissoryNote, abi: promissoryNoteAbi, functionName: "currentRate" }),
          publicClient.readContract({ address: addresses.promissoryNote, abi: promissoryNoteAbi, functionName: "termDuration" }),
          publicClient.readContract({ address: addresses.promissoryNote, abi: promissoryNoteAbi, functionName: "totalInvested" }),
          publicClient.readContract({ address: addresses.promissoryNote, abi: promissoryNoteAbi, functionName: "nextNoteId" }),
          publicClient.readContract({ address: addresses.promissoryNote, abi: promissoryNoteAbi, functionName: "MIN_INVESTMENT" }),
          publicClient.readContract({ address: addresses.usdc, abi: erc20Abi, functionName: "balanceOf", args: [addresses.promissoryNote] }),
        ]);

      setState({
        investmentOpen: investmentOpen as boolean,
        currentRate: currentRate as bigint,
        termDuration: termDuration as bigint,
        totalInvested: totalInvested as bigint,
        nextNoteId: nextNoteId as bigint,
        minInvestment: minInvestment as bigint,
        contractUsdcBalance: contractBalance as bigint,
      });
    } catch (e) {
      console.error("Failed to read protocol state:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { ...state, loading, refresh };
}

export function useUserNotes(userAddress: Address | null) {
  const [notes, setNotes] = useState<UserNoteInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState(0n);

  const refresh = useCallback(async () => {
    if (!userAddress) {
      setNotes([]);
      return;
    }

    setLoading(true);
    try {
      const [nextNoteId, balance] = await Promise.all([
        publicClient.readContract({ address: addresses.promissoryNote, abi: promissoryNoteAbi, functionName: "nextNoteId" }),
        publicClient.readContract({ address: addresses.usdc, abi: erc20Abi, functionName: "balanceOf", args: [userAddress] }),
      ]);

      setUsdcBalance(balance as bigint);
      const totalNotes = Number(nextNoteId as bigint);
      const found: UserNoteInfo[] = [];

      for (let i = 1; i < totalNotes; i++) {
        const noteId = BigInt(i);
        const bal = (await publicClient.readContract({
          address: addresses.promissoryNote,
          abi: promissoryNoteAbi,
          functionName: "balanceOf",
          args: [userAddress, noteId],
        })) as bigint;

        if (bal > 0n) {
          const [noteInfo, pending] = await Promise.all([
            publicClient.readContract({ address: addresses.promissoryNote, abi: promissoryNoteAbi, functionName: "notes", args: [noteId] }),
            publicClient.readContract({ address: addresses.promissoryNote, abi: promissoryNoteAbi, functionName: "pendingYield", args: [noteId, userAddress] }),
          ]);
          const [startTimestamp, termEnd, capitalRedeemed] = noteInfo as [bigint, bigint, boolean];
          found.push({ noteId, balance: bal, pendingYield: pending as bigint, startTimestamp, termEnd, capitalRedeemed });
        }
      }

      setNotes(found);
    } catch (e) {
      console.error("Failed to read user notes:", e);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { notes, usdcBalance, loading, refresh };
}

export function formatUsdc(amount: bigint): string {
  return Number(formatUnits(amount, 6)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatRate(bps: bigint): string {
  return `${(Number(bps) / 100).toFixed(2)}%`;
}

export function formatDuration(seconds: bigint): string {
  const days = Number(seconds) / 86400;
  if (days >= 365) return `${(days / 365).toFixed(1)} años`;
  if (days >= 30) return `${(days / 30).toFixed(0)} meses`;
  return `${days.toFixed(0)} días`;
}
