import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Abi,
  type Address,
  type Chain,
} from "viem";
import { sepolia } from "viem/chains";

const RPC_URL = import.meta.env.VITE_RPC_URL ?? sepolia.rpcUrls.default.http[0];

export const chain: Chain = sepolia;

export const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

function walletClient() {
  if (!window.ethereum) throw new Error("No wallet provider found");
  return createWalletClient({ chain, transport: custom(window.ethereum) });
}

export async function getAddress(): Promise<Address> {
  const [addr] = await walletClient().requestAddresses();
  return addr;
}

export async function writeContract<T extends Abi>(params: {
  account: Address;
  address: Address;
  abi: T;
  functionName: string;
  args?: readonly unknown[];
}): Promise<`0x${string}`> {
  return walletClient().writeContract({
    ...params,
    chain,
  } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}
