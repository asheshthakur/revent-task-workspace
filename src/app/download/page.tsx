import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { 
  ArrowLeft, 
  Download, 
  Apple, 
  Monitor, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Bell, 
  ArrowRight
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Download VEYA for Mac & Windows | Desktop Work Client',
  description: 'Download the official VEYA native desktop client for macOS and Windows 11. Enjoy fast edge synchronization, native OS notifications, and dock badges.',
  alternates: {
    canonical: 'https://app.lucidmediax.in/download',
  },
  openGraph: {
    title: 'Download VEYA Desktop Client',
    description: 'Native desktop application for macOS and Windows 11 x64 with real-time push alerts and unread badges.',
    url: 'https://app.lucidmediax.in/download',
    type: 'website',
  },
};

export default function DownloadPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'VEYA Desktop',
    operatingSystem: 'macOS, Windows 11',
    applicationCategory: 'BusinessApplication',
    description: 'Native desktop client for VEYA enterprise work and task management.',
    offers: {
      '@type': 'Offer',
      price: '0.00',
      priceCurrency: 'USD',
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Overview</span>
            </Link>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-extrabold tracking-wider text-white">VEYA</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                Desktop
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg shadow-xs transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Title & Value Statement */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-800/50 text-indigo-300 text-xs font-medium">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dedicated Native Experience</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Download VEYA
          </h1>
          <p className="text-base sm:text-lg text-slate-400">
            Get the VEYA desktop experience on your computer and keep your team’s work, assignments, and discussions within immediate reach.
          </p>
        </div>

        {/* Download Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* macOS Card */}
          <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 p-8 sm:p-10 flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl group">
            <div className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-white shadow-inner group-hover:scale-105 transition-transform">
                {/* Authentic Apple Platform Icon */}
                <svg
                  className="w-7 h-7 fill-current"
                  viewBox="0 0 170 170"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="Apple macOS"
                >
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.94-14.3-5.74-8.7-10.33-18.77-13.77-30.2-3.44-11.44-5.16-22.37-5.16-32.8 0-14.12 3.4-26.04 10.2-35.75 6.8-9.71 15.43-14.65 25.88-14.82 4.9 0 10.42 1.34 16.55 4.02 6.13 2.68 10.02 4.07 11.66 4.17 1.83 0 5.86-1.47 12.09-4.4 6.23-2.93 11.73-4.27 16.5-4.02 12.02.63 21.64 5.34 28.86 14.13-10.49 6.35-15.62 15.11-15.39 26.27.24 8.79 3.61 16.14 10.12 22.04 6.51 5.9 14.28 9.32 23.3 10.27-2.24 6.84-4.85 13.88-7.84 21.12zM119.22 31.84c0-7.39 2.69-14.29 8.07-20.7 5.38-6.41 12-10.46 19.86-12.14.23 1.25.35 2.45.35 3.6 0 7.39-2.73 14.37-8.19 20.93-5.46 6.56-12.14 10.51-20.04 11.85-.05-1.19-.05-2.37-.05-3.54z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">VEYA for Mac</h2>
                <p className="text-sm text-slate-400 mt-2">
                  Optimized for macOS with native Notification Center alerts, Dock badges, and multi-workspace support.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Compatible with macOS Monterey 12.0 or newer</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Native Notification Center & Dock badging</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Zero cold-start edge synchronization</span>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 border-t border-slate-800/80 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="/api/download/mac-arm64"
                  className="flex-1 inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-200 transition-colors shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Apple Silicon (M1/M2/M3/M4)</span>
                </a>
                <a
                  href="/api/download/mac-intel"
                  className="inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Intel Mac</span>
                </a>
              </div>
              <p className="text-center text-[11px] text-slate-500">
                Direct DMG download • 64-bit architecture
              </p>
            </div>
          </div>

          {/* Windows Card */}
          <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 p-8 sm:p-10 flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl group">
            <div className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-950/80 border border-indigo-800/80 flex items-center justify-center text-indigo-400 shadow-inner group-hover:scale-105 transition-transform">
                {/* Crisp Windows 11 Platform Icon */}
                <svg
                  className="w-7 h-7 fill-current text-indigo-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="Microsoft Windows"
                >
                  <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.551H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.802" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">VEYA for Windows</h2>
                <p className="text-sm text-slate-400 mt-2">
                  Built specifically for Windows 11 x64 systems with Action Center notifications, taskbar flashing, and system tray integration.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Targeted for Windows 11 (64-bit architecture)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Windows Action Center notification toasts</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>System tray resident & taskbar badges</span>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 border-t border-slate-800/80 space-y-3">
              <a
                href="/api/download/windows-x64"
                className="w-full inline-flex items-center justify-center space-x-2 py-3 px-5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/20"
              >
                <Download className="w-4 h-4" />
                <span>Download for Windows (.exe)</span>
              </a>
              <p className="text-center text-[11px] text-slate-500">
                Supports Windows 11 • x64 NSIS Installer
              </p>
            </div>
          </div>
        </div>

        {/* Feature Highlights Banner */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-8 sm:p-10 mb-16">
          <h3 className="text-lg font-bold text-white mb-6">Why use the VEYA desktop client?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-950/70 border border-indigo-800/50 flex items-center justify-center text-indigo-400 mb-3">
                <Bell className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white">Never Miss an Assignment</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Native OS alerts pop up whenever a teammate assigns you a task, updates priority, or pings you in chat.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-950/70 border border-indigo-800/50 flex items-center justify-center text-indigo-400 mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white">Instant Edge Sync</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connects straight to your workspace with ultra-low latency, running smoothly without tab clutter.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-950/70 border border-indigo-800/50 flex items-center justify-center text-indigo-400 mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-white">External Link Isolation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Work links (Google Drive, Docs, Figma) open directly in your preferred default web browser cleanly.
              </p>
            </div>
          </div>
        </div>

        {/* Fallback to Browser Option */}
        <div className="text-center pt-8 border-t border-slate-900">
          <p className="text-sm text-slate-400">
            Prefer working directly in your browser?{' '}
            <Link href="/" className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center space-x-1">
              <span>Prefer the browser? Open VEYA</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 bg-slate-950 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} VEYA. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <Link href="/" className="hover:text-slate-300 transition-colors">Product</Link>
            <Link href="/download" className="text-slate-300 font-medium">Download</Link>
            <Link href="/login" className="hover:text-slate-300 transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-slate-300 transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
