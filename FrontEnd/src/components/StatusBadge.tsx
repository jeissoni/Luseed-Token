interface StatusBadgeProps {
  active: boolean;
  labelOn?: string;
  labelOff?: string;
}

export default function StatusBadge({ active, labelOn = "Activo", labelOff = "Inactivo" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
        active ? "bg-luseed-900/50 text-luseed-400" : "bg-red-900/30 text-red-400"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-luseed-400" : "bg-red-400"}`} />
      {active ? labelOn : labelOff}
    </span>
  );
}
