"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const navigationItems = [
  { name: "Profile", href: "/dashboard/profile", icon: "👤" },
  { name: "Resume", href: "/dashboard/resume", icon: "📄" },
  { name: "Jobs", href: "/dashboard/jobs", icon: "💼" },
  { name: "Application Status", href: "/dashboard/applications", icon: "📋" },
];

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-zinc-700 bg-zinc-900 transition-all duration-300 ease-out",
        isExpanded ? "w-64" : "w-20"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-zinc-700 px-4">
        {isExpanded && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
              JS
            </div>
            <span className="text-sm font-semibold text-zinc-100">JobStriker</span>
          </div>
        )}
        {!isExpanded && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold mx-auto">
            JS
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              )}
              title={!isExpanded ? item.name : undefined}
            >
              <span className="text-base">{item.icon}</span>
              {isExpanded && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-700 p-2">
        <button
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          )}
          title={!isExpanded ? "Settings" : undefined}
        >
          <span className="text-base">⚙️</span>
          {isExpanded && <span>Settings</span>}
        </button>
      </div>

      {/* Toggle Button */}
      <div className="border-t border-zinc-700 p-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
}
