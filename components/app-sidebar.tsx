"use client";

import { useWorkspaceUser } from "@/hooks/use-workspace-user";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Upload, FileStack, Shield, Sun, ChevronRight, Link2,
  Image as ImageIcon, BarChart3, Settings, Search, FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Project Search", icon: Search },
  { href: "/review", label: "Review by URL", icon: Link2 },
  { href: "/review-gdrive", label: "Google Drive Import", icon: FolderOpen },
  { href: "/upload", label: "Manual Upload", icon: Upload },
  { href: "/submissions", label: "Submissions", icon: FileStack },
];

const adminItems = [
  { href: "/admin", label: "Admin Panel", icon: Shield },
  { href: "/admin/reference-photos", label: "Reference Library", icon: ImageIcon },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AppSidebar() {
  const { user } = useWorkspaceUser();
  const pathname = usePathname();
  const isAdmin = user?.role === "admin";

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-[#0f2439] to-[#162d47] border-r border-white/5 flex flex-col">
      <div className="p-5 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
            <Sun className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-white tracking-tight">LightReach</h1>
            <p className="text-[10px] text-amber-400 font-mono tracking-wider">M1 SUBMISSION TOOL</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <p className="px-3 py-2 text-[10px] font-mono text-blue-300/40 uppercase tracking-wider">Navigation</p>
        {navItems.map((item: any) => {
          const Icon = item?.icon;
          const isActive = pathname === item?.href || pathname?.startsWith?.(item?.href + "/");
          return (
            <Link
              key={item?.href}
              href={item?.href ?? "/"}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                isActive
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-blue-200/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{item?.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-3">
              <p className="px-3 py-2 text-[10px] font-mono text-blue-300/40 uppercase tracking-wider">Admin</p>
            </div>
            {adminItems.map((item: any) => {
              const Icon = item?.icon;
              const isActive = pathname === item?.href;
              return (
                <Link
                  key={item?.href}
                  href={item?.href ?? "/"}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    isActive
                      ? "bg-amber-500/15 text-amber-400"
                      : "text-blue-200/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item?.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-white/5">
        <div className="px-3 py-2">
          <p className="text-sm text-white truncate">{user?.name ?? user?.email ?? "User"}</p>
          <p className="text-xs text-blue-200/40 truncate">{user?.email ?? ""}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-200/60 hover:text-white hover:bg-white/5 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
