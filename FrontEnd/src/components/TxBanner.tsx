interface TxBannerProps {
  message: string;
}

export default function TxBanner({ message }: TxBannerProps) {
  if (!message) return null;
  const isError = message.startsWith("Error");
  return (
    <div
      className={`p-3 rounded-lg text-sm ${
        isError ? "bg-red-900/30 text-red-400" : "bg-luseed-900/30 text-luseed-400"
      }`}
    >
      {message}
    </div>
  );
}
