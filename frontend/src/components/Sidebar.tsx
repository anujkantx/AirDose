"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wind,
  LayoutDashboard,
  MapPin,
  LogOut,
  ChevronRight,
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
    { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Saved Location Points", icon: MapPin, href: "/dashboard/locations" },
  ];


  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Wind className="w-4 h-4 text-slate-950 font-bold" />
            </div>
            <span className="font-bold text-base text-white tracking-tight">AirDose</span>
          </Link>
          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
            MVP
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href.startsWith("#")
                ? false
                : item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            if (item.href.startsWith("#")) {
              return (
                <button
                  key={item.label}
                  onClick={onClose}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
              </Link>
            );
          })}
        </nav>


        {/* Server Status Box */}
        <div className="p-3 mx-4 mb-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Server OK</span>
          </div>
        </div>


        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-emerald-400 shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name || "Demo User"}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email || "demo@example.com"}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
