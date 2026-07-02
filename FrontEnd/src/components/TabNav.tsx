import { NavLink } from "react-router-dom";

export interface TabItem {
  to: string;
  label: string;
  end?: boolean;
}

interface TabNavProps {
  tabs: TabItem[];
}

export default function TabNav({ tabs }: TabNavProps) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-luseed-600 text-white"
        : "text-gray-400 hover:text-white hover:bg-gray-800"
    }`;

  return (
    <nav className="flex flex-wrap gap-1 border-b border-gray-800 pb-4">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className={linkClass}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
