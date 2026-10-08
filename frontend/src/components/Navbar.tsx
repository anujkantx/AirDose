"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStoredUser, clearSession, User } from "@/lib/api";
import { Wind, ArrowRight, LogOut, LayoutDashboard, User as UserIcon } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    router.push("/signin");
  };

  return (
    <header className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-all duration-300">
            <Wind className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              AirDose
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                MVP
              </span>
            </span>
          </div>
        </Link>

        {/* Right Navigation Actions */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                {currentUser.name}
              </span>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/signin"
                id="navbar-signin-btn"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                id="navbar-getstarted-btn"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 rounded-lg shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
