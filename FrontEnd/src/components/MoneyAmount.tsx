import { formatCop, formatUsdc } from "@/hooks/useContractReads";

interface MoneyAmountProps {
  amount: bigint;
  className?: string;
  showUsd?: boolean;
}

/** Muestra un monto on-chain (USDC raw) como COP, con referencia opcional en USD. */
export default function MoneyAmount({ amount, className = "", showUsd = true }: MoneyAmountProps) {
  return (
    <span className={className}>
      <span>{formatCop(amount)}</span>
      {showUsd && (
        <span className="block text-xs text-gray-500 font-normal mt-0.5">
          ≈ US$ {formatUsdc(amount)}
        </span>
      )}
    </span>
  );
}
