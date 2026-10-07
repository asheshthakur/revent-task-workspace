'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FileText, 
  Shield, 
  Lock, 
  Clock, 
  Scale, 
  Server, 
  HardDriveDownload, 
  FileCheck, 
  ArrowLeft, 
  Printer,
  ChevronRight
} from 'lucide-react';
import { VEYA_LEGAL_CONFIG } from '@/lib/legalConfig';

const NAV_ITEMS = [
  { href: '/legal/terms', label: 'Terms of Service', icon: FileText },
  { href: '/legal/privacy', label: 'Privacy Policy', icon: Lock },
  { href: '/legal/dpa', label: 'Data Processing Agreement (DPA)', icon: Shield },
  { href: '/legal/sla', label: 'Service Level Agreement (SLA)', icon: Clock },
  { href: '/legal/acceptable-use', label: 'Acceptable Use Policy', icon: Scale },
  { href: '/legal/data-retention', label: 'Data Retention & Deletion', icon: HardDriveDownload },
  { href: '/legal/security', label: 'Security & Privacy Architecture', icon: Server },
  { href: '/legal/order-form', label: 'Subscription Order Form (Template)', icon: FileCheck },
];

interface LegalLayoutProps {
  title: string;
  version: string;
  effectiveDate: string;
  summary: string;
  children: React.ReactNode;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  version,
  effectiveDate,
  summary,
  children,
}) => {
  const pathname = usePathname();

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2 text-white hover:text-indigo-400 transition-colors">
              <span className="text-xl font-black tracking-wider">VEYA</span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/60 font-semibold uppercase tracking-wider">
                Legal & Commercial
              </span>
            </Link>
            <span className="hidden sm:inline text-slate-700">/</span>
            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400">
              <span>{title}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-mono">v{version}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Print document or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to VEYA</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="border-b border-slate-800/60 bg-gradient-to-b from-indigo-950/20 to-transparent py-10 sm:py-14 print:py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                Official Document
              </span>
              <span className="text-xs text-slate-400 font-mono">Version {version}</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">Effective Date: {effectiveDate}</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">Jurisdiction: {VEYA_LEGAL_CONFIG.JURISDICTION_COUNTRY}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{title}</h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
              {summary}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content & Sidebar Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3 print:hidden">
          <div className="sticky top-24 space-y-6">
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">
                Legal Repository
              </h2>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-white" />}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Quick Contact & Company Box */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-3">
              <h3 className="font-bold text-white text-[11px] uppercase tracking-wider">Legal Inquiries</h3>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                For commercial contracting, enterprise custom terms, or data subject inquiries:
              </p>
              <div className="space-y-1 text-slate-300 font-mono text-[11px]">
                <div>Legal: <a href={`mailto:${VEYA_LEGAL_CONFIG.LEGAL_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.LEGAL_EMAIL}</a></div>
                <div>Privacy: <a href={`mailto:${VEYA_LEGAL_CONFIG.PRIVACY_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.PRIVACY_EMAIL}</a></div>
                <div>Billing: <a href={`mailto:${VEYA_LEGAL_CONFIG.BILLING_EMAIL}`} className="text-indigo-400 hover:underline">{VEYA_LEGAL_CONFIG.BILLING_EMAIL}</a></div>
              </div>
            </div>
          </div>
        </aside>

        {/* Document Body */}
        <main className="lg:col-span-9 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-xl print:p-0 print:border-none print:bg-transparent print:shadow-none">
          <div className="prose prose-invert prose-indigo max-w-none text-slate-300 text-sm sm:text-base leading-relaxed space-y-8">
            {children}
          </div>

          {/* Document Footer Verification */}
          <div className="mt-16 pt-8 border-t border-slate-800/80 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p>Document identifier: <span className="font-mono text-slate-400">{title} — Version {version}</span></p>
              <p className="mt-0.5">Authoritative language: English. Published for {VEYA_LEGAL_CONFIG.PRODUCT_NAME}.</p>
            </div>
            <div className="text-right">
              <p>© {new Date().getFullYear()} {VEYA_LEGAL_CONFIG.TRADE_NAME}. All rights reserved.</p>
              <p className="mt-0.5">Governed by the {VEYA_LEGAL_CONFIG.GOVERNING_LAW}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
