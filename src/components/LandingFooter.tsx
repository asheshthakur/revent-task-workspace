import React from 'react';
import Link from 'next/link';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 py-10 sm:py-12 text-slate-500 text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-900">
          <div className="flex items-center space-x-3">
            <span className="text-base font-extrabold text-white tracking-wider">VEYA</span>
            <span className="text-slate-600">|</span>
            <p className="text-slate-400">Your team's workspace for getting work done.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/#product" className="hover:text-slate-300 transition-colors">Product</Link>
            <Link href="/#features" className="hover:text-slate-300 transition-colors">Features</Link>
            <Link href="/#how-it-works" className="hover:text-slate-300 transition-colors">How it Works</Link>
            <Link href="/pricing" className="text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">Pricing</Link>
            <Link href="/#faq" className="hover:text-slate-300 transition-colors">FAQ</Link>
            <Link href="/download" className="hover:text-slate-300 transition-colors">Download</Link>
            <Link href="/login" className="hover:text-slate-300 transition-colors">Log In</Link>
            <Link href="/signup" className="hover:text-slate-300 transition-colors">Sign Up</Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-600">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/legal/terms" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
            <Link href="/legal/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
            <Link href="/legal/dpa" className="hover:text-slate-400 transition-colors">Data Processing Agreement (DPA)</Link>
            <Link href="/legal/sla" className="hover:text-slate-400 transition-colors">SLA</Link>
            <Link href="/legal/acceptable-use" className="hover:text-slate-400 transition-colors">Acceptable Use</Link>
            <Link href="/legal/data-retention" className="hover:text-slate-400 transition-colors">Data Retention</Link>
            <Link href="/legal/security" className="hover:text-slate-400 transition-colors">Security Architecture</Link>
          </div>

          <div className="shrink-0">
            © {new Date().getFullYear()} {VEYA_LEGAL_CONFIG.PRODUCT_NAME} ({VEYA_LEGAL_CONFIG.TRADE_NAME}). All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
