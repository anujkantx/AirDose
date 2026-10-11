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
    <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0062ff] via-blue-500 to-emerald-400 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 group-hover:shadow-blue-500/30 transition-all duration-300">
            <Wind className="w-5 h-5 text-white font-bold" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              AirDose
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-50 text-[#0062ff] border border-blue-200/80">
                Dosimeter
              </span>
            </span>
          </div>
        </Link>

        {/* Center Quick Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <a href="#how-it-works" className="hover:text-[#0062ff] transition-colors">
            How It Works
          </a>
          <a href="#simulator" className="hover:text-[#0062ff] transition-colors">
            Live Simulator
          </a>
          <a href="#comparison" className="hover:text-[#0062ff] transition-colors">
            AQI vs Dosimeter
          </a>
          <a href="#science" className="hover:text-[#0062ff] transition-colors">
            The Science
          </a>
          <a href="#faq" className="hover:text-[#0062ff] transition-colors">
            FAQ
          </a>
        </nav>

        {/* Right Navigation Actions */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600 hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                <UserIcon className="w-3.5 h-3.5 text-[#0062ff]" />
                {currentUser.name}
              </span>
              <Link
                href="/dashboard"
                id="navbar-dashboard-btn"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#0062ff] hover:bg-blue-600 rounded-xl shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
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
                className="px-4 py-2 text-sm font-bold text-slate-700 hover:text-[#0062ff] hover:bg-slate-100 rounded-xl transition-all duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                id="navbar-getstarted-btn"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#0062ff] hover:bg-blue-600 rounded-xl shadow-md shadow-blue-500/25 hover:shadow-blue-500/35 transition-all duration-200 hover:-translate-y-0.5"
              >
                Start Free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
