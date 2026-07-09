import { createContext, useContext, type ReactNode } from "react";
import { type Address } from "viem";
import { useUserRoles, type UserRolesState } from "@/hooks/useUserRoles";
import { type UserRole } from "@/config/roles";

interface UserRolesContextValue extends UserRolesState {
  address: Address | null;
  hasRole: (role: UserRole) => boolean;
}

const UserRolesContext = createContext<UserRolesContextValue | null>(null);

export function useUserRolesContext() {
  const ctx = useContext(UserRolesContext);
  if (!ctx) throw new Error("useUserRolesContext debe usarse dentro de UserRolesProvider");
  return ctx;
}

interface ProviderProps {
  address: Address | null;
  children: ReactNode;
}

export function UserRolesProvider({ address, children }: ProviderProps) {
  const rolesState = useUserRoles(address);

  const hasRole = (role: UserRole): boolean => {
    if (role === "investor") return rolesState.investor;
    if (role === "manager") return rolesState.manager;
    if (role === "operator") return rolesState.operator;
    return false;
  };

  return (
    <UserRolesContext.Provider value={{ address, ...rolesState, hasRole }}>
      {children}
    </UserRolesContext.Provider>
  );
}
