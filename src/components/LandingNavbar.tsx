'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, Monitor } from 'lucide-react';

export const LandingNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2.5">
            <span className="text-2xl font-black tracking-wider text-white">VEYA</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
              Workspace
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-300">
            <Link href="#product" className="hover:text-white transition-colors">Product</Link>
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How it Works</Link>
            <Link href="#faq" className="hover:text-white transition-colors">FAQ</Link>
            <Link href="/download" className="hover:text-indigo-400 transition-colors flex items-center space-x-1">
              <Monitor className="w-3.5 h-3.5" />
              <span>Download</span>
            </Link>
          </nav>
        </div>

        {/* Desktop CTA actions */}
        <div className="hidden md:flex items-center space-x-3">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-2 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl shadow-xs transition-colors"
          >
            <span>Sign up</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 py-5 space-y-4">
          <nav className="flex flex-col space-y-3 text-sm font-semibold text-slate-300">
            <Link
              href="#product"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-white transition-colors"
            >
              Product
            </Link>
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-white transition-colors"
            >
              How it Works
            </Link>
            <Link
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 hover:text-white transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/download"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 text-indigo-400 hover:text-indigo-300 transition-colors flex items-center space-x-2"
            >
              <Monitor className="w-4 h-4" />
              <span>Download Desktop App</span>
            </Link>
          </nav>

          <div className="pt-4 border-t border-slate-800/80 flex flex-col space-y-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center text-xs font-semibold text-slate-200 py-2.5 rounded-xl bg-slate-900 border border-slate-800"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center text-xs font-bold text-white py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-sm"
            >
              Create free account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
