"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MapPin,
  LogOut,
  ChevronRight,
  Wind,
  ShieldCheck,
  Radio,
  BookOpen,
} from "lucide-react";
import { User } from "@/lib/api";

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ user, onLogout, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Saved Places", icon: MapPin, href: "/dashboard/locations" },
    { label: "Formula & Details", icon: BookOpen, href: "/dashboard/details" },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-6 border-b border-slate-100 flex items-center">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0062ff] flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <Wind className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base text-slate-900 tracking-tight">
              AirDose
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#0062ff] text-white shadow-md shadow-blue-500/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 opacity-80" />}
              </Link>
            );
          })}
        </nav>

        {/* Telemetry Status Box */}
        <div className="p-3.5 mx-4 mb-4 rounded-2xl bg-[#f0f3f8] border border-slate-200/80 text-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Engine Status</span>
            <span className="text-emerald-600 text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-800">
            Mathematical Inhalation Sync
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "Demo User"}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email || "demo@example.com"}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
