import { useCallback, useEffect, useState } from "react";
import { type Address } from "viem";
import { publicClient } from "@/config/client";
import { addresses, promissoryNoteAbi, luseedTokenAbi } from "@/config/contracts";
import { isOperator } from "@/config/access";
import { pickDefaultRoute, type UserRole } from "@/config/roles";

export interface UserRolesState {
  investor: boolean;
  manager: boolean;
  operator: boolean;
  loading: boolean;
  roles: UserRole[];
  defaultRoute: string;
  refresh: () => Promise<void>;
}

async function hasActiveNotes(userAddress: Address): Promise<boolean> {
  const nextNoteId = (await publicClient.readContract({
    address: addresses.promissoryNote,
    abi: promissoryNoteAbi,
    functionName: "nextNoteId",
  })) as bigint;

  const totalNotes = Number(nextNoteId);
  for (let i = 1; i < totalNotes; i++) {
    const balance = (await publicClient.readContract({
      address: addresses.promissoryNote,
      abi: promissoryNoteAbi,
      functionName: "balanceOf",
      args: [userAddress, BigInt(i)],
    })) as bigint;
    if (balance > 0n) return true;
  }
  return false;
}

export function useUserRoles(address: Address | null): UserRolesState {
  const [state, setState] = useState<Omit<UserRolesState, "refresh">>({
    investor: false,
    manager: false,
    operator: false,
    loading: false,
    roles: [],
    defaultRoute: "/sin-acceso",
  });

  const refresh = useCallback(async () => {
    if (!address) {
      setState({
        investor: false,
        manager: false,
        operator: false,
        loading: false,
        roles: [],
        defaultRoute: "/sin-acceso",
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const operator = isOperator(address);

      const [whitelisted, authorized] = await Promise.all([
        publicClient.readContract({
          address: addresses.promissoryNote,
          abi: promissoryNoteAbi,
          functionName: "isWhitelisted",
          args: [address],
        }) as Promise<boolean>,
        publicClient.readContract({
          address: addresses.luseedToken,
          abi: luseedTokenAbi,
          functionName: "isAuthorized",
          args: [address],
        }) as Promise<boolean>,
      ]);

      const activeNotes = whitelisted ? false : await hasActiveNotes(address);
      const investor = whitelisted || activeNotes;
      const manager = authorized;

      const roles: UserRole[] = [];
      if (investor) roles.push("investor");
      if (manager) roles.push("manager");
      if (operator) roles.push("operator");

      setState({
        investor,
        manager,
        operator,
        loading: false,
        roles,
        defaultRoute: pickDefaultRoute(roles),
      });
    } catch (e) {
      console.error("Failed to resolve user roles:", e);
      setState({
        investor: false,
        manager: false,
        operator: isOperator(address),
        loading: false,
        roles: isOperator(address) ? ["operator"] : [],
        defaultRoute: isOperator(address) ? "/operaciones" : "/sin-acceso",
      });
    }
  }, [address]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { ...state, refresh };
}
