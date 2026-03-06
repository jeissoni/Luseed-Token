import { type ReactNode } from "react";

interface CardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, children, className = "" }: CardProps) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-100 mb-4">{title}</h3>
      {children}
    </div>
  );
}
