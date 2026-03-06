import { useState, useEffect, useCallback } from "react";
import { type Address } from "viem";
import { getAddress, publicClient } from "@/config/client";

interface WalletState {
  address: Address | null;
  isConnecting: boolean;
  error: string | null;
  balance: bigint;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnecting: false,
    error: null,
    balance: 0n,
  });

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setState((s) => ({ ...s, error: "Install MetaMask or a compatible wallet" }));
      return;
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      const address = await getAddress();
      const balance = await publicClient.getBalance({ address });
      setState({ address, isConnecting: false, error: null, balance });
    } catch (e) {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: e instanceof Error ? e.message : "Connection failed",
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: null, isConnecting: false, error: null, balance: 0n });
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else {
        setState((s) => ({ ...s, address: accounts[0] as Address }));
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
  }, [disconnect]);

  return { ...state, connect, disconnect };
}
