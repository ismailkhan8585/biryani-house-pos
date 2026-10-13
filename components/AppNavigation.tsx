"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function AppNavigation({
  role,
  staffName,
  branchName,
}: {
  role: "branch" | "admin";
  staffName: string;
  branchName: string;
}) {
  const path = usePathname();
  const links = [
    ["/pos", "POS"],
    ["/tables", "Tables"],
    ["/orders", "Orders"],
    ["/reports", "Reports"],
    ...(role === "admin"
      ? [
          ["/menu", "Menu"],
          ["/settings", "Settings"],
          ["/admin", "Admin"],
        ]
      : []),
  ];
  return (
    <nav aria-label="Main navigation" className="app-navigation no-print">
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={path === href ? "page" : undefined}
          className={path === href ? "nav-current" : ""}
        >
          {label}
        </Link>
      ))}
      <span
        className="ml-auto shrink-0 pl-4 text-xs text-stone-500"
        aria-label="Signed-in staff and branch"
      >
        <strong className="text-stone-700">{staffName}</strong> | {branchName}
      </span>
    </nav>
  );
}
