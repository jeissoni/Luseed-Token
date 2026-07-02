import { type Address, getAddress, isAddress } from "viem";

/** Wallets autorizadas para el portal de operaciones (separadas por coma en .env). */
const OPERATOR_ADDRESSES: Address[] = (import.meta.env.VITE_OPERATOR_ADDRESSES ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && isAddress(s))
  .map((s) => getAddress(s));

export function isOperator(address: Address | null | undefined): boolean {
  if (!address || OPERATOR_ADDRESSES.length === 0) return false;
  try {
    return OPERATOR_ADDRESSES.includes(getAddress(address));
  } catch {
    return false;
  }
}
