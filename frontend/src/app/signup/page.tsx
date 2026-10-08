"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpApi, saveSession } from "@/lib/api";
import { Wind, ArrowRight, Lock, Mail, User, AlertCircle } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signUpApi(name, email, password);
      saveSession(res.user, res.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f3f8] text-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Brand Header */}
      <div className="mb-8 flex flex-col items-center">
        <Link href="/" className="flex items-center gap-3 group mb-2">
          <div className="w-12 h-12 rounded-2xl bg-[#0062ff] flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Wind className="w-6 h-6 text-white font-bold" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">AirDose</span>
        </Link>
        <p className="text-sm text-slate-500 font-medium">Create your account to start tracking inhalation dosage</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 sm:p-9 shadow-soft relative z-10">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Create Account</h2>
        <p className="text-xs text-slate-400 mb-6">User profile will be securely saved into your database.</p>

        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="name-input">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0062ff] transition-colors font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="signup-email-input">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="signup-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0062ff] transition-colors font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="signup-password-input">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="signup-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0062ff] transition-colors font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            id="signup-submit-btn"
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-semibold text-white bg-[#0062ff] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : "Sign Up & Access Dashboard"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Link to sign in */}
        <div className="mt-6 text-center text-xs text-slate-500 font-medium">
          Already have an account?{" "}
          <Link href="/signin" className="text-[#0062ff] hover:underline font-semibold">
            Sign in
          </Link>
        </div>
      </div>

      <div className="mt-6 text-xs text-slate-500 font-medium">
        <Link href="/" className="hover:text-slate-800">
          &larr; Back to Home
        </Link>
      </div>
    </div>
  );
}
